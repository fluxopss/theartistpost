export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "The Artist Post";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const POSTS_PAGE_SIZE = 9;

/** Hard ceiling on one page of posts, whoever asks. */
export const POSTS_MAX_TAKE = 24;
