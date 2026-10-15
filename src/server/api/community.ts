import { z } from "zod";
import type {
  CommunityKind,
  CommunityPost,
  Prisma,
  PrismaClient,
  Reaction,
} from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import type { DbUserWithProfile } from "@/features/auth/sessionUser";
import { writeAuditLog } from "@/features/posts/audit";
import {
  communityPostInclude,
  communityVisibleWhere,
  toCommunityPostDTO,
  toPersonSummaryDTO,
  type CommunityPostDTO,
  type PersonSummaryDTO,
  type CommunityPostRow,
  type Viewer,
} from "@/server/api/communityDto";
import { IMAGE_MAX_BYTES, storeUploadedMedia } from "@/server/api/media";
import { notify } from "@/server/api/notifications";
import { visiblePersonWhere } from "@/server/api/people";
import {
  emptyReactionCounts,
  loadCommunityReactionCounts,
  parseReaction,
  reactionBodySchema,
  totalReactions,
  type ReactionCounts,
} from "@/server/api/reactions";
import { blockedIdsFor } from "@/server/api/safety";
import { screenText } from "@/server/api/textFilter";
import { graphemeLength, unitCeiling } from "@/shared/lib/graphemes";
import { absoluteUrl, siteOrigin } from "@/server/api/urls";
import {
  parsePageParams,
  zodFieldErrors,
  type Page,
  type PageParams,
} from "@/server/api/validation";

export const COMMUNITY_KINDS = [
  "SHOUTOUT",
  "COLLAB",
  "SHOWING",
  "ASK",
  "KINDNESS",
  "UPDATE",
] as const satisfies readonly CommunityKind[];

export const COMMUNITY_BODY_MAX = 500;
export const COMMUNITY_DEFAULT_TAKE = 20;
export const COMMUNITY_MAX_TAKE = 30;
export const COMMUNITY_REPLIES_MAX = 100;
export const MENTIONS_MAX = 5;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UPLOAD_PATH_RE = /^\/uploads\/[A-Za-z0-9._-]{1,120}$/;

type Failure = {
  ok: false;
  code:
    | "validation_failed"
    | "not_found"
    | "forbidden"
    | "unauthorized"
    | "rate_limited"
    | "upstream_unavailable";
  message: string;
  fields?: Record<string, string>;
  retryAfterSec?: number;
};

function viewerOf(dbUser: Pick<DbUserWithProfile, "id" | "role">): Viewer {
  return { id: dbUser.id, role: dbUser.role };
}

function retryAfter(limit: { retryAfterMs: number }): number {
  return Math.max(1, Math.ceil(limit.retryAfterMs / 1000));
}

/** `@handle` mentions in a body: lowercased, unique, at most five. */
export function extractMentions(body: string): string[] {
  const found = new Set<string>();
  const re = /(^|\s)@([a-z0-9_-]{2,40})/gi;
  for (const match of body.matchAll(re)) {
    found.add(match[2]!.toLowerCase());
    if (found.size >= MENTIONS_MAX) break;
  }
  return [...found];
}

/**
 * Accept only our own uploads: `/uploads/<file>` or the same path under the
 * site origin. Returns the stored (relative) path, or null when unacceptable.
 */
export function normalizeUploadUrl(raw: string): string | null {
  const origin = siteOrigin();
  const path = raw.startsWith(`${origin}/uploads/`)
    ? raw.slice(origin.length)
    : raw;
  return UPLOAD_PATH_RE.test(path) ? path : null;
}

const createSchema = z.object({
  kind: z.enum(COMMUNITY_KINDS),
  // Counted by what a person sees, so an emoji is one character.
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(
      unitCeiling(COMMUNITY_BODY_MAX),
      `Keep it under ${COMMUNITY_BODY_MAX} characters.`,
    )
    .refine(
      (value) => graphemeLength(value) <= COMMUNITY_BODY_MAX,
      `Keep it under ${COMMUNITY_BODY_MAX} characters.`,
    ),
  topicSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/, "Invalid topic.")
    .nullable()
    .optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  parentId: z
    .string()
    .trim()
    .regex(ID_RE, "Invalid parentId.")
    .nullable()
    .optional(),
});

