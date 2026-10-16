import {
  listAdminPeople,
  parseAdminPeopleQuery,
} from "@/server/api/adminPeople";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/**
 * Admin-only people list from the real User table (never invents rows).
 *
 * Query: `q` (name, @handle or email), `role` (VIEWER|ARTIST|ADMIN),
 * `status` (active|suspended), `pendingArtist=1`, `cursor`, `take`.
 */
export async function GET(request: Request) {
  return withApiErrors("admin/users", async () => {
    const ctx = await requireAdmin(request);
    if (ctx instanceof Response) return ctx;

    const parsed = parseAdminPeopleQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    return apiOk(await listAdminPeople(ctx.prisma, parsed.query));
  });
}
