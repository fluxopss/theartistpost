import { applyAdminPersonAction } from "@/server/api/adminPeople";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * One audited admin action on one person (ADMIN only).
 * Body: `{ action, reason, role? }` — `reason` is required for every action.
 * Actions: set_role, approve_artist, revoke_artist, suspend, unsuspend,
 * send_sign_in_help.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/admin/users/[id]/actions">,
) {
  return withApiErrors("admin/users/[id]/actions", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    const { id } = await ctx.params;
    if (!USER_ID_RE.test(id)) {
      return apiError("not_found", "That account was not found.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await applyAdminPersonAction(
      admin.prisma,
      admin.dbUser,
      id,
      body,
    );
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }
    return apiOk({ action: result.action, user: result.user });
  });
}
