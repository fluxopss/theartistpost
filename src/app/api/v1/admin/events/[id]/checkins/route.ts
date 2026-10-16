import { listEventCheckIns } from "@/server/api/eventAdmin";
import { failureResponse } from "@/server/api/eventResult";
import { apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/** Who is checked in, with a live count. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/events/[id]/checkins", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;
    const { id } = await ctx.params;
    const result = await listEventCheckIns(admin.prisma, id);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}