export type CreateCommunityResult =
  | { ok: true; post: CommunityPostDTO }
  | Failure;

async function notifyForNewPost(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  post: { id: string; body: string },
  parent: { id: string; authorId: string } | null,
): Promise<void> {
  const threadId = parent?.id ?? post.id;
  if (parent) {
    await notify(prisma, {
      userId: parent.authorId,
      actorId: dbUser.id,
      type: "REPLY",
      targetKind: "community",
      targetRef: threadId,
      preview: post.body,
    });
  }

  const handles = extractMentions(post.body);
  if (handles.length === 0) return;
  const mentioned = await prisma.user.findMany({
    where: { ...visiblePersonWhere(), handle: { in: handles } },
    select: { id: true },
  });
  for (const user of mentioned) {
    if (user.id === dbUser.id || user.id === parent?.authorId) continue;
    await notify(prisma, {
      userId: user.id,
      actorId: dbUser.id,
      type: "MENTION",
      targetKind: "community",
      targetRef: threadId,
      preview: post.body,
    });
  }
}

/** Create a top-level post or a one-level-deep reply. */
export async function createCommunityPost(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  raw: unknown,
): Promise<CreateCommunityResult> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid post",
      fields: zodFieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  const screened = screenText(input.body);
  if (!screened.ok) {
    return {
      ok: false,
      code: "validation_failed",
      message: screened.message,
      fields: { body: screened.message },
    };
  }

  let imageUrl: string | null = null;
  if (input.imageUrl) {
    imageUrl = normalizeUploadUrl(input.imageUrl);
    if (!imageUrl) {
      return {
        ok: false,
        code: "validation_failed",
        message: "Use a photo uploaded through the app.",
        fields: { imageUrl: "Use a photo uploaded through the app." },
      };
    }
  }

  const isReply = Boolean(input.parentId);
  const limit = isReply
    ? checkRateLimit(`v1:community:reply:${dbUser.id}`, {
        windowMs: 10 * 60_000,
        max: 30,
      })
    : checkRateLimit(`v1:community:post:${dbUser.id}`, {
        windowMs: 10 * 60_000,
        max: 10,
      });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many posts just now.",
      retryAfterSec: retryAfter(limit),
    };
  }

  try {
    const blocked = await blockedIdsFor(prisma, dbUser.id);

    let topicId: string | null = null;
    if (input.topicSlug) {
      const topic = await prisma.topic.findFirst({
        where: { slug: input.topicSlug, active: true },
      });
      if (!topic) {
        return {
          ok: false,
          code: "validation_failed",
          message: "Pick a topic from the list.",
          fields: { topicSlug: "Pick a topic from the list." },
        };
      }
      topicId = topic.id;
    }

    let parent: { id: string; authorId: string } | null = null;
    if (input.parentId) {
      const found = await prisma.communityPost.findFirst({
        where: { id: input.parentId, ...communityVisibleWhere(blocked) },
      });
      if (!found) {
        return {
          ok: false,
          code: "not_found",
          message: "That post is gone.",
        };
      }
      if (found.parentId) {
        return {
          ok: false,
          code: "validation_failed",
          message: "Replies stay one level deep.",
          fields: { parentId: "Replies stay one level deep." },
        };
      }
      parent = { id: found.id, authorId: found.authorId };
    }

    const row = (await prisma.communityPost.create({
      data: {
        authorId: dbUser.id,
        kind: input.kind,
        body: input.body,
        imageUrl,
        topicId,
        parentId: parent?.id ?? null,
      },
      include: communityPostInclude(dbUser.id, blocked),
    })) as unknown as CommunityPostRow;

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "community.post_create",
      targetType: "CommunityPost",
      targetId: row.id,
      meta: {
        kind: input.kind,
        reply: isReply,
        parentId: parent?.id ?? null,
        hasImage: imageUrl !== null,
      },
    });

    try {
      await notifyForNewPost(prisma, dbUser, row, parent);
    } catch (error) {
      console.error("[createCommunityPost:notify]", error);
    }

    return { ok: true, post: toCommunityPostDTO(row, viewerOf(dbUser)) };
  } catch (error) {
    console.error("[createCommunityPost]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not post just now.",
    };
  }
}

