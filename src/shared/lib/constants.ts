export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "The Artist Post";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Opt-in only — Three.js must never block the brand home screen. */
export const WEBGL_DEFAULT =
  process.env.NEXT_PUBLIC_WEBGL_DEFAULT === "true";

export const POSTS_PAGE_SIZE = 9;
