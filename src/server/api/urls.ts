/** Public origin native clients should resolve relative paths against. */
export const FALLBACK_SITE_URL = "https://theartistpost.fluxlab.agency";

/**
 * Origin from NEXT_PUBLIC_SITE_URL (read per call so tests and env changes
 * apply), falling back to the production host when unset or malformed.
 */
export function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.origin;
      }
    } catch {
      // fall through to the fallback host
    }
  }
  return FALLBACK_SITE_URL;
}

/**
 * Absolute http(s) URL for a media or brand path (`/uploads/…`, `/brand/…`,
 * `/merch/…`). Already-absolute http(s) URLs pass through unchanged.
 * Returns null for empty values and any non-http(s) scheme.
 */
export function absoluteUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed, `${siteOrigin()}/`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url.toString();
}

/**
 * An outbound link someone typed (social profile, website). Must already be
 * an absolute http(s) URL — never resolved against our own origin.
 */
export function externalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
