import { NextResponse, type NextRequest } from "next/server";
import { canonicalLinkHeader, canonicalRedirectTarget } from "@/shared/lib/canonicalHost";

/**
 * Domain cutover: 301 legacy/www page requests to the canonical host, and add
 * a per-page rel=canonical Link header on the canonical host.
 * Inert until CANONICAL_HOST is set. API, uploads and build assets are never
 * redirected (see canonicalHost.ts).
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const env = {
    canonicalHost: process.env.CANONICAL_HOST,
    legacyHosts: process.env.LEGACY_HOSTS,
  };
  const target = canonicalRedirectTarget(
    {
      host,
      method: request.method,
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    },
    env,
  );
  if (target) return NextResponse.redirect(target, 301);

  const response = NextResponse.next();
  const link = canonicalLinkHeader({ host, pathname: request.nextUrl.pathname }, env);
  // append, never set: Next sends font/CSS preload hints in the same header.
  if (link) response.headers.append("Link", link);
  return response;
}

export const config = {
  // Skip static build assets and API at the matcher level too (cheap path).
  matcher: ["/((?!_next/|api/|uploads/|\\.well-known/|favicon\\.ico).*)"],
};
