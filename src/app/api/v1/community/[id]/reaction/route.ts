import { clearReaction, setReaction } from "@/server/api/community";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireCommunityMember } from "@/server/api/safety";

export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Set (or change) the signed-in member's one reaction on a post. */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/v1/community/[id]/reaction">,
) {
  return withApiErrors("community/[id]/reaction:set", async () => {
    const session = await requireCommunityMember(request);
    if (session instanceof Response) return session;

    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return apiError("not_found", "That post is gone.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await setReaction(session.prisma, session.dbUser, id, body);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }
    return apiOk(result.state);
  });
}

/** Take the reaction back. */
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/v1/community/[id]/reaction">,
) {
  return withApiErrors("community/[id]/reaction:clear", async () => {
    const session = await requireCommunityMember(request);
    if (session instanceof Response) return session;

    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return apiError("not_found", "That post is gone.");

    const result = await clearReaction(session.prisma, session.dbUser, id);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        retryAfterSec: result.retryAfterSec,
      });
    }
    return apiOk(result.state);
  });
}
