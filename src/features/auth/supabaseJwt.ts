import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type SupabaseAccessClaims = {
  supabaseAuthId: string;
  email: string;
  /** Optional display name from user_metadata / claims. */
  name: string | null;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUrlCached: string | null = null;

function supabaseUrl(): string | null {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export function getSupabaseJwksUrl(): string | null {
  const explicit = process.env.SUPABASE_JWKS_URL?.trim();
  if (explicit) return explicit;
  const base = supabaseUrl();
  return base ? `${base}/auth/v1/.well-known/jwks.json` : null;
}

function getJwks(): ReturnType<typeof createRemoteJWKSet> | null {
  const url = getSupabaseJwksUrl();
  if (!url) return null;
  if (!jwks || jwksUrlCached !== url) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksUrlCached = url;
  }
  return jwks;
}

/** True when the bearer looks like a compact JWT (3 segments), not house HMAC (2). */
export function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function emailFromPayload(payload: JWTPayload): string | null {
  if (typeof payload.email === "string" && payload.email.includes("@")) {
    return payload.email.trim().toLowerCase();
  }
  const meta = payload.user_metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const email = (meta as Record<string, unknown>).email;
    if (typeof email === "string" && email.includes("@")) {
      return email.trim().toLowerCase();
    }
  }
  return null;
}

function nameFromPayload(payload: JWTPayload): string | null {
  const meta = payload.user_metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>;
    for (const key of ["full_name", "name", "display_name"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length >= 2) {
        return value.trim().slice(0, 80);
      }
    }
  }
  return null;
}

/**
 * Verify a Supabase Auth access token via JWKS.
 * Returns null when JWKS is unset, token is not a JWT, or verification fails.
 */
export async function verifySupabaseAccessToken(
  token: string,
): Promise<SupabaseAccessClaims | null> {
  if (!looksLikeJwt(token)) return null;
  const keys = getJwks();
  const base = supabaseUrl();
  if (!keys || !base) return null;

  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: `${base}/auth/v1`,
      audience: "authenticated",
    });

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = emailFromPayload(payload);
    if (!sub || !email) return null;

    return {
      supabaseAuthId: sub,
      email,
      name: nameFromPayload(payload),
    };
  } catch {
    return null;
  }
}

/** Test helper — resets cached JWKS between vitest cases. */
export function resetSupabaseJwksCacheForTests(): void {
  jwks = null;
  jwksUrlCached = null;
}
