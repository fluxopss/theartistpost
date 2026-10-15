/**
 * Follow graph types. The Follow model and the people/follow endpoints live in
 * `people.ts`; this file keeps the feed-facing contract constants.
 */

export type FollowEdge = {
  followerId: string;
  followingId: string;
};

/** What `/api/v1/feed` will advertise once Follow ships. */
export type FeedKind = "explore" | "following" | "author";

/** The following feed (`GET /api/v1/feed?kind=following`) is live. */
export const FOLLOWING_FEED_AVAILABLE = true;
