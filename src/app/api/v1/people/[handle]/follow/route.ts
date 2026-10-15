import { toggleFollow } from "@/server/api/people";
import { isPlausibleHandle } from "@/server/api/posts";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireCommunityMember } from "@/server/api/safety";

export const runtime = "nodejs";

/** Toggle follow for the signed-in community member. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/people/[handle]/follow">,
) {
  return withApiErrors("people/[handle]/follow", async () => {
    const session = await requireCommunityMember(request);
    if (session instanceof Response) return session;

    const { handle } = await ctx.params;
    if (!isPlausibleHandle(handle)) {
      return apiError("not_found", "No one with that handle.");
    }

    const result = await toggleFollow(
      session.prisma,
      { id: session.dbUser.id, handle: session.dbUser.handle },
      handle,
    );
    if (!result.ok) {
      return apiError(result.code, result.message, {
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({
      following: result.following,
      followerCount: result.followerCount,
    });
  });
}
