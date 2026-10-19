/**
 * Domain cutover helper (theartistpost.fluxlab.agency -> theartistpost.org).
 *
 * Inert until CANONICAL_HOST is set on the live host, so this can ship before
 * DNS moves. Once set:
 *  - page requests on a legacy host (or www) get one 301 to the canonical host,
 *    path and query preserved;
 *  - /api, /uploads, /_next and /.well-known are NEVER redirected, because the
 *    installed app builds call https://theartistpost.fluxlab.agency/api/... and
 *    a 301 would turn their POSTs into GETs and drop the Authorization header.
 *    Old share links to uploaded images keep working for the same reason.
 *  - only GET/HEAD are redirected; every other method passes through.
 */

const NEVER_REDIRECT = ["/api/", "/uploads/", "/_next/", "/.well-known/"];
const NEVER_REDIRECT_EXACT = ["/api", "/uploads", "/sw.js", "/manifest.webmanifest"];

export type CanonicalEnv = {
  /** e.g. "theartistpost.org". Empty or unset = feature off. */
  canonicalHost?: string;
  /** Comma-separated legacy hosts, e.g. "theartistpost.fluxlab.agency". */
  legacyHosts?: string;
};

export function normalizeHost(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function isRedirectExemptPath(pathname: string): boolean {
  if (NEVER_REDIRECT_EXACT.includes(pathname)) return true;
  return NEVER_REDIRECT.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Returns the absolute URL to 301 to, or null to serve the request as-is.
 */
export function canonicalRedirectTarget(
  input: { host: string | null; method: string; pathname: string; search: string },
  env: CanonicalEnv,
): string | null {
  const canonical = normalizeHost(env.canonicalHost);
  if (!canonical) return null;

  const method = input.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;

  const host = normalizeHost(input.host);
  if (!host || host === canonical) return null;

  const legacy = new Set(
    (env.legacyHosts ?? "")
      .split(",")
      .map((h) => normalizeHost(h))
      .filter(Boolean),
  );
  const isWww = host === `www.${canonical}`;
  if (!isWww && !legacy.has(host)) return null;

  if (isRedirectExemptPath(input.pathname)) return null;

  return `https://${canonical}${input.pathname}${input.search}`;
}

/**
 * `Link: <https://canonical/path>; rel="canonical"` for a page served on the
 * canonical host. Search engines read rel=canonical from this header the same
 * as from a <link> tag, and the proxy knows the exact path (a root-layout
 * metadata canonical would point every page at "/"). Query strings are left
 * out so filter and tracking variants fold into one page. Null when the
 * feature is off, for other hosts, and for non-page paths.
 */
export function canonicalLinkHeader(
  input: { host: string | null; pathname: string },
  env: CanonicalEnv,
): string | null {
  const canonical = normalizeHost(env.canonicalHost);
  if (!canonical) return null;
  if (normalizeHost(input.host) !== canonical) return null;
  if (isRedirectExemptPath(input.pathname)) return null;
  return `<https://${canonical}${input.pathname}>; rel="canonical"`;
}
