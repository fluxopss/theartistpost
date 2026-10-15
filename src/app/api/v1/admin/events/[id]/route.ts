import {
  getAdminEvent,
  updateAdminEvent,
} from "@/server/api/eventAdmin";
import { failureResponse } from "@/server/api/eventResult";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/events/[id]", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;
    const { id } = await ctx.params;
    const result = await getAdminEvent(admin.prisma, id);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}

/** Partial update. Time/place changes to a published night notify RSVPs in-app. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/events/[id]:patch", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const { id } = await ctx.params;
    const result = await updateAdminEvent(admin.prisma, admin.dbUser, id, body);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}
