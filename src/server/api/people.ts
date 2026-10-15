import type { Prisma, PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { DENIED_AUTHOR_EMAILS, TEST_HANDLE_PREFIX } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import { content } from "@/lib/content";
import {
  toPersonSummaryDTO,
  type PersonRow,
  type PersonSummaryDTO,
} from "@/server/api/communityDto";
export { toPersonSummaryDTO };
export type { PersonRow, PersonSummaryDTO };
import {
  communityPostInclude,
  communityVisibleWhere,
  toCommunityPostDTO,
  type CommunityPostDTO,
  type CommunityPostRow,
  type Viewer,
} from "@/server/api/communityDto";
import { normalizeHandle } from "@/server/api/handles";
import { notify } from "@/server/api/notifications";
import { loadCommunityReactionCounts } from "@/server/api/reactions";
import { blockedIdsFor } from "@/server/api/safety";
import { toTopicDTO, type TopicDTO } from "@/server/api/topics";
import type { Page, PageParams } from "@/server/api/validation";

export const PEOPLE_DEFAULT_TAKE = 20;
export const PEOPLE_MAX_TAKE = 30;
export const SUGGESTED_MAX = 12;
export const PEOPLE_QUERY_MIN = 2;

export type PersonDTO = PersonSummaryDTO & {
  bio: string | null;
  location: string | null;
  chapter: { id: string; name: string } | null;
  topics: TopicDTO[];
  followerCount: number;
  followingCount: number;
  communityPostCount: number;
  followsViewer: boolean;
  isSelf: boolean;
  artist: { handle: string; approved: boolean } | null;
  joinedAt: string;
};

/**
 * Who may appear in people lists: has a handle, not suspended, not a seed
 * identity, and not an E2E test account. The NOT clause is a separate key so
 * callers that spread this and override `handle` keep the exclusion.
 */
export function visiblePersonWhere(): Prisma.UserWhereInput {
  return {
    handle: { not: null },
    suspendedAt: null,
    email: { notIn: [...DENIED_AUTHOR_EMAILS] },
    NOT: { handle: { startsWith: TEST_HANDLE_PREFIX } },
  };
}

type Failure = {
  ok: false;
  code:
    | "validation_failed"
    | "unauthorized"
    | "not_found"
    | "rate_limited"
    | "upstream_unavailable";
  message: string;
  fields?: Record<string, string>;
  retryAfterSec?: number;
};

const NOT_FOUND = "No one with that handle.";

/**
 * Resolve a public profile by handle. Null when missing, suspended, a seed
 * identity, or in a block relationship with the viewer (either direction).
 */
export async function findVisiblePerson(
  prisma: PrismaClient,
  rawHandle: string,
  viewerId: string | null,
): Promise<PersonRow | null> {
  const handle = normalizeHandle(rawHandle);
  const person = await prisma.user.findFirst({
    where: { ...visiblePersonWhere(), handle },
    include: { artistProfile: true },
  });
  if (!person) return null;
  if (viewerId && viewerId !== person.id) {
    const blocked = await blockedIdsFor(prisma, viewerId);
    if (blocked.has(person.id)) return null;
  }
  return person;
}

async function followedSet(
  prisma: PrismaClient,
  viewerId: string | null,
  ids: string[],
): Promise<Set<string>> {
  if (!viewerId || ids.length === 0) return new Set();
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: ids } },
    select: { followingId: true },
  });
  return new Set(rows.map((row) => row.followingId));
}

export async function getPerson(
  prisma: PrismaClient,
  handle: string,
  viewerId: string | null,
): Promise<PersonDTO | null> {
  const person = await findVisiblePerson(prisma, handle, viewerId);
  if (!person) return null;

  const [
    userTopics,
    followerCount,
    followingCount,
    communityPostCount,
    viewerEdge,
    viewerReverse,
    chapters,
  ] = await Promise.all([
    prisma.userTopic.findMany({
      where: { userId: person.id },
      include: { topic: true },
      orderBy: { topic: { sortOrder: "asc" } },
    }),
    prisma.follow.count({ where: { followingId: person.id } }),
    prisma.follow.count({ where: { followerId: person.id } }),
    prisma.communityPost.count({
      where: { authorId: person.id, parentId: null, hiddenAt: null },
    }),
    viewerId
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: person.id,
            },
          },
        })
      : Promise.resolve(null),
    viewerId
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: person.id,
              followingId: viewerId,
            },
          },
        })
      : Promise.resolve(null),
    person.chapterId ? content.getChapters() : Promise.resolve([]),
  ]);

  const chapter = person.chapterId
    ? chapters.find((c) => c.id === person.chapterId)
    : undefined;
  const artist = person.artistProfile;

  return {
    ...toPersonSummaryDTO(person, Boolean(viewerEdge)),
    bio: person.bio ?? artist?.bio ?? null,
    location: person.location ?? null,
    chapter: chapter ? { id: chapter.id, name: chapter.name } : null,
    topics: userTopics.map((row) => toTopicDTO(row.topic)),
    followerCount,
    followingCount,
    communityPostCount,
    followsViewer: Boolean(viewerReverse),
    isSelf: viewerId === person.id,
    artist: artist ? { handle: artist.handle, approved: artist.approved } : null,
    joinedAt: person.createdAt.toISOString(),
  };
}

