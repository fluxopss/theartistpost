import { listEventRsvps } from "@/server/api/eventAdmin";
import { failureResponse } from "@/server/api/eventResult";
import { apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/** Attendee list. `?format=csv` downloads a spreadsheet-safe CSV. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApiErrors("admin/events/[id]/rsvps", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;
    const { id } = await ctx.params;
    const csv = new URL(request.url).searchParams.get("format") === "csv";
    const result = await listEventRsvps(admin.prisma, admin.dbUser, id, { csv });
    if (!result.ok) return failureResponse(result);
    if (result.csv !== undefined) {
      return new Response(result.csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return apiOk(result.data);
  });
}
