import { listReportsForAdmin, parseAdminReportsQuery } from "@/server/api/safety";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/** Moderation queue: one row per reported target with its report count. */
export async function GET(request: Request) {
  return withApiErrors("admin/reports", async () => {
    const ctx = await requireAdmin(request);
    if (ctx instanceof Response) return ctx;

    const parsed = parseAdminReportsQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    return apiOk(await listReportsForAdmin(ctx.prisma, parsed.query));
  });
}
