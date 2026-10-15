import { isPlausibleHandle } from "@/server/api/posts";
import { unblockUser } from "@/server/api/safety";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember } from "@/server/api/session";

export const runtime = "nodejs";

/** Unblock someone by handle. */
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/v1/blocks/[handle]">,
) {
  return withApiErrors("blocks/[handle]:delete", async () => {
    const session = await requireActiveMember(request);
    if (session instanceof Response) return session;

    const { handle } = await ctx.params;
    if (!isPlausibleHandle(handle)) {
      return apiError("not_found", "No one with that handle.");
    }

    const result = await unblockUser(session.prisma, session.dbUser, handle);
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk({ blocked: false });
  });
}
