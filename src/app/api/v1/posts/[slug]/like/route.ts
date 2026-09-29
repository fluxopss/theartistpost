import { likeStateForUser, toggleLikeForUser } from "@/server/api/engagement";
import { isPlausibleSlug } from "@/server/api/posts";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireApiSession, resolveOptionalSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/** Optional: current like state for a signed-in visitor; public count always. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  return withApiErrors("posts/[slug]/like", async () => {
    const { slug } = await ctx.params;
    if (!isPlausibleSlug(slug)) {
      return apiError("not_found", "That post is not on the wall.");
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError(
        "upstream_unavailable",
        "Likes are temporarily unavailable.",
      );
    }

    const optional = await resolveOptionalSession(request);
    const state = await likeStateForUser(
      prisma,
      slug,
      optional?.dbUser.id ?? null,
    );
    if (!state) {
      return apiError("not_found", "That post is not on the wall.");
    }

    return apiOk(state);
  });
}

/** Toggle like for the signed-in member. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  return withApiErrors("posts/[slug]/like:toggle", async () => {
    const session = await requireApiSession(request);
    if (session instanceof Response) return session;

    const { slug } = await ctx.params;
    if (!isPlausibleSlug(slug)) {
      return apiError("not_found", "That post is not open for likes.");
    }

    const result = await toggleLikeForUser(
      session.prisma,
      session.dbUser,
      slug,
    );
    if (!result.ok) {
      return apiError(result.code, result.message, {
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({ liked: result.liked, likeCount: result.likeCount });
  });
}
