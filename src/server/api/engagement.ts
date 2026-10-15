import { z } from "zod";
import type { PrismaClient, Reaction } from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import {
  DENIED_AUTHOR_EMAILS,
  isDeniedAuthorEmail,
  isDeniedPostSlug,
  publicCatalogWhere,
} from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import type { DbUserWithProfile } from "@/features/auth/sessionUser";
import { notify } from "@/server/api/notifications";
import {
  emptyReactionCounts,
  loadWallReactionCounts,
  reactionBodySchema,
  totalReactions,
  type ReactionCounts,
} from "@/server/api/reactions";
import { blockedIdsFor } from "@/server/api/safety";
import { screenText } from "@/server/api/textFilter";
import { absoluteUrl } from "@/server/api/urls";
import { graphemeLength, unitCeiling } from "@/shared/lib/graphemes";

export const COMMENT_BODY_MAX = 280;
export const COMMENT_DEFAULT_TAKE = 24;
export const COMMENT_MAX_TAKE = 50;

export const commentBodySchema = z.object({
  // Counted by what a person sees, so an emoji is one character.
  body: z
    .string()
    .trim()
    .min(1)
    .max(unitCeiling(COMMENT_BODY_MAX))
    .refine((value) => graphemeLength(value) <= COMMENT_BODY_MAX, {
      message: `Keep it under ${COMMENT_BODY_MAX} characters.`,
    }),
});

export type EngagementCommentDTO = {
  id: string;
  body: string;
  author: { name: string; handle: string | null; avatarUrl: string | null };
  createdAt: string;
};

export type CreateCommentResult =
  | { ok: false; code: "validation_failed" | "not_found" | "forbidden" | "rate_limited" | "upstream_unavailable"; message: string; retryAfterSec?: number; fields?: Record<string, string> }
  | { ok: true; comment: EngagementCommentDTO };

export type ToggleLikeResult =
  | { ok: false; code: "not_found" | "forbidden" | "rate_limited" | "upstream_unavailable"; message: string; retryAfterSec?: number }
  | ({ ok: true } & WallReactionState);

export type WallReactionState = {
  liked: boolean;
  likeCount: number;
  viewerReaction: Reaction | null;
  reactionCounts: ReactionCounts;
};

export type DeleteCommentResult =
  | { ok: false; code: "not_found" | "forbidden" | "upstream_unavailable"; message: string }
  | { ok: true; deleted: true };

async function loadPublicPostBySlug(
  prisma: PrismaClient,
  slug: string,
) {
  if (isDeniedPostSlug(slug)) return null;
  const post = await prisma.post.findFirst({
    where: {
      ...publicCatalogWhere(),
      slug,
    },
    include: {
      author: { include: { artistProfile: true } },
      _count: { select: { likes: true } },
    },
  });
  if (!post) return null;
  if (isDeniedAuthorEmail(post.author.email)) return null;
  return post;
}

function engagementForbidden(dbUser: DbUserWithProfile): string | null {
  if (isDeniedAuthorEmail(dbUser.email)) {
    return "That identity cannot respond.";
  }
  return null;
}

/**
 * Persist a comment for a signed-in house member on a public post.
 */
export async function createCommentForUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
  rawBody: unknown,
): Promise<CreateCommentResult> {
  const denied = engagementForbidden(dbUser);
  if (denied) {
    return { ok: false, code: "forbidden", message: denied };
  }

  const parsed = commentBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid comment",
      fields,
    };
  }

  const screened = screenText(parsed.data.body);
  if (!screened.ok) {
    return {
      ok: false,
      code: "validation_failed",
      message: screened.message,
      fields: { body: screened.message },
    };
  }

  const limit = checkRateLimit(`v1:comment:${dbUser.id}`, {
    windowMs: 60_000,
    max: 20,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many notes just now.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return {
        ok: false,
        code: "not_found",
        message: "That post is not open for comments.",
      };
    }

    const comment = await prisma.comment.create({
      data: {
        body: parsed.data.body,
        postId: post.id,
        userId: dbUser.id,
      },
    });

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "comment.create",
      targetType: "Comment",
      targetId: comment.id,
      meta: { postId: post.id, slug: post.slug },
    });

    await notify(prisma, {
      userId: post.authorId,
      actorId: dbUser.id,
      type: "COMMENT",
      targetKind: "post",
      targetRef: post.slug,
      preview: comment.body,
    });

    return {
      ok: true,
      comment: {
        id: comment.id,
        body: comment.body,
        author: {
          name: dbUser.name,
          handle: dbUser.handle ?? dbUser.artistProfile?.handle ?? null,
          avatarUrl: absoluteUrl(dbUser.artistProfile?.avatarUrl ?? dbUser.image),
        },
        createdAt: comment.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[createCommentForUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not leave that note.",
    };
  }
}

/**
 * Toggle like for a signed-in user on a public post.
 */
