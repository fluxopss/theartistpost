/**
 * Google AdSense, off until configured. Server-only. Turning it on is an env
 * change, never a code change: set the vars in the VPS .env, then rebuild and
 * restart (static pages bake the meta tag at build, like NEXT_PUBLIC_*;
 * /ads.txt reads env per request).
 *
 *   ADSENSE_PUBLISHER_ID  The Artist Post's own AdSense ID ("pub-…" or
 *                         "ca-pub-…"). Setting it links the site to AdSense:
 *                         the google-adsense-account meta tag + /ads.txt.
 *                         Shows no ads by itself.
 *   ADSENSE_AUTO_ADS=1    Also load Google's ad script, which lets the
 *                         AdSense account serve ads (Auto ads or units).
 *                         Leave unset until placements are approved — the
 *                         founder's rule: ads never overwhelm the art.
 *
 * Publisher IDs are public (they appear in every page that runs ads), so they
 * live in env for convenience, not secrecy.
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

/** "ca-pub-…" — the form the meta tag and ad script expect. */
export function adsenseClient(env: Env = process.env): string | null {
  const id = adsensePublisherId(env);
  return id ? `ca-${id}` : null;
}

export function adsenseScriptEnabled(env: Env = process.env): boolean {
  return Boolean(adsenseClient(env)) && env.ADSENSE_AUTO_ADS === "1";
}

export function adsenseScriptSrc(client: string): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
}

/** The single ads.txt line authorizing Google to sell this site's inventory. */
export function adsTxt(env: Env = process.env): string | null {
  const id = adsensePublisherId(env);
  return id ? `google.com, ${id}, DIRECT, ${GOOGLE_TAG_ID}\n` : null;
}
