import { publishAdminEvent } from "@/server/api/eventAdmin";
import { failureResponse } from "@/server/api/eventResult";
import { apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/** Put a draft on the board (idempotent). */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/events/[id]/publish", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;
    const { id } = await ctx.params;
    const result = await publishAdminEvent(admin.prisma, admin.dbUser, id);
    return result.ok
      ? apiOk(result.data)
      : failureResponse(result);
  });
}
