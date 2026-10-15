import { deleteCommunityPost, getCommunityThread } from "@/server/api/community";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember, resolveOptionalSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** A post and its replies (oldest first, up to 100). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/community/[id]">,
) {
  return withApiErrors("community/[id]", async () => {
    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return apiError("not_found", "That post is gone.");

    const prisma = getPrisma();
    if (!prisma) {
      return apiError("upstream_unavailable", "The board is temporarily unavailable.");
    }

    const optional = await resolveOptionalSession(request);
    const result = await getCommunityThread(
      prisma,
      id,
      optional ? { id: optional.dbUser.id, role: optional.dbUser.role } : null,
    );
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk({ post: result.post, replies: result.replies });
  });
}

/** Author or ADMIN removes a post (and the replies under it). */
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/v1/community/[id]">,
) {
  return withApiErrors("community/[id]:delete", async () => {
    const session = await requireActiveMember(request);
    if (session instanceof Response) return session;

    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return apiError("not_found", "That post is gone.");

    const result = await deleteCommunityPost(session.prisma, session.dbUser, id);
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk({ deleted: true });
  });
}