export type PeopleQuery = {
  q?: string;
  topic?: string;
  suggested: boolean;
  cursor?: string;
  take: number;
};

const CURSOR_RE = /^[A-Za-z0-9_-]{1,64}$/;
const TOPIC_RE = /^[a-z0-9-]{1,40}$/;

export function parsePeopleQuery(
  params: URLSearchParams,
):
  | { ok: true; query: PeopleQuery }
  | { ok: false; message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  let q: string | undefined;
  const rawQ = params.get("q");
  if (rawQ !== null) {
    const trimmed = rawQ.trim().replace(/^@/, "");
    if (trimmed.length < PEOPLE_QUERY_MIN) {
      fields.q = `q needs at least ${PEOPLE_QUERY_MIN} characters.`;
    } else if (trimmed.length > 60) {
      fields.q = "q is too long.";
    } else {
      q = trimmed;
    }
  }

  const topic = params.get("topic") || undefined;
  if (topic !== undefined && !TOPIC_RE.test(topic)) {
    fields.topic = "topic must be a topic slug.";
  }

  let take = PEOPLE_DEFAULT_TAKE;
  const rawTake = params.get("take");
  if (rawTake !== null && rawTake !== "") {
    const n = /^\d+$/.test(rawTake) ? Number(rawTake) : NaN;
    if (!Number.isSafeInteger(n) || n < 1) {
      fields.take = `take must be a whole number from 1 to ${PEOPLE_MAX_TAKE}.`;
    } else {
      take = Math.min(n, PEOPLE_MAX_TAKE);
    }
  }

  const cursor = params.get("cursor") || undefined;
  if (cursor !== undefined && !CURSOR_RE.test(cursor)) {
    fields.cursor = "cursor must be a nextCursor value from a previous page.";
  }

  const suggested = params.get("suggested") === "1";

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return { ok: true, query: { q, topic, suggested, cursor, take } };
}

/**
 * People directory: name/handle search, topic filter, and "suggested for you"
 * (shares >= 1 topic, not followed, not self, at most 12).
 */
