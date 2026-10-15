import { listReactors, parseReactorsQuery } from "@/server/api/community";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { resolveOptionalSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Who reacted to a post, newest first (optionally one emoji). Public read. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/community/[id]/reactions">,
) {
  return withApiErrors("community/[id]/reactions", async () => {
    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return apiError("not_found", "That post is gone.");

    const query = parseReactorsQuery(new URL(request.url).searchParams);
    if (!query.ok) {
      return apiError("validation_failed", query.message, {
        fields: query.fields,
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError(
        "upstream_unavailable",
        "The board is temporarily unavailable.",
      );
    }

    const optional = await resolveOptionalSession(request);
    const result = await listReactors(
      prisma,
      id,
      query.page,
      query.reaction,
      optional ? { id: optional.dbUser.id, role: optional.dbUser.role } : null,
    );
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk(result.page);
  });
}
