import {
  clearSessionCookie,
  decodeSessionToken,
  encodeSessionToken,
  readSessionFromCookie,
  SESSION_MAX_AGE,
} from "@/features/auth/sessionCookie";
import { isSameOriginWrite } from "@/features/auth/sameOrigin";
import { getAuthSecret } from "@/features/auth/secret";
import {
  looksLikeJwt,
  verifySupabaseAccessToken,
  type SupabaseAccessClaims,
} from "@/features/auth/supabaseJwt";
import type { SessionUser } from "@/features/auth/types";

export { SESSION_MAX_AGE };

export type IssuedSession = {
  token: string;
  expiresAt: string;
  expiresInSec: number;
};

export type ResolvedRequestAuth =
  | { kind: "hmac"; session: SessionUser }
  | { kind: "supabase"; claims: SupabaseAccessClaims }
  | { kind: "none" };

/** Issue a mobile-storable session token (same HMAC format as tap_session). */
export function issueSessionToken(
  user: SessionUser,
  maxAgeSec = SESSION_MAX_AGE,
): IssuedSession | null {
  const secret = getAuthSecret();
  if (!secret) return null;
  const token = encodeSessionToken(user, secret, maxAgeSec);
  const expiresAt = new Date(Date.now() + maxAgeSec * 1000).toISOString();
  return { token, expiresAt, expiresInSec: maxAgeSec };
}

export function parseBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  return match?.[1] ?? null;
}

/**
 * Resolve auth material for API routes: Supabase JWT, house HMAC Bearer, or cookie.
 * Does not create Prisma users — callers link via `/auth/link` or look up by claims.
 */
export async function resolveRequestAuth(
  request: Request,
): Promise<ResolvedRequestAuth> {
  const bearer = parseBearerToken(request);
  if (bearer) {
    if (looksLikeJwt(bearer)) {
      const claims = await verifySupabaseAccessToken(bearer);
      if (claims) return { kind: "supabase", claims };
      return { kind: "none" };
    }
    const secret = getAuthSecret();
    if (!secret) return { kind: "none" };
    const session = decodeSessionToken(bearer, secret);
    if (session) return { kind: "hmac", session };
    return { kind: "none" };
  }

  const cookieSession = await readSessionFromCookie();
  if (!cookieSession) return { kind: "none" };

  const sameOrigin = isSameOriginWrite(
    {
      method: request.method,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    },
    { canonicalHost: process.env.CANONICAL_HOST, legacyHosts: process.env.LEGACY_HOSTS },
  );
  if (!sameOrigin) {
    console.warn("[auth] cross-origin cookie write refused", {
      method: request.method,
      originHost: safeHost(request.headers.get("origin") ?? request.headers.get("referer")),
    });
    return { kind: "none" };
  }
  return { kind: "hmac", session: cookieSession };
}

function safeHost(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return "unparseable";
  }
}

/**
 * Resolve a house HMAC session (Bearer or cookie).
 * Supabase JWTs are not mapped here — use `resolveRequestAuth` + Prisma link.
 */
export async function resolveSessionFromRequest(
  request: Request,
): Promise<SessionUser | null> {
  const auth = await resolveRequestAuth(request);
  return auth.kind === "hmac" ? auth.session : null;
}

export async function clearWebSessionCookie(): Promise<void> {
  try {
    await clearSessionCookie();
  } catch {
    // Bearer-only clients and tests have no cookie jar to clear.
  }
}
