import { clearWallReaction, setWallReaction } from "@/server/api/engagement";
import { isPlausibleSlug } from "@/server/api/posts";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember } from "@/server/api/session";

export const runtime = "nodejs";

/** Set (or change) the signed-in member's one reaction on a Wall post. */
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  return withApiErrors("posts/[slug]/reaction:set", async () => {
    const session = await requireActiveMember(request);
    if (session instanceof Response) return session;

    const { slug } = await ctx.params;
    if (!isPlausibleSlug(slug)) {
      return apiError("not_found", "That post is not open for reactions.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await setWallReaction(
      session.prisma,
      session.dbUser,
      slug,
      body,
    );
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: "fields" in result ? result.fields : undefined,
        retryAfterSec:
          "retryAfterSec" in result ? result.retryAfterSec : undefined,
      });
    }
    return apiOk({
      liked: result.liked,
      likeCount: result.likeCount,
      viewerReaction: result.viewerReaction,
      reactionCounts: result.reactionCounts,
    });
  });
}

/** Take the reaction back. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  return withApiErrors("posts/[slug]/reaction:clear", async () => {
    const session = await requireActiveMember(request);
    if (session instanceof Response) return session;

    const { slug } = await ctx.params;
    if (!isPlausibleSlug(slug)) {
      return apiError("not_found", "That post is not open for reactions.");
    }

    const result = await clearWallReaction(session.prisma, session.dbUser, slug);
    if (!result.ok) return apiError(result.code, result.message);
    return apiOk({
      liked: result.liked,
      likeCount: result.likeCount,
      viewerReaction: result.viewerReaction,
      reactionCounts: result.reactionCounts,
    });
  });
}
