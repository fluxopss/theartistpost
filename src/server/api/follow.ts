/**
 * Follow graph — Phase 4 stub (engine Slice F).
 * No Prisma model yet; home feed stays explore-only until this lands.
 */

export type FollowEdge = {
  followerId: string;
  followingId: string;
};

/** What `/api/v1/feed` will advertise once Follow ships. */
export type FeedKind = "explore" | "following" | "author";

/** Placeholder until Follow exists — clients should treat as "not available". */
export const FOLLOWING_FEED_AVAILABLE = false;
