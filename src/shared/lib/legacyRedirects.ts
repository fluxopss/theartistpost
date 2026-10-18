/**
 * One-hop redirects for theartistpost.org URLs from the GoDaddy Website Builder
 * era (found in the Wayback Machine, 2026-10-18), so old links, bookmarks and
 * search results land on the right page after the domain moves here.
 *
 * Rules (Track's SEO map, 2026-10-08):
 *  - never redirect to the home page; pick the closest real page;
 *  - the retired paid pages (/advertise-with-tap, /membership) only ever point
 *    to the free join page or the partner/sponsor door. Artists are never
 *    charged, so those pages are never rebuilt.
 * Pages that exist on both sites (/about, /artist-schedule, /kindness-always,
 * /supporters) need no rule.
 */
export type LegacyRedirect = { source: string; destination: string };

const PARTNER_DOOR = "/get-involved?door=partner";

export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  { source: "/events", destination: "/artist-schedule" },
  { source: "/contact-us", destination: "/support" },
  { source: "/team", destination: "/about" },
  { source: "/arts-collective", destination: "/about" },
  { source: "/venues", destination: PARTNER_DOOR },
  { source: "/sponsors", destination: PARTNER_DOOR },
  { source: "/marketing-services", destination: PARTNER_DOOR },
  { source: "/advertise-with-tap", destination: PARTNER_DOOR },
  { source: "/membership", destination: "/join" },
  { source: "/artist-post-activation", destination: "/join" },
  { source: "/book-talent", destination: "/explore" },
  { source: "/investors", destination: "/supporters" },
  { source: "/artist-posts", destination: "/supporters" },
  { source: "/artist-post-network", destination: "/supporters" },
  { source: "/artist-posts-pb-county", destination: "/supporters" },
  { source: "/artist-posts-fl-broward", destination: "/supporters" },
  { source: "/artist-posts-nc", destination: "/supporters" },
  { source: "/artist-posts-ri", destination: "/supporters" },
  { source: "/artist-posts-tx", destination: "/supporters" },
  // Archived as both "tampa,-fl" and "tampa%2C-fl"; match any spelling.
  { source: "/artist-posts-tampa:suffix", destination: "/supporters" },
];
