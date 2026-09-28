import { exploreFeedResponse } from "@/server/api/feed";
import { withApiErrors } from "@/server/api/respond";

/**
 * Community / explore feed for mobile infinite scroll.
 * Newest published works first; cursor + take (capped at 24).
 * Following home feed arrives with the Follow chapter — `followingAvailable: false`.
 */
export async function GET(request: Request) {
  return withApiErrors("feed", async () => {
    return exploreFeedResponse(new URL(request.url).searchParams);
  });
}
