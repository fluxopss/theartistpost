import { deleteCommentForUser } from "@/server/api/engagement";
import { isPlausibleSlug } from "@/server/api/posts";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireApiSession } from "@/server/api/session";

export const runtime = "nodejs";

const COMMENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Author or ADMIN removes a note from a public post. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  return withApiErrors("posts/[slug]/comments/[id]:delete", async () => {
    const session = await requireApiSession(request);
    if (session instanceof Response) return session;

    const { slug, id } = await context.params;
    if (!isPlausibleSlug(slug) || !COMMENT_ID_RE.test(id)) {
      return apiError("not_found", "That comment is gone.");
    }

    const result = await deleteCommentForUser(
      session.prisma,
      session.dbUser,
      slug,
      id,
    );
    if (!result.ok) {
      return apiError(result.code, result.message);
    }

    return apiOk({ deleted: true as const });
  });
}
