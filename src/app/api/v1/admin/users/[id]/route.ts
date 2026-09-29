import {
  getAdminUserById,
  patchAdminUser,
} from "@/server/api/adminUsers";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

const USER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Admin customer detail — real User row only. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/users/[id]", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    const { id } = await ctx.params;
    if (!USER_ID_RE.test(id)) {
      return apiError("not_found", "That account was not found.");
    }

    const user = await getAdminUserById(admin.prisma, id);
    if (!user) {
      return apiError("not_found", "That account was not found.");
    }

    return apiOk({ user });
  });
}

/**
 * Admin role / artist approval actions.
 * Body: `{ role?: VIEWER|ARTIST|ADMIN, artistApproved?: boolean }`
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/users/[id]:patch", async () => {
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

    const result = await patchAdminUser(
      admin.prisma,
      admin.dbUser,
      id,
      body,
    );
    if (!result.ok) {
      return apiError(result.code, result.message, { fields: result.fields });
    }

    return apiOk({ user: result.user });
  });
}
