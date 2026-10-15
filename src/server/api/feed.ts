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
import { requireApiSession } from "@/server/api/session";

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

/** Community / explore feed — public catalog, newest first. */
export async function exploreFeedResponse(
  params: URLSearchParams,
): Promise<Response> {
  const parsed = parseFeedSearchParams(params);
  if (!parsed.ok) return parsed.response;

  const { items, nextCursor } = await getPosts(parsed.query);
  const data: FeedPageDTO = {
    kind: "explore",
    items: items.map(toPostSummaryDTO),
    nextCursor,
    followingAvailable: FOLLOWING_FEED_AVAILABLE,
  };
  return apiOk(data, { cache: CACHE.minute });
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
): Promise<Response> {
  if (!isPlausibleHandle(handle)) {
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