export async function toggleLikeForUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
): Promise<ToggleLikeResult> {
  const denied = engagementForbidden(dbUser);
  if (denied) {
    return { ok: false, code: "forbidden", message: denied };
  }

  const limit = checkRateLimit(`v1:like:${dbUser.id}`, {
    windowMs: 60_000,
    max: 40,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many likes just now.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return {
        ok: false,
        code: "not_found",
        message: "That post is not open for likes.",
      };
    }

    const existing = await prisma.like.findUnique({
      where: {
        userId_postId: { userId: dbUser.id, postId: post.id },
      },
    });

    let liked: boolean;
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      liked = false;
      await writeAuditLog(prisma, {
        actorId: dbUser.id,
        action: "like.remove",
        targetType: "Post",
        targetId: post.id,
        meta: { slug: post.slug },
      });
    } else {
      await prisma.like.create({
        data: { userId: dbUser.id, postId: post.id, reaction: "LOVE" },
      });
      liked = true;
      await writeAuditLog(prisma, {
        actorId: dbUser.id,
        action: "like.add",
        targetType: "Post",
        targetId: post.id,
        meta: { slug: post.slug },
      });
      await notify(prisma, {
        userId: post.authorId,
        actorId: dbUser.id,
        type: "LIKE",
        targetKind: "post",
        targetRef: post.slug,
        preview: post.title,
      });
    }

    return {
      ok: true,
      ...(await wallStateFor(prisma, post.id, liked ? "LOVE" : null)),
    };
  } catch (error) {
    console.error("[toggleLikeForUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not update like.",
    };
  }
}

async function wallStateFor(
  prisma: PrismaClient,
  postId: string,
  viewerReaction: Reaction | null,
): Promise<WallReactionState> {
  const counts =
    (await loadWallReactionCounts(prisma, [postId])).get(postId) ??
    emptyReactionCounts();
  return {
    liked: viewerReaction !== null,
    likeCount: totalReactions(counts),
    viewerReaction,
    reactionCounts: counts,
  };
}

type WallReactionFailure = {
  ok: false;
  code:
    | "validation_failed"
    | "not_found"
    | "forbidden"
    | "rate_limited"
    | "upstream_unavailable";
  message: string;
  retryAfterSec?: number;
  fields?: Record<string, string>;
};

/**
 * Set (or change) the viewer's one reaction on a Wall post. A Like row IS the
 * reaction, so a different emoji updates it in place, and the artist hears
 * about it once, on the first reaction.
 */
export async function setWallReaction(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
  rawBody: unknown,
): Promise<({ ok: true } & WallReactionState) | WallReactionFailure> {
  const denied = engagementForbidden(dbUser);
  if (denied) return { ok: false, code: "forbidden", message: denied };

  const parsed = reactionBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Pick one of the reactions.",
      fields: { reaction: "Pick one of the reactions." },
    };
  }
  const { reaction } = parsed.data;

  const limit = checkRateLimit(`v1:like:${dbUser.id}`, {
    windowMs: 60_000,
    max: 40,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many reactions just now.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return {
        ok: false,
        code: "not_found",
        message: "That post is not open for reactions.",
      };
    }

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId: dbUser.id, postId: post.id } },
    });

    if (existing && existing.reaction === reaction) {
      return { ok: true, ...(await wallStateFor(prisma, post.id, reaction)) };
    }

    if (existing) {
      await prisma.like.update({
        where: { id: existing.id },
        data: { reaction },
      });
    } else {
      await prisma.like.create({
        data: { userId: dbUser.id, postId: post.id, reaction },
      });
      const earlier = await prisma.notification.findFirst({
        where: {
          userId: post.authorId,
          actorId: dbUser.id,
          type: "LIKE",
          targetKind: "post",
          targetRef: post.slug,
        },
        select: { id: true },
      });
      if (!earlier) {
        await notify(prisma, {
          userId: post.authorId,
          actorId: dbUser.id,
          type: "LIKE",
          targetKind: "post",
          targetRef: post.slug,
          preview: post.title,
        });
      }
    }

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "like.add",
      targetType: "Post",
      targetId: post.id,
      meta: { slug: post.slug, reaction, replaced: existing?.reaction ?? null },
    });

    return { ok: true, ...(await wallStateFor(prisma, post.id, reaction)) };
  } catch (error) {
    console.error("[setWallReaction]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save that reaction.",
    };
  }
}

/** Take the viewer's reaction off a Wall post (same as un-liking). */
export async function clearWallReaction(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
): Promise<({ ok: true } & WallReactionState) | WallReactionFailure> {
  const denied = engagementForbidden(dbUser);
  if (denied) return { ok: false, code: "forbidden", message: denied };

  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return {
        ok: false,
        code: "not_found",
        message: "That post is not open for reactions.",
      };
    }
    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId: dbUser.id, postId: post.id } },
    });
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      await writeAuditLog(prisma, {
        actorId: dbUser.id,
        action: "like.remove",
        targetType: "Post",
        targetId: post.id,
        meta: { slug: post.slug, reaction: existing.reaction },
      });
    }
    return { ok: true, ...(await wallStateFor(prisma, post.id, null)) };
  } catch (error) {
    console.error("[clearWallReaction]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not remove that reaction.",
    };
  }
}

