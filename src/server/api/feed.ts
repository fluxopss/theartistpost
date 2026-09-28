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

export type FeedPageDTO = {
  kind: FeedKind;
  items: PostSummaryDTO[];
  nextCursor: string | null;
  /** Always null until Follow (Phase 4). */
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
