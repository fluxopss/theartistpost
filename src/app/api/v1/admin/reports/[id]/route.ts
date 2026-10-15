import { actOnReport } from "@/server/api/safety";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Moderator decision: hide the content, dismiss the reports, or suspend the owner. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/v1/admin/reports/[id]">,
) {
  return withApiErrors("admin/reports/[id]:patch", async () => {
    const session = await requireAdmin(request);
    if (session instanceof Response) return session;

    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return apiError("not_found", "That report is gone.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await actOnReport(session.prisma, session.dbUser, id, body);
    if (!result.ok) {
      return apiError(result.code, result.message, { fields: result.fields });
    }

    return apiOk(result.report);
  });
}