export type CommunityListQuery = {
  scope: "all" | "following";
  topic?: string;
  kind?: CommunityKind;
  page: PageParams;
};

export function parseCommunityQuery(
  params: URLSearchParams,
):
  | { ok: true; query: CommunityListQuery }
  | { ok: false; message: string; fields: Record<string, string> } {
  const paged = parsePageParams(params, {
    defaultTake: COMMUNITY_DEFAULT_TAKE,
    maxTake: COMMUNITY_MAX_TAKE,
  });
  const fields: Record<string, string> = paged.ok ? {} : { ...paged.fields };

  const rawScope = params.get("scope") || "all";
  if (rawScope !== "all" && rawScope !== "following") {
    fields.scope = "scope must be all or following.";
  }

  const topic = params.get("topic") || undefined;
  if (topic !== undefined && !/^[a-z0-9-]{1,40}$/.test(topic)) {
    fields.topic = "topic must be a topic slug.";
  }

  const rawKind = params.get("kind") || undefined;
  let kind: CommunityKind | undefined;
  if (rawKind !== undefined) {
    if ((COMMUNITY_KINDS as readonly string[]).includes(rawKind)) {
      kind = rawKind as CommunityKind;
    } else {
      fields.kind = `kind must be one of ${COMMUNITY_KINDS.join(", ")}.`;
    }
  }

  if (Object.keys(fields).length > 0 || !paged.ok) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return {
    ok: true,
    query: {
      scope: rawScope as "all" | "following",
      topic,
      kind,
      page: paged.page,
    },
  };
}

/** Board feed: top-level posts, newest first, minus hidden and blocked. */
export async function listCommunity(
  prisma: PrismaClient,
  query: CommunityListQuery,
  viewer: Viewer,
): Promise<{ ok: true; page: Page<CommunityPostDTO> } | Failure> {
  if (query.scope === "following" && !viewer) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Sign in to see the people you follow.",
    };
  }

  const viewerId = viewer?.id ?? null;
  const blocked = viewerId
    ? await blockedIdsFor(prisma, viewerId)
    : new Set<string>();

  let authorFilter: Prisma.CommunityPostWhereInput = {};
  if (query.scope === "following" && viewerId) {
    const edges = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const ids = edges
      .map((edge) => edge.followingId)
      .filter((id) => !blocked.has(id));
    if (ids.length === 0) {
      return { ok: true, page: { items: [], nextCursor: null } };
    }
    authorFilter = { authorId: { in: ids } };
  }

  const rows = (await prisma.communityPost.findMany({
    where: {
      ...communityVisibleWhere(blocked),
      parentId: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.topic ? { topic: { slug: query.topic } } : {}),
      ...authorFilter,
    },
    include: communityPostInclude(viewerId, blocked),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.page.take + 1,
    ...(query.page.cursor
      ? { skip: 1, cursor: { id: query.page.cursor } }
      : {}),
  })) as unknown as CommunityPostRow[];

  const hasMore = rows.length > query.page.take;
  const slice = hasMore ? rows.slice(0, query.page.take) : rows;
  const counts = await loadCommunityReactionCounts(
    prisma,
    slice.map((row) => row.id),
  );
  return {
    ok: true,
    page: {
      items: slice.map((row) =>
        toCommunityPostDTO(row, viewer, counts.get(row.id)),
      ),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    },
  };
}

/**
 * Thread view: the post plus up to 100 replies, oldest first. Passing a
 * reply id resolves to its thread, so deep links to a reply still land.
 */
export async function getCommunityThread(
  prisma: PrismaClient,
  id: string,
  viewer: Viewer,
): Promise<
  | { ok: true; post: CommunityPostDTO; replies: CommunityPostDTO[] }
  | Failure
