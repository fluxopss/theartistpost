import {
  clearSessionCookie,
  decodeSessionToken,
  encodeSessionToken,
  readSessionFromCookie,
  SESSION_MAX_AGE,
} from "@/features/auth/sessionCookie";
import { getAuthSecret } from "@/features/auth/secret";
import type { SessionUser } from "@/features/auth/types";

export { SESSION_MAX_AGE };

export type IssuedSession = {
  token: string;
  expiresAt: string;
  expiresInSec: number;
};

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
 * Resolve session for API routes: Authorization Bearer first, then cookie.
 * Keeps web cookie sessions working unchanged.
 */
export async function resolveSessionFromRequest(
  request: Request,
): Promise<SessionUser | null> {
  const secret = getAuthSecret();
  if (!secret) return null;

  const bearer = parseBearerToken(request);
  if (bearer) {
    return decodeSessionToken(bearer, secret);
  }

  return readSessionFromCookie();
}

export async function clearWebSessionCookie(): Promise<void> {
  try {
    await clearSessionCookie();
  } catch {
    // Bearer-only clients and tests have no cookie jar to clear.
  }
}