export async function searchPeople(
  prisma: PrismaClient,
  query: PeopleQuery,
  viewerId: string | null,
): Promise<{ ok: true; page: Page<PersonSummaryDTO> } | Failure> {
  if (query.suggested && !viewerId) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Sign in to see people you may like.",
    };
  }

  const blocked = viewerId
    ? await blockedIdsFor(prisma, viewerId)
    : new Set<string>();

  const and: Prisma.UserWhereInput[] = [visiblePersonWhere()];
  if (blocked.size > 0) and.push({ id: { notIn: [...blocked] } });

  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { handle: { contains: query.q.toLowerCase(), mode: "insensitive" } },
      ],
    });
  }
  if (query.topic) {
    and.push({ topics: { some: { topic: { slug: query.topic } } } });
  }

  let take = query.take;
  if (query.suggested && viewerId) {
    take = Math.min(take, SUGGESTED_MAX);
    const [mine, following] = await Promise.all([
      prisma.userTopic.findMany({
        where: { userId: viewerId },
        select: { topicId: true },
      }),
      prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      }),
    ]);
    if (mine.length === 0) {
      return { ok: true, page: { items: [], nextCursor: null } };
    }
    and.push({
      id: { notIn: [viewerId, ...following.map((row) => row.followingId)] },
      topics: { some: { topicId: { in: mine.map((row) => row.topicId) } } },
    });
  }

  const rows = await prisma.user.findMany({
    where: { AND: and },
    include: { artistProfile: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(query.cursor && !query.suggested
      ? { skip: 1, cursor: { id: query.cursor } }
      : {}),
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  const followed = await followedSet(
    prisma,
    viewerId,
    slice.map((row) => row.id),
  );

  return {
    ok: true,
    page: {
      items: slice.map((row) => toPersonSummaryDTO(row, followed.has(row.id))),
      nextCursor:
        hasMore && !query.suggested
          ? (slice[slice.length - 1]?.id ?? null)
          : null,
    },
  };
}

export type ToggleFollowResult =
  | { ok: true; following: boolean; followerCount: number }
  | Failure;

/** Follow / unfollow (toggle). Never yourself, never across a block. */
export async function toggleFollow(
  prisma: PrismaClient,
  viewer: { id: string; handle: string | null },
  rawHandle: string,
): Promise<ToggleFollowResult> {
  if (viewer.handle && normalizeHandle(rawHandle) === viewer.handle) {
    return {
      ok: false,
      code: "validation_failed",
      message: "You can't follow yourself.",
    };
  }

  const limit = checkRateLimit(`v1:follow:${viewer.id}`, {
    windowMs: 60_000,
    max: 60,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many follows just now.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const target = await findVisiblePerson(prisma, rawHandle, viewer.id);
    if (!target) return { ok: false, code: "not_found", message: NOT_FOUND };
    if (target.id === viewer.id) {
      return {
        ok: false,
        code: "validation_failed",
        message: "You can't follow yourself.",
      };
    }

    const key = {
      followerId_followingId: { followerId: viewer.id, followingId: target.id },
    };
    const existing = await prisma.follow.findUnique({ where: key });

    let following: boolean;
    if (existing) {
      await prisma.follow.delete({ where: key });
      following = false;
      await writeAuditLog(prisma, {
        actorId: viewer.id,
        action: "follow.remove",
        targetType: "User",
        targetId: target.id,
      });
    } else {
      await prisma.follow.create({
        data: { followerId: viewer.id, followingId: target.id },
      });
      following = true;
      await writeAuditLog(prisma, {
        actorId: viewer.id,
        action: "follow.create",
        targetType: "User",
        targetId: target.id,
      });
      await notify(prisma, {
        userId: target.id,
        actorId: viewer.id,
        type: "FOLLOW",
        targetKind: "person",
        targetRef: viewer.handle,
      });
    }

    const followerCount = await prisma.follow.count({
      where: { followingId: target.id },
    });
    return { ok: true, following, followerCount };
  } catch (error) {
    console.error("[toggleFollow]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not update that follow.",
    };
  }
}

async function listFollowEdges(
  prisma: PrismaClient,
  side: "followers" | "following",
  rawHandle: string,
  page: PageParams,
  viewerId: string | null,
): Promise<{ ok: true; page: Page<PersonSummaryDTO> } | Failure> {
  const target = await findVisiblePerson(prisma, rawHandle, viewerId);
  if (!target) return { ok: false, code: "not_found", message: NOT_FOUND };

  const blocked = viewerId
    ? await blockedIdsFor(prisma, viewerId)
    : new Set<string>();
  const otherUser: Prisma.UserWhereInput = {
    ...visiblePersonWhere(),
    ...(blocked.size > 0 ? { id: { notIn: [...blocked] } } : {}),
  };

  const isFollowers = side === "followers";
  const rows = await prisma.follow.findMany({
    where: isFollowers
      ? { followingId: target.id, follower: otherUser }
      : { followerId: target.id, following: otherUser },
    include: isFollowers
      ? { follower: { include: { artistProfile: true } } }
      : { following: { include: { artistProfile: true } } },
    orderBy: [
      { createdAt: "desc" },
      isFollowers ? { followerId: "asc" } : { followingId: "asc" },
    ],
    take: page.take + 1,
    ...(page.cursor
      ? {
          skip: 1,
          cursor: {
            followerId_followingId: isFollowers
              ? { followerId: page.cursor, followingId: target.id }
              : { followerId: target.id, followingId: page.cursor },
          },
        }
      : {}),
  });

  const hasMore = rows.length > page.take;
  const slice = hasMore ? rows.slice(0, page.take) : rows;
  const users = slice.map((row) =>
    "follower" in row
      ? (row.follower as PersonRow)
      : (row as unknown as { following: PersonRow }).following,
  );
  const followed = await followedSet(
    prisma,
    viewerId,
    users.map((u) => u.id),
  );

  return {
    ok: true,
    page: {
      items: users.map((u) => toPersonSummaryDTO(u, followed.has(u.id))),
      nextCursor: hasMore ? (users[users.length - 1]?.id ?? null) : null,
    },
  };
}

export function listFollowers(
  prisma: PrismaClient,
  handle: string,
  page: PageParams,
  viewerId: string | null,
) {
  return listFollowEdges(prisma, "followers", handle, page, viewerId);
}

export function listFollowing(
  prisma: PrismaClient,
  handle: string,
  page: PageParams,
  viewerId: string | null,
) {
  return listFollowEdges(prisma, "following", handle, page, viewerId);
}

/** A person's top-level community posts, newest first. */
export async function listPersonCommunity(
  prisma: PrismaClient,
  handle: string,
  page: PageParams,
  viewer: Viewer,
): Promise<{ ok: true; page: Page<CommunityPostDTO> } | Failure> {
  const viewerId = viewer?.id ?? null;
  const person = await findVisiblePerson(prisma, handle, viewerId);
  if (!person) return { ok: false, code: "not_found", message: NOT_FOUND };

  const blocked = viewerId
    ? await blockedIdsFor(prisma, viewerId)
    : new Set<string>();

  const rows = (await prisma.communityPost.findMany({
    where: {
      ...communityVisibleWhere(blocked),
      authorId: person.id,
      parentId: null,
    },
    include: communityPostInclude(viewerId, blocked),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: page.take + 1,
    ...(page.cursor ? { skip: 1, cursor: { id: page.cursor } } : {}),
  })) as unknown as CommunityPostRow[];

  const hasMore = rows.length > page.take;
  const slice = hasMore ? rows.slice(0, page.take) : rows;
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