> {
  const viewerId = viewer?.id ?? null;
  const blocked = viewerId
    ? await blockedIdsFor(prisma, viewerId)
    : new Set<string>();
  const include = communityPostInclude(viewerId, blocked);
  const notFound: Failure = {
    ok: false,
    code: "not_found",
    message: "That post is gone.",
  };

  let post = (await prisma.communityPost.findFirst({
    where: { id, ...communityVisibleWhere(blocked) },
    include,
  })) as unknown as CommunityPostRow | null;
  if (!post) return notFound;

  if (post.parentId) {
    post = (await prisma.communityPost.findFirst({
      where: { id: post.parentId, ...communityVisibleWhere(blocked) },
      include,
    })) as unknown as CommunityPostRow | null;
    if (!post) return notFound;
  }

  const replies = (await prisma.communityPost.findMany({
    where: { parentId: post.id, ...communityVisibleWhere(blocked) },
    include,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: COMMUNITY_REPLIES_MAX,
  })) as unknown as CommunityPostRow[];

  const counts = await loadCommunityReactionCounts(prisma, [
    post.id,
    ...replies.map((row) => row.id),
  ]);
  return {
    ok: true,
    post: toCommunityPostDTO(post, viewer, counts.get(post.id)),
    replies: replies.map((row) =>
      toCommunityPostDTO(row, viewer, counts.get(row.id)),
    ),
  };
}

/** Author or ADMIN. Replies under the post go with it (cascade). */
export async function deleteCommunityPost(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  id: string,
): Promise<{ ok: true; deleted: true } | Failure> {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      return { ok: false, code: "not_found", message: "That post is gone." };
    }
    const isAuthor = post.authorId === dbUser.id;
    if (!isAuthor && dbUser.role !== "ADMIN") {
      return {
        ok: false,
        code: "forbidden",
        message: "You can only remove your own posts.",
      };
    }

    await prisma.communityPost.delete({ where: { id } });
    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "community.post_delete",
      targetType: "CommunityPost",
      targetId: id,
      meta: { byAdmin: !isAuthor, authorId: post.authorId },
    });
    return { ok: true, deleted: true };
  } catch (error) {
    console.error("[deleteCommunityPost]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not remove that post.",
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export type ReactionState = {
  viewerReaction: Reaction | null;
  reactionCounts: ReactionCounts;
  supportCount: number;
  /** True when the viewer has reacted with anything (older builds' flag). */
  supported: boolean;
};

async function reactionStateFor(
  prisma: PrismaClient,
  postId: string,
  viewerReaction: Reaction | null,
): Promise<ReactionState> {
  const counts =
    (await loadCommunityReactionCounts(prisma, [postId])).get(postId) ??
    emptyReactionCounts();
  return {
    viewerReaction,
    reactionCounts: counts,
    supportCount: totalReactions(counts),
    supported: viewerReaction !== null,
  };
}

type Existing = { reaction: Reaction } | null;

/**
 * Shared gate for every reaction write: rate limit (60 a minute per member,
 * one bucket for all of them), then the visible post and the viewer's current
 * reaction on it.
 */
async function loadReactable(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  id: string,
): Promise<
  { ok: true; post: CommunityPost; existing: Existing } | Failure
> {
  const limit = checkRateLimit(`v1:community:support:${dbUser.id}`, {
    windowMs: 60_000,
    max: 60,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too much support at once.",
      retryAfterSec: retryAfter(limit),
    };
  }
  const blocked = await blockedIdsFor(prisma, dbUser.id);
  const post = await prisma.communityPost.findFirst({
    where: { id, ...communityVisibleWhere(blocked) },
  });
  if (!post) {
    return { ok: false, code: "not_found", message: "That post is gone." };
  }
  const existing = await prisma.communityReaction.findUnique({
    where: { userId_postId: { userId: dbUser.id, postId: post.id } },
  });
  return { ok: true, post, existing };
}

/**
 * Tell the author, ONCE per person per post. Switching emoji, or removing and
 * reacting again, never re-notifies: the check looks at any earlier SUPPORT
 * notification from this actor on this thread, read or not.
 */
async function notifyFirstReaction(
  prisma: PrismaClient,
  actorId: string,
  post: CommunityPost,
): Promise<void> {
  const targetRef = post.parentId ?? post.id;
  try {
    const earlier = await prisma.notification.findFirst({
      where: {
        userId: post.authorId,
        actorId,
        type: "SUPPORT",
        targetKind: "community",
        targetRef,
      },
      select: { id: true },
    });
    if (earlier) return;
  } catch (error) {
    console.error("[notifyFirstReaction]", error);
    return;
  }
  await notify(prisma, {
    userId: post.authorId,
    actorId,
    type: "SUPPORT",
    targetKind: "community",
    targetRef,
    preview: post.body,
  });
}

/**
 * Make `reaction` the viewer's ONE reaction. A different emoji replaces the
 * old one (an update, never a second row); the same emoji again is a no-op.
 */
async function applyReaction(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  post: CommunityPost,
  existing: Existing,
  reaction: Reaction,
): Promise<ReactionState> {
  if (existing?.reaction === reaction) {
    return reactionStateFor(prisma, post.id, reaction);
  }

  const key = { userId_postId: { userId: dbUser.id, postId: post.id } };
  if (existing) {
    await prisma.communityReaction.update({ where: key, data: { reaction } });
  } else {
    try {
      await prisma.communityReaction.create({
        data: { userId: dbUser.id, postId: post.id, reaction },
      });
      await notifyFirstReaction(prisma, dbUser.id, post);
    } catch (error) {
      // Two quick taps raced: the other one created the row, so this one is
      // just a change of emoji.
      if (!isUniqueViolation(error)) throw error;
      await prisma.communityReaction.update({ where: key, data: { reaction } });
    }
  }

  await writeAuditLog(prisma, {
    actorId: dbUser.id,
    action: "community.reaction_set",
    targetType: "CommunityPost",
    targetId: post.id,
    meta: { reaction, replaced: existing?.reaction ?? null },
  });
  return reactionStateFor(prisma, post.id, reaction);
}

async function removeReaction(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  post: CommunityPost,
  existing: Existing,
): Promise<ReactionState> {
  if (existing) {
    await prisma.communityReaction.delete({
      where: { userId_postId: { userId: dbUser.id, postId: post.id } },
    });
    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "community.reaction_remove",
      targetType: "CommunityPost",
      targetId: post.id,
      meta: { reaction: existing.reaction },
    });
  }
  return reactionStateFor(prisma, post.id, null);
}

