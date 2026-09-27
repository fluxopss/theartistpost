import { getPosts } from "@/features/posts/queries";
import { toPostSummaryDTO } from "@/server/api/dto";
import { parsePostsQuery } from "@/server/api/posts";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";

/** Public wall, newest first. Same catalog filter as the website. */
export async function GET(request: Request) {
  return withApiErrors("posts", async () => {
    const parsed = parsePostsQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    // No database configured → getPosts returns an empty page, not an error.
    const { items, nextCursor } = await getPosts(parsed.query);
    return apiOk(
      { items: items.map(toPostSummaryDTO), nextCursor },
      { cache: CACHE.minute },
    );
  });
}
