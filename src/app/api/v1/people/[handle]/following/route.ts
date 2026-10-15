import { listFollowing, PEOPLE_DEFAULT_TAKE, PEOPLE_MAX_TAKE } from "@/server/api/people";
import { isPlausibleHandle } from "@/server/api/posts";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { resolveOptionalSession } from "@/server/api/session";
import { parsePageParams } from "@/server/api/validation";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/** Public following list (people the viewer has blocked, or who blocked them, are omitted). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/people/[handle]/following">,
) {
  return withApiErrors("people/[handle]/following", async () => {
    const { handle } = await ctx.params;
    if (!isPlausibleHandle(handle)) {
      return apiError("not_found", "No one with that handle.");
    }

    const parsed = parsePageParams(new URL(request.url).searchParams, {
      defaultTake: PEOPLE_DEFAULT_TAKE,
      maxTake: PEOPLE_MAX_TAKE,
    });
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError("upstream_unavailable", "Profiles are temporarily unavailable.");
    }

    const optional = await resolveOptionalSession(request);
    const result = await listFollowing(
      prisma,
      handle,
      parsed.page,
      optional?.dbUser.id ?? null,
    );
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk(result.page);
  });
}
