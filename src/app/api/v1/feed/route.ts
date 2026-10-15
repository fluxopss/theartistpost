import { exploreFeedResponse, followingFeedResponse } from "@/server/api/feed";
import { withApiErrors } from "@/server/api/respond";

/**
 * Community / explore feed for mobile infinite scroll.
 * Newest published works first; cursor + take (capped at 24).
 * `?kind=following` is the signed-in member's following feed (401 without a
 * session); `followingAvailable` is true on every page.
 */
export async function GET(request: Request) {
  return withApiErrors("feed", async () => {
    const params = new URL(request.url).searchParams;
    if (params.get("kind") === "following") {
      return followingFeedResponse(request, params);
    }
    return exploreFeedResponse(params);
  });
}
