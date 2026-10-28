/**
 * The caller's address, for rate limits only.
 *
 * Production sits behind Traefik (deploy/traefik-theartistpost.yml), reached
 * directly (no CDN in front). Traefik APPENDS the address it saw to
 * x-forwarded-for, so the LAST value is the one a client cannot forge; the
 * first value is whatever the client chose to send. x-real-ip (also set by
 * Traefik) is the fallback.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}
