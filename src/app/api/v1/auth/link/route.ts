import { linkSupabaseUser } from "@/features/auth/linkSupabaseUser";
import { checkRateLimit } from "@/features/auth/rateLimit";
import {
  issueSessionToken,
  parseBearerToken,
  type IssuedSession,
} from "@/features/auth/requestSession";
import { writeSessionCookie } from "@/features/auth/sessionCookie";
import {
  looksLikeJwt,
  verifySupabaseAccessToken,
} from "@/features/auth/supabaseJwt";
import { readJsonBody, type AuthSessionDTO } from "@/server/api/auth";
import {
  apiError,
  apiOk,
  clientIp,
  withApiErrors,
} from "@/server/api/respond";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/**
 * Link a verified Supabase Auth access token to a Prisma User.
 * Bearer must be a Supabase JWT (JWKS). Optionally opens member/artist doors,
 * or `door: "return"` for an existing house email. Also writes web cookie.
 */
export async function POST(request: Request) {
  return withApiErrors("auth/link", async () => {
    const bearer = parseBearerToken(request);
    if (!bearer || !looksLikeJwt(bearer)) {
      return apiError(
        "unauthorized",
        "Send a Supabase access token as Authorization: Bearer.",
      );
    }

    const claims = await verifySupabaseAccessToken(bearer);
    if (!claims) {
      return apiError(
        "unauthorized",
        "That Supabase session is invalid or expired.",
      );
    }

    const json = await readJsonBody(request);
    if (!json.ok) {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const ip = clientIp(request);
    const limit = checkRateLimit(`v1:auth:link:${ip}`, {
      windowMs: 60_000,
      max: 12,
    });
    if (!limit.ok) {
      return apiError("rate_limited", "Too many attempts. Try again in a bit.", {
        retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError(
        "upstream_unavailable",
        "Accounts are temporarily unavailable.",
      );
    }

    const linked = await linkSupabaseUser(prisma, claims, json.body);
    if (!linked.ok) {
      if (linked.code === "validation") {
        return apiError("validation_failed", linked.error, {
          fields: linked.fields,
        });
      }
      if (linked.code === "conflict") {
        return apiError("conflict", linked.error);
      }
      if (linked.code === "not_found") {
        return apiError("not_found", linked.error);
      }
      return apiError("upstream_unavailable", linked.error);
    }

    // Web SSR / server actions still read tap_session until fully JWT-native.
    await writeSessionCookie(linked.user);

    const issued: IssuedSession | null = issueSessionToken(linked.user);
    const data: AuthSessionDTO = {
      token: issued?.token ?? bearer,
      expiresAt:
        issued?.expiresAt ??
        new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      expiresInSec: issued?.expiresInSec ?? 3600,
      user: linked.authUser,
      ...(linked.pendingApproval ? { pendingApproval: true } : {}),
    };

    return apiOk(data, { status: linked.created ? 201 : 200 });
  });
}