/**
 * Author or ADMIN may remove a comment on a public post.
 */
export async function deleteCommentForUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
  commentId: string,
): Promise<DeleteCommentResult> {
  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return { ok: false, code: "not_found", message: "That post is not on the wall." };
    }

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, postId: post.id },
    });
    if (!comment) {
      return { ok: false, code: "not_found", message: "That comment is gone." };
    }

    const canDelete =
      dbUser.role === "ADMIN" || comment.userId === dbUser.id;
    if (!canDelete) {
      return {
        ok: false,
        code: "forbidden",
        message: "You can only remove your own notes.",
      };
    }

    await prisma.comment.delete({ where: { id: comment.id } });
    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "comment.delete",
      targetType: "Comment",
      targetId: comment.id,
      meta: { postId: post.id, slug: post.slug },
    });

    return { ok: true, deleted: true };
  } catch (error) {
    console.error("[deleteCommentForUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not remove that note.",
    };
  }
}

const WHOLE_NUMBER_RE = /^\d+$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,64}$/;

export type CommentsQuery = { cursor?: string; take: number };

export function parseCommentsQuery(
  params: URLSearchParams,
):
  | { ok: true; query: CommentsQuery }
  | { ok: false; message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  let take = COMMENT_DEFAULT_TAKE;
  const rawTake = params.get("take");
  if (rawTake !== null && rawTake !== "") {
    const n = WHOLE_NUMBER_RE.test(rawTake) ? Number(rawTake) : NaN;
    if (!Number.isSafeInteger(n) || n < 1) {
      fields.take = `take must be a whole number from 1 to ${COMMENT_MAX_TAKE}.`;
    } else {
      take = Math.min(n, COMMENT_MAX_TAKE);
    }
  }

  const cursor = params.get("cursor") || undefined;
  if (cursor !== undefined && !CURSOR_RE.test(cursor)) {
    fields.cursor = "cursor must be a nextCursor value from a previous page.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return { ok: true, query: { cursor, take } };
}

export async function listCommentsForSlug(
  prisma: PrismaClient,
  slug: string,
  query: CommentsQuery,
  viewerId: string | null = null,
): Promise<
  | { ok: false; code: "not_found"; message: string }
  | {
      ok: true;
      items: EngagementCommentDTO[];
      nextCursor: string | null;
      commentCount: number;
    }
> {
  const post = await loadPublicPostBySlug(prisma, slug);
  if (!post) {
    return {
      ok: false,
      code: "not_found",
      message: "That post is not on the wall.",
    };
  }

  const blocked = viewerId
    ? await blockedIdsFor(prisma, viewerId)
    : new Set<string>();
  const publicCommentWhere = {
    postId: post.id,
    hiddenAt: null,
    user: {
      email: { notIn: [...DENIED_AUTHOR_EMAILS] },
      ...(blocked.size > 0 ? { id: { notIn: [...blocked] } } : {}),
    },
  };

  const comments = await prisma.comment.findMany({
    where: publicCommentWhere,
    orderBy: { createdAt: "desc" },
    take: query.take + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    include: {
      user: { include: { artistProfile: true } },
    },
  });

  const hasMore = comments.length > query.take;
  const slice = hasMore ? comments.slice(0, query.take) : comments;
  const commentCount = await prisma.comment.count({
    where: publicCommentWhere,
  });

  return {
    ok: true,
    items: slice.map((c) => ({
      id: c.id,
      body: c.body,
      author: {
        name: c.user.name,
        handle: c.user.handle ?? c.user.artistProfile?.handle ?? null,
        avatarUrl: absoluteUrl(c.user.artistProfile?.avatarUrl ?? c.user.image),
      },
      createdAt: c.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    commentCount,
  };
}

export async function likeStateForUser(
  prisma: PrismaClient,
  slug: string,
  userId: string | null,
): Promise<{
  likedByMe: boolean | null;
  likeCount: number;
  viewerReaction: Reaction | null;
  reactionCounts: ReactionCounts;
} | null> {
  const post = await loadPublicPostBySlug(prisma, slug);
  if (!post) return null;
  const grouped = (await loadWallReactionCounts(prisma, [post.id])).get(
    post.id,
  );
  const reactionCounts = grouped ?? {
    ...emptyReactionCounts(),
    LOVE: post._count.likes,
  };
  const likeCount = grouped ? totalReactions(grouped) : post._count.likes;
  if (!userId) {
    return { likedByMe: null, likeCount, viewerReaction: null, reactionCounts };
  }
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId: post.id } },
  });
  return {
    likedByMe: Boolean(existing),
    likeCount,
    viewerReaction: existing ? (existing.reaction ?? "LOVE") : null,
    reactionCounts,
  };
}
