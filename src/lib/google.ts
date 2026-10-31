/**
 * Google Search Console + Google Analytics 4, both off until configured.
 * Turning either on is an env change on the VPS, then rebuild + restart.
 *
 *   GOOGLE_SITE_VERIFICATION      The token from Search Console > Settings >
 *                                 Ownership verification > HTML tag (the
 *                                 content="…" value only). Renders
 *                                 <meta name="google-site-verification">.
 *                                 Server-only, read at build.
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID The GA4 web stream's "G-XXXXXXXXXX".
 *                                 Baked into the client bundle at build.
 *                                 Loads gtag.js site-wide (analytics may run
 *                                 everywhere; ad scripts may not — see
 *                                 lib/adsense.ts).
 *
 * Neither value is a secret: the verification token is a public ownership
 * claim and the measurement ID ships in every page's JavaScript.
 */

type Env = Record<string, string | undefined>;

/** Accepts the bare token or the whole <meta …> tag pasted from Search Console. */
export function googleSiteVerification(env: Env = process.env): string | null {
  const raw = env.GOOGLE_SITE_VERIFICATION?.trim();
  if (!raw) return null;
  const fromTag = /content=["']([^"']+)["']/.exec(raw);
  const token = (fromTag ? fromTag[1] : raw).trim();
  return /^[A-Za-z0-9_-]{20,}$/.test(token) ? token : null;
}

const MEASUREMENT_ID = /^G-[A-Z0-9]{6,14}$/;

/** "G-…" when set and well-formed, else null (GA stays off). */
export function gaMeasurementId(env: Env = process.env): string | null {
  const raw = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim().toUpperCase();
  if (!raw) return null;
  return MEASUREMENT_ID.test(raw) ? raw : null;
}
