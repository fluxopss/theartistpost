/**
 * ads.txt only. The site carries no AdSense tag, meta tag or ad script: Google
 * Ad Grants policy says "Don't display AdSense ads on your website". Whether
 * /ads.txt stays is the owner's call; setting ADSENSE_PUBLISHER_ID serves it.
 * Publisher IDs are public, so they live in env for convenience, not secrecy.
 */

type Env = Record<string, string | undefined>;

/** Google's certification authority ID for ads.txt (same for every publisher). */
const GOOGLE_TAG_ID = "f08c47fec0942fa0";

const PUBLISHER_ID = /^(?:ca-)?pub-(\d{10,20})$/;

/** Normalized "pub-1234567890123456", or null when unset or malformed. */
export function adsensePublisherId(env: Env = process.env): string | null {
  const raw = env.ADSENSE_PUBLISHER_ID?.trim();
  if (!raw) return null;
  const match = PUBLISHER_ID.exec(raw);
  return match ? `pub-${match[1]}` : null;
}

/** The single ads.txt line authorizing Google to sell this site's inventory. */
export function adsTxt(env: Env = process.env): string | null {
  const id = adsensePublisherId(env);
  return id ? `google.com, ${id}, DIRECT, ${GOOGLE_TAG_ID}\n` : null;
}
