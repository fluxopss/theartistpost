import { duplicateAdminEvent } from "@/server/api/eventAdmin";
import { failureResponse } from "@/server/api/eventResult";
import { apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/** Copy a night into a new draft. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/events/[id]/duplicate", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;
    const { id } = await ctx.params;
    const result = await duplicateAdminEvent(admin.prisma, admin.dbUser, id);
    return result.ok
      ? apiOk(result.data, { status: 201 })
      : failureResponse(result);
  });
}
