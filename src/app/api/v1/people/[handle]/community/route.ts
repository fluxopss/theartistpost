import { listPersonCommunity } from "@/server/api/people";
import { isPlausibleHandle } from "@/server/api/posts";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { resolveOptionalSession } from "@/server/api/session";
import { parsePageParams } from "@/server/api/validation";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/** A person's top-level community posts, newest first. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/people/[handle]/community">,
) {
  return withApiErrors("people/[handle]/community", async () => {
    const { handle } = await ctx.params;
    if (!isPlausibleHandle(handle)) {
      return apiError("not_found", "No one with that handle.");
    }

    const parsed = parsePageParams(new URL(request.url).searchParams, {
      defaultTake: 20,
      maxTake: 30,
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
    const result = await listPersonCommunity(
      prisma,
      handle,
      parsed.page,
      optional ? { id: optional.dbUser.id, role: optional.dbUser.role } : null,
    );
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk(result.page);
  });
}
