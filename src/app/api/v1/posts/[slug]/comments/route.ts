import {
  createCommentForUser,
  listCommentsForSlug,
  parseCommentsQuery,
} from "@/server/api/engagement";
import { isPlausibleSlug } from "@/server/api/posts";
import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";
import { requireApiSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/**
 * Public comment page for a wall post (newest first).
 * Reserved seed authors never appear.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  return withApiErrors("posts/[slug]/comments", async () => {
    const { slug } = await ctx.params;
    if (!isPlausibleSlug(slug)) {
      return apiError("not_found", "That post is not on the wall.");
    }

    const parsed = parseCommentsQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError(
        "upstream_unavailable",
        "Comments are temporarily unavailable.",
      );
    }

    const result = await listCommentsForSlug(prisma, slug, parsed.query);
    if (!result.ok) {
      return apiError(result.code, result.message);
    }

    return apiOk(
      {
        items: result.items,
        nextCursor: result.nextCursor,
        commentCount: result.commentCount,
      },
      { cache: CACHE.none },
    );
  });
}

/** Signed-in members leave a public note on a published work. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  return withApiErrors("posts/[slug]/comments:create", async () => {
    const session = await requireApiSession(request);
    if (session instanceof Response) return session;

    const { slug } = await ctx.params;
    if (!isPlausibleSlug(slug)) {
      return apiError("not_found", "That post is not open for comments.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await createCommentForUser(
      session.prisma,
      session.dbUser,
      slug,
      body,
    );
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({ comment: result.comment }, { status: 201 });
  });
}
