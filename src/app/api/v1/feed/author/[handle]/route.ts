import { authorTimelineResponse } from "@/server/api/feed";
import { withApiErrors } from "@/server/api/respond";

/**
 * Author timeline under the feed prefix (engine Slice B).
 * Same payload as `/api/v1/artists/[handle]/timeline`.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/feed/author/[handle]">,
) {
  return withApiErrors("feed/author/[handle]", async () => {
    const { handle } = await ctx.params;
    return authorTimelineResponse(
      handle,
      new URL(request.url).searchParams,
    );
  });
}
