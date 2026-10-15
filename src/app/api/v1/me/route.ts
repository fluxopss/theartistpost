import { clearWebSessionCookie } from "@/features/auth/requestSession";
import { deleteAccount, patchMeProfile, toMeDTO } from "@/server/api/meProfile";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember, requireApiSession } from "@/server/api/session";

export const runtime = "nodejs";

/**
 * Signed-in customer surface (engine Slice C).
 * Same identity as `/api/v1/auth/me`, plus the community profile (bio,
 * headline, location, chapter, topics, counts), a public artist profile DTO
 * when the account has an ArtistProfile, and explicit permissions.
 */
export async function GET(request: Request) {
  return withApiErrors("me", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    return apiOk(await toMeDTO(ctx.prisma, ctx.dbUser));
  });
}

/** Self-serve profile edits. Never changes role or approval. */
export async function PATCH(request: Request) {
  return withApiErrors("me:patch", async () => {
    const ctx = await requireActiveMember(request);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await patchMeProfile(ctx.prisma, ctx.dbUser, body);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk(result.me);
  });
}

/**
 * In-app account deletion. Allowed for suspended users too — deleting your
 * own data is never gated.
 */
export async function DELETE(request: Request) {
  return withApiErrors("me:delete", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }

    const result = await deleteAccount(ctx.prisma, ctx.dbUser, body);
    if (!result.ok) {
      return apiError(result.code, result.message);
    }

    try {
      await clearWebSessionCookie();
    } catch {
      // Bearer-only clients have no cookie to clear.
    }
    return apiOk({ deleted: true });
  });
}
