import { getPerson } from "@/server/api/people";
import { isPlausibleHandle } from "@/server/api/posts";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { resolveOptionalSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/** Public profile. 404 when missing, suspended, or blocked either way. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/people/[handle]">,
) {
  return withApiErrors("people/[handle]", async () => {
    const { handle } = await ctx.params;
    if (!isPlausibleHandle(handle)) {
      return apiError("not_found", "No one with that handle.");
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError("upstream_unavailable", "Profiles are temporarily unavailable.");
    }

    const optional = await resolveOptionalSession(request);
    const person = await getPerson(prisma, handle, optional?.dbUser.id ?? null);
    if (!person) return apiError("not_found", "No one with that handle.");

    return apiOk(person);
  });
}
