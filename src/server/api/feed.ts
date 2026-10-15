import { getArtistTimeline, getPosts } from "@/features/posts/queries";
import {
  toArtistProfileDTO,
  toPostSummaryDTO,
  type ArtistProfileDTO,
  type PostSummaryDTO,
} from "@/server/api/dto";
import {
  FOLLOWING_FEED_AVAILABLE,
  type FeedKind,
} from "@/server/api/follow";
import { isPlausibleHandle, parsePostsQuery } from "@/server/api/posts";
import { apiError, apiOk, CACHE } from "@/server/api/respond";
import { blockedIdsFor } from "@/server/api/safety";
import { requireApiSession, resolveOptionalSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export type FeedPageDTO = {
  kind: FeedKind;
  items: PostSummaryDTO[];
  nextCursor: string | null;
  /** True once the following feed is live (it is). */
  followingAvailable: boolean;
};

export type AuthorTimelineDTO = {
  kind: "author";
  artist: ArtistProfileDTO & { postCount: number };
  items: PostSummaryDTO[];
  nextCursor: string | null;
};

/**
 * Parse shared cursor/take/tag query. Returns a Response on validation failure.
 */
export function parseFeedSearchParams(
  params: URLSearchParams,
):
  | { ok: true; query: { cursor?: string; tag?: string; take: number } }
  | { ok: false; response: Response } {
  const parsed = parsePostsQuery(params);
  if (!parsed.ok) {
    return {
      ok: false,
      response: apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      }),
    };
  }
  return { ok: true, query: parsed.query };
}

/**
 * Signed-in viewer's block list (either direction). Anonymous or DB-less
 * requests get an empty set and keep the public cache policy.
 */
async function viewerBlocks(
  request: Request | undefined,
): Promise<{ viewerId: string | null; blocked: Set<string> }> {
  if (!request) return { viewerId: null, blocked: new Set() };
  const optional = await resolveOptionalSession(request);
  if (!optional) return { viewerId: null, blocked: new Set() };
  return {
    viewerId: optional.dbUser.id,
    blocked: await blockedIdsFor(optional.prisma, optional.dbUser.id),
  };
}

/**
 * True when the signed-in viewer is in a block relationship with the artist
 * behind `handle` (that artist's works disappear for them).
 */
export async function artistBlockedForViewer(
  request: Request | undefined,
  handle: string,
): Promise<boolean> {
  const { viewerId, blocked } = await viewerBlocks(request);
  const prisma = getPrisma();
  if (!viewerId || blocked.size === 0 || !prisma) return false;
  const profile = await prisma.artistProfile.findUnique({
    where: { handle },
    select: { userId: true },
  });
  return profile ? blocked.has(profile.userId) : false;
}

/**
 * Community / explore feed — public catalog, newest first. A signed-in viewer
 * never sees works by people they blocked (or who blocked them), so that
 * response is private.
 */
export async function exploreFeedResponse(
  params: URLSearchParams,
  request?: Request,
): Promise<Response> {
  const parsed = parseFeedSearchParams(params);
  if (!parsed.ok) return parsed.response;

  const { viewerId, blocked } = await viewerBlocks(request);
  const { items, nextCursor } = await getPosts({
    ...parsed.query,
    ...(blocked.size > 0 ? { excludeAuthorIds: [...blocked] } : {}),
  });
  const data: FeedPageDTO = {
    kind: "explore",
    items: items.map(toPostSummaryDTO),
    nextCursor,
    followingAvailable: FOLLOWING_FEED_AVAILABLE,
  };
  return apiOk(data, { cache: viewerId ? CACHE.none : CACHE.minute });
}

/**
 * Following feed — public Wall works by the artists the signed-in member
 * follows, newest first. Sign-in required; never shows blocked authors.
 */
export async function followingFeedResponse(
  request: Request,
  params: URLSearchParams,
): Promise<Response> {
  const ctx = await requireApiSession(request);
  if (ctx instanceof Response) return ctx;

  const parsed = parseFeedSearchParams(params);
  if (!parsed.ok) return parsed.response;

  const [edges, blocked] = await Promise.all([
    ctx.prisma.follow.findMany({
      where: { followerId: ctx.dbUser.id },
      select: { followingId: true },
    }),
    blockedIdsFor(ctx.prisma, ctx.dbUser.id),
  ]);
  const authorIds = edges
    .map((edge) => edge.followingId)
    .filter((id) => !blocked.has(id));

  const { items, nextCursor } =
    authorIds.length > 0
      ? await getPosts({ ...parsed.query, authorIds })
      : { items: [], nextCursor: null };

  const data: FeedPageDTO = {
    kind: "following",
    items: items.map(toPostSummaryDTO),
    nextCursor,
    followingAvailable: FOLLOWING_FEED_AVAILABLE,
  };
  return apiOk(data, { cache: CACHE.none });
}

/** Author timeline for an approved handle. 404 when missing/unapproved. */
export async function authorTimelineResponse(
  handle: string,
  params: URLSearchParams,
  request?: Request,
): Promise<Response> {
  if (!isPlausibleHandle(handle)) {
    return apiError("not_found", "No approved artist has that handle.");
  }
  if (await artistBlockedForViewer(request, handle)) {
    return apiError("not_found", "No approved artist has that handle.");
  }

  const parsed = parseFeedSearchParams(params);
  if (!parsed.ok) return parsed.response;

  const page = await getArtistTimeline(handle, parsed.query);
  if (!page) {
    return apiError("not_found", "No approved artist has that handle.");
  }

  const data: AuthorTimelineDTO = {
    kind: "author",
    artist: {
      ...toArtistProfileDTO(page.artist),
      postCount: page.artist.postCount,
    },
    items: page.items.map(toPostSummaryDTO),
    nextCursor: page.nextCursor,
  };
  return apiOk(data, { cache: CACHE.minute });
}
