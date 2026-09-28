import { clearWebSessionCookie } from "@/features/auth/requestSession";
import { writeAuditLog } from "@/features/posts/audit";
import { requireApiSession } from "@/server/api/session";
import { apiOk, withApiErrors } from "@/server/api/respond";

export const runtime = "nodejs";

/**
 * Logout: clear web cookie when present. Bearer tokens are stateless —
 * the client must discard the stored token. Always returns ok.
 */
export async function POST(request: Request) {
  return withApiErrors("auth/logout", async () => {
    const ctx = await requireApiSession(request);
    if (!(ctx instanceof Response)) {
      await writeAuditLog(ctx.prisma, {
        actorId: ctx.dbUser.id,
        action: "auth.logout",
        targetType: "User",
        targetId: ctx.dbUser.id,
      });
    }

    await clearWebSessionCookie();
    return apiOk({ signedOut: true });
  });
}
