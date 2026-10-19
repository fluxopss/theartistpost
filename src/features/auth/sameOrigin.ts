import { normalizeHost, type CanonicalEnv } from "@/shared/lib/canonicalHost";

/**
 * Defense in depth for the browser session cookie. The website now calls the
 * same /api/v1 write routes as the app, so a request that rides `tap_session`
 * and changes something must come from one of our own hosts. SameSite=lax
 * already blocks most cross-site cookie POSTs; this closes the rest.
 *
 * Only the cookie path uses this. Bearer requests (the app) never carry the
 * cookie and are not checked.
 */
export function isSameOriginWrite(
  input: { method: string; origin: string | null; referer: string | null; host: string | null },
  env: CanonicalEnv,
): boolean {
  const method = input.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const allowed = new Set(
    [env.canonicalHost, ...(env.legacyHosts ?? "").split(","), input.host]
      .map((h) => normalizeHost(h))
      .filter(Boolean),
  );

  const source = input.origin ?? input.referer;
  const sourceHost = hostOf(source);
  return sourceHost !== null && allowed.has(sourceHost);
}

function hostOf(raw: string | null): string | null {
  if (!raw || raw === "null") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return normalizeHost(url.host) || null;
  } catch {
    return null;
  }
}
