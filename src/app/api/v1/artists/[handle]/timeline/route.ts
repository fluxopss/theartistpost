import { authorTimelineResponse } from "@/server/api/feed";
import { withApiErrors } from "@/server/api/respond";

/** Chronological published works for an approved artist (cursor/take). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/v1/artists/[handle]/timeline">,
) {
  return withApiErrors("artists/[handle]/timeline", async () => {
    const { handle } = await ctx.params;
    return authorTimelineResponse(
      handle,
      new URL(request.url).searchParams,
    );
  });
}
