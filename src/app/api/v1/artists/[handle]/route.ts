import { getArtistByHandle } from "@/features/posts/queries";
import { toArtistProfileDTO, toPostSummaryDTO } from "@/server/api/dto";
import { isPlausibleHandle } from "@/server/api/posts";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";

/** Approved artists only — unapproved or unknown handles are a 404. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/v1/artists/[handle]">,
) {
  return withApiErrors("artists/[handle]", async () => {
    const { handle } = await ctx.params;
    const artist = isPlausibleHandle(handle)
      ? await getArtistByHandle(handle)
      : null;
    if (!artist) {
      return apiError("not_found", "No approved artist has that handle.");
    }
    return apiOk(
      {
        artist: toArtistProfileDTO(artist),
        posts: artist.posts.map(toPostSummaryDTO),
      },
      { cache: CACHE.minute },
    );
  });
}
