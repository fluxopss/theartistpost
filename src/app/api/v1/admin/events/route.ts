import { createAdminEvent, listAdminEvents } from "@/server/api/eventAdmin";
import { failureResponse } from "@/server/api/eventResult";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/** Every managed night (drafts and cancelled too) plus unadopted schedule nights. */
export async function GET(request: Request) {
  return withApiErrors("admin/events", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;
    const result = await listAdminEvents(admin.prisma);
    return result.ok ? apiOk(result.data) : failureResponse(result);
  });
}

/** Create a draft night. Times may be offset-less house time ("2026-10-30T18:00"). */
export async function POST(request: Request) {
  return withApiErrors("admin/events:post", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await createAdminEvent(admin.prisma, admin.dbUser, body);
    return result.ok
      ? apiOk(result.data, { status: 201 })
      : failureResponse(result);
  });
}