/** Set the viewer's reaction on a post (PUT). */
export async function setReaction(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  id: string,
  raw: unknown,
): Promise<{ ok: true; state: ReactionState } | Failure> {
  const parsed = reactionBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Pick one of the reactions.",
      fields: zodFieldErrors(parsed.error),
    };
  }
  try {
    const gate = await loadReactable(prisma, dbUser, id);
    if (!gate.ok) return gate;
    const state = await applyReaction(
      prisma,
      dbUser,
      gate.post,
      gate.existing,
      parsed.data.reaction,
    );
    return { ok: true, state };
  } catch (error) {
    console.error("[setReaction]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save that reaction.",
    };
  }
}

/** Remove the viewer's reaction (DELETE; a quiet no-op when there is none). */
export async function clearReaction(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  id: string,
): Promise<{ ok: true; state: ReactionState } | Failure> {
  try {
    const gate = await loadReactable(prisma, dbUser, id);
    if (!gate.ok) return gate;
    const state = await removeReaction(prisma, dbUser, gate.post, gate.existing);
    return { ok: true, state };
  } catch (error) {
    console.error("[clearReaction]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not remove that reaction.",
    };
  }
}

/**
 * Support (the original one-tap sparkle), kept for older app builds: toggles
 * between no reaction and SUPPORT; any other reaction counts as "supported"
 * and a tap removes it.
 */
export async function toggleSupport(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  id: string,
): Promise<{ ok: true; state: ReactionState } | Failure> {
  try {
    const gate = await loadReactable(prisma, dbUser, id);
    if (!gate.ok) return gate;
    const state = gate.existing
      ? await removeReaction(prisma, dbUser, gate.post, gate.existing)
      : await applyReaction(prisma, dbUser, gate.post, null, "SUPPORT");
    return { ok: true, state };
  } catch (error) {
    console.error("[toggleSupport]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not update support.",
    };
  }
}

export type ReactorDTO = {
  reaction: Reaction;
  person: PersonSummaryDTO;
  createdAt: string;
};

export const REACTORS_DEFAULT_TAKE = 30;
export const REACTORS_MAX_TAKE = 50;

