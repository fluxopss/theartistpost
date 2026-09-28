import { getArtistTimeline } from "@/features/posts/queries";
import { toArtistProfileDTO, toPostSummaryDTO } from "@/server/api/dto";
import { isPlausibleHandle, parsePostsQuery } from "@/server/api/posts";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";

/**
 * Public artist profile + first page of published works.
 * Unapproved / unknown handles → 404. Paginate with cursor/take; `posts`
 * mirrors `items` for older mobile clients.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/artists/[handle]">,
) {
  return withApiErrors("artists/[handle]", async () => {
    const { handle } = await ctx.params;
    if (!isPlausibleHandle(handle)) {
      return apiError("not_found", "No approved artist has that handle.");
    }

    const parsed = parsePostsQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    const page = await getArtistTimeline(handle, parsed.query);
    if (!page) {
      return apiError("not_found", "No approved artist has that handle.");
    }

    const items = page.items.map(toPostSummaryDTO);
    return apiOk(
      {
        artist: {
          ...toArtistProfileDTO(page.artist),
          postCount: page.artist.postCount,
        },
        posts: items,
        items,
        nextCursor: page.nextCursor,
        postCount: page.artist.postCount,
      },
      { cache: CACHE.minute },
    );
  });
}
