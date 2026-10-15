import { getPostBySlug } from "@/features/posts/queries";
import { POST_DETAIL_MAX_COMMENTS, toPostDetailDTO } from "@/server/api/dto";
import { isPlausibleSlug } from "@/server/api/posts";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";
import { blockedIdsFor } from "@/server/api/safety";
import { resolveOptionalSession } from "@/server/api/session";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/posts/[slug]">,
) {
  return withApiErrors("posts/[slug]", async () => {
    const { slug } = await ctx.params;
    const optional = isPlausibleSlug(slug)
      ? await resolveOptionalSession(request)
      : null;
    const blocked = optional
      ? [...(await blockedIdsFor(optional.prisma, optional.dbUser.id))]
      : [];
    const post = isPlausibleSlug(slug)
      ? await getPostBySlug(slug, {
          commentOrder: "desc",
          commentTake: POST_DETAIL_MAX_COMMENTS,
          excludeCommentAuthorIds: blocked,
        })
      : null;
    if (!post || (post.authorId && blocked.includes(post.authorId))) {
      return apiError("not_found", "That post is not on the wall.");
    }
    return apiOk(toPostDetailDTO(post), {
      cache: optional ? CACHE.none : CACHE.minute,
    });
  });
}
