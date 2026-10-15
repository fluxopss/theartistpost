import { toggleSupport } from "@/server/api/community";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireCommunityMember } from "@/server/api/safety";

export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Toggle Support (the one-tap sparkle) on a post. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/community/[id]/support">,
) {
  return withApiErrors("community/[id]/support", async () => {
    const session = await requireCommunityMember(request);
    if (session instanceof Response) return session;

    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return apiError("not_found", "That post is gone.");

    const result = await toggleSupport(session.prisma, session.dbUser, id);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({
      supported: result.supported,
      supportCount: result.supportCount,
    });
  });
}