export function parseReactorsQuery(
  params: URLSearchParams,
):
  | { ok: true; page: PageParams; reaction?: Reaction }
  | { ok: false; message: string; fields: Record<string, string> } {
  const paged = parsePageParams(params, {
    defaultTake: REACTORS_DEFAULT_TAKE,
    maxTake: REACTORS_MAX_TAKE,
  });
  const fields: Record<string, string> = paged.ok ? {} : { ...paged.fields };
  const rawReaction = params.get("reaction") || undefined;
  let reaction: Reaction | undefined;
  if (rawReaction !== undefined) {
    reaction = parseReaction(rawReaction) ?? undefined;
    if (!reaction) fields.reaction = "reaction must be one of the reaction names.";
  }
  if (Object.keys(fields).length > 0 || !paged.ok) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return { ok: true, page: paged.page, reaction };
}

/**
 * Who reacted, newest first, optionally one emoji. Blocked people (either
 * direction), suspended accounts and seed/test handles never appear. A plain
 * list for one post, never a ranking.
 */
export async function listReactors(
  prisma: PrismaClient,
  id: string,
  page: PageParams,
  reaction: Reaction | undefined,
  viewer: Viewer,
): Promise<{ ok: true; page: Page<ReactorDTO> } | Failure> {
  try {
    const viewerId = viewer?.id ?? null;
    const blocked = viewerId
      ? await blockedIdsFor(prisma, viewerId)
      : new Set<string>();
    const post = await prisma.communityPost.findFirst({
      where: { id, ...communityVisibleWhere(blocked) },
      select: { id: true },
    });
    if (!post) {
      return { ok: false, code: "not_found", message: "That post is gone." };
    }

    const rows = await prisma.communityReaction.findMany({
      where: {
        postId: post.id,
        ...(reaction ? { reaction } : {}),
        ...(blocked.size > 0 ? { userId: { notIn: [...blocked] } } : {}),
        user: visiblePersonWhere(),
      },
      include: { user: { include: { artistProfile: true } } },
      orderBy: [{ createdAt: "desc" }, { userId: "desc" }],
      take: page.take + 1,
      ...(page.cursor
        ? {
            skip: 1,
            cursor: { userId_postId: { userId: page.cursor, postId: post.id } },
          }
        : {}),
    });

    const hasMore = rows.length > page.take;
    const slice = hasMore ? rows.slice(0, page.take) : rows;

    let following = new Set<string>();
    if (viewerId && slice.length > 0) {
      const edges = await prisma.follow.findMany({
        where: {
          followerId: viewerId,
          followingId: { in: slice.map((row) => row.userId) },
        },
        select: { followingId: true },
      });
      following = new Set(edges.map((edge) => edge.followingId));
    }

    return {
      ok: true,
      page: {
        items: slice.map((row) => ({
          reaction: row.reaction,
          person: toPersonSummaryDTO(row.user, following.has(row.userId)),
          createdAt: row.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? (slice[slice.length - 1]?.userId ?? null) : null,
      },
    };
  } catch (error) {
    console.error("[listReactors]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not load who reacted.",
    };
  }
}

/** Community photo upload: images only, same storage rules as studio media. */
export async function storeCommunityImage(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  file: File,
): Promise<{ ok: true; url: string } | Failure> {
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Community photos must be images (JPEG, PNG, WebP or GIF).",
    };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Image must be under 2.5MB",
    };
  }

  const limit = checkRateLimit(`v1:community:media:${dbUser.id}`, {
    windowMs: 10 * 60_000,
    max: 20,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Too many uploads. Try again shortly.",
      retryAfterSec: retryAfter(limit),
    };
  }

  try {
    const stored = await storeUploadedMedia(file);
    if (!stored.ok) {
      return { ok: false, code: stored.code, message: stored.error };
    }
    if (stored.media.mediaType !== "IMAGE") {
      return {
        ok: false,
        code: "validation_failed",
        message: "Community photos must be images.",
      };
    }
    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "community.media_upload",
      targetType: "User",
      targetId: dbUser.id,
      meta: { bytes: stored.media.bytes },
    });
    return {
      ok: true,
      url: absoluteUrl(stored.media.url) ?? stored.media.absoluteUrl,
    };
  } catch (error) {
    console.error("[storeCommunityImage]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save that photo.",
    };
  }
}
