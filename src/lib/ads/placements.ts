/**
 * Where ads MAY go. A spot only shows an ad once Robbie approves it and its
 * AdSense ad-unit ID is set in ADSENSE_SLOTS. Until then it is invisible —
 * except in preview mode (?ad-preview=1), which outlines every candidate spot
 * on the real pages so placements are chosen by looking, not guessing.
 *
 * Founder's rule (Vision §7): ads never overwhelm the creative experience or
 * undermine trust. So spots live only on reading pages, at natural pauses,
 * never inside the art, the community, sign-in, or giving.
 */

type Env = Record<string, string | undefined>;

export type AdPlacementId =
  | "home-lower"
  | "history-end"
  | "about-end"
  | "schedule-end";

export type AdPlacement = {
  id: AdPlacementId;
  /** The page the spot sits on (for review and the protected-page test). */
  path: string;
  label: string;
  /** Why this spot is a natural pause, in plain words for Robbie. */
  why: string;
};

export const AD_PLACEMENTS: readonly AdPlacement[] = [
  {
    id: "home-lower",
    path: "/",
    label: "Home, after featured artists",
    why: "Below the hero, the night, kindness and the artists. Visitors have seen the heart of the house first.",
  },
  {
    id: "history-end",
    path: "/history",
    label: "History, end of the story",
    why: "After the full origin story, before the Get Involved buttons. A long read with a natural ending.",
  },
  {
    id: "about-end",
    path: "/about",
    label: "About, bottom of the page",
    why: "After everything about the nonprofit has been said.",
  },
  {
    id: "schedule-end",
    path: "/artist-schedule",
    label: "Schedule, below the showcase list",
    why: "After the full list of nights, so it never splits the calendar.",
  },
];

/**
 * Pages that must never carry an ad, whatever anyone configures: the art,
 * the community, sign-in, accounts, giving, and kindness.
 */
export const AD_FREE_PATHS: readonly string[] = [
  "/explore",
  "/community",
  "/join",
  "/create",
  "/post",
  "/u",
  "/settings",
  "/saved",
  "/delete-account",
  "/donate",
  "/supporters",
  "/kindness-always",
  "/night",
  "/event",
  "/get-involved",
  "/privacy",
  "/terms",
];

export function isAdFreePath(path: string): boolean {
  return AD_FREE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

const SLOT_ID = /^\d{6,20}$/;

/**
 * Approved spots → AdSense ad-unit slot IDs, from
 * ADSENSE_SLOTS="history-end:1234567890,about-end:2345678901".
 * Unknown spots and malformed IDs are dropped. The ad-free rule is enforced
 * where it can actually fail, at render time on the real route: <AdSlot>
 * renders nothing on an ad-free page (components/ads/AdRouteGuard).
 */
export function approvedSlots(env: Env = process.env): Map<AdPlacementId, string> {
  const out = new Map<AdPlacementId, string>();
  const raw = env.ADSENSE_SLOTS?.trim();
  if (!raw) return out;
  for (const pair of raw.split(",")) {
    const [id, slot] = pair.split(":").map((s) => s?.trim());
    const placement = AD_PLACEMENTS.find((p) => p.id === id);
    if (!placement || !slot || !SLOT_ID.test(slot)) continue;
    out.set(placement.id, slot);
  }
  return out;
}

export function adPlacement(id: AdPlacementId): AdPlacement {
  const p = AD_PLACEMENTS.find((item) => item.id === id);
  if (!p) throw new Error(`Unknown ad placement ${id}`);
  return p;
}
