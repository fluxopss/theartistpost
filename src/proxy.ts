import { NextResponse, type NextRequest } from "next/server";
import { canonicalRedirectTarget } from "@/shared/lib/canonicalHost";

/**
 * Domain cutover: 301 legacy/www page requests to the canonical host.
 * Inert until CANONICAL_HOST is set. API, uploads and build assets are never
 * redirected (see canonicalHost.ts).
 */
export function proxy(request: NextRequest) {
  const target = canonicalRedirectTarget(
    {
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
      method: request.method,
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    },
    {
      canonicalHost: process.env.CANONICAL_HOST,
      legacyHosts: process.env.LEGACY_HOSTS,
    },
  );
  if (target) return NextResponse.redirect(target, 301);
  return NextResponse.next();
}

export const config = {
  // Skip static build assets and API at the matcher level too (cheap path).
  matcher: ["/((?!_next/|api/|uploads/|\\.well-known/|favicon\\.ico).*)"],
};
