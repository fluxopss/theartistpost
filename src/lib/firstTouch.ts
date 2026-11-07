/**
 * First-touch attribution for the /join flow: UTMs, gclid and landing page,
 * saved once in localStorage on the visitor's first visit and sent with the
 * join so GoHighLevel knows where a sign-up came from. Never overwritten by a
 * later visit. Storage can be blocked, so every access is wrapped.
 */

export const FIRST_TOUCH_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "gclid",
  "landing_page",
] as const;

export type FirstTouchKey = (typeof FIRST_TOUCH_KEYS)[number];
export type FirstTouch = Partial<Record<FirstTouchKey, string>>;

export const FIRST_TOUCH_STORAGE_KEY = "tap-first-touch";

const MAX_LEN = 200;

/** Keep only known keys with short, non-empty string values. Safe on any input. */
export function parseFirstTouch(raw: unknown): FirstTouch | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const out: FirstTouch = {};
  for (const key of FIRST_TOUCH_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim().slice(0, MAX_LEN);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** Pull the tracked params and the landing path out of a URL. */
export function firstTouchFromUrl(href: string): FirstTouch {
  const url = new URL(href);
  const out: FirstTouch = { landing_page: url.pathname };
  for (const key of FIRST_TOUCH_KEYS) {
    if (key === "landing_page") continue;
    const value = url.searchParams.get(key);
    if (value?.trim()) out[key] = value.trim().slice(0, MAX_LEN);
  }
  return out;
}

/** Read what was saved on the first visit, or undefined when nothing is stored. */
export function readFirstTouch(): FirstTouch | undefined {
  try {
    const raw = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY);
    return raw ? parseFirstTouch(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

/** Save the first touch once. A later visit never overwrites it. */
export function captureFirstTouch(href: string = window.location.href): void {
  try {
    if (window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY)) return;
    window.localStorage.setItem(
      FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify(firstTouchFromUrl(href)),
    );
  } catch {
    // Storage blocked: the join still works, just without attribution.
  }
}
