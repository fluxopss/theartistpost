import { getPostBySlug } from "@/features/posts/queries";
import { POST_DETAIL_MAX_COMMENTS, toPostDetailDTO } from "@/server/api/dto";
import { isPlausibleSlug } from "@/server/api/posts";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/v1/posts/[slug]">,
) {
  return withApiErrors("posts/[slug]", async () => {
    const { slug } = await ctx.params;
    const post = isPlausibleSlug(slug)
      ? await getPostBySlug(slug, {
          commentOrder: "desc",
          commentTake: POST_DETAIL_MAX_COMMENTS,
        })
      : null;
    if (!post) {
      return apiError("not_found", "That post is not on the wall.");
    }
    return apiOk(toPostDetailDTO(post), { cache: CACHE.minute });
  });
}
