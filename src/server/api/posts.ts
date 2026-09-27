import { POSTS_MAX_TAKE } from "@/shared/lib/constants";

export const V1_POSTS_DEFAULT_TAKE = 12;

const WHOLE_NUMBER_RE = /^\d+$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** Same alphabet slugify() produces for posts and tags. */
const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const HANDLE_RE = /^[A-Za-z0-9_-]{1,40}$/;

export type PostsQuery = { cursor?: string; tag?: string; take: number };

type PostsQueryResult =
  | { ok: true; query: PostsQuery }
  | { ok: false; message: string; fields: Record<string, string> };

/**
 * `take` defaults to 12, must be a whole number ≥ 1, and is capped at 24.
 * `cursor` is a post id from `nextCursor`; `tag` is a tag slug.
 */
export function parsePostsQuery(params: URLSearchParams): PostsQueryResult {
  const fields: Record<string, string> = {};

  let take = V1_POSTS_DEFAULT_TAKE;
  const rawTake = params.get("take");
  if (rawTake !== null && rawTake !== "") {
    const n = WHOLE_NUMBER_RE.test(rawTake) ? Number(rawTake) : NaN;
    if (!Number.isSafeInteger(n) || n < 1) {
      fields.take = `take must be a whole number from 1 to ${POSTS_MAX_TAKE}.`;
    } else {
      take = Math.min(n, POSTS_MAX_TAKE);
    }
  }

  const cursor = params.get("cursor") || undefined;
  if (cursor !== undefined && !CURSOR_RE.test(cursor)) {
    fields.cursor = "cursor must be a nextCursor value from a previous page.";
  }

  const tag = params.get("tag") || undefined;
  if (tag !== undefined && !SLUG_RE.test(tag)) {
    fields.tag = "tag must be a tag slug (lowercase letters, numbers, dashes).";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return { ok: true, query: { cursor, tag, take } };
}

export function isPlausibleSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function isPlausibleHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}
