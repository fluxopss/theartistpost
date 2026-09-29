import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import {
  DENIED_AUTHOR_EMAILS,
  isDeniedAuthorEmail,
  isDeniedPostSlug,
  publicCatalogWhere,
} from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import type { DbUserWithProfile } from "@/features/auth/sessionUser";

export const COMMENT_BODY_MAX = 280;
export const COMMENT_DEFAULT_TAKE = 24;
export const COMMENT_MAX_TAKE = 50;

export const commentBodySchema = z.object({
  body: z.string().trim().min(1).max(COMMENT_BODY_MAX),
});

export type EngagementCommentDTO = {
  id: string;
  body: string;
  author: { name: string; handle: string | null };
  createdAt: string;
};

export type CreateCommentResult =
  | { ok: false; code: "validation_failed" | "not_found" | "forbidden" | "rate_limited" | "upstream_unavailable"; message: string; retryAfterSec?: number; fields?: Record<string, string> }
  | { ok: true; comment: EngagementCommentDTO };

export type ToggleLikeResult =
  | { ok: false; code: "not_found" | "forbidden" | "rate_limited" | "upstream_unavailable"; message: string; retryAfterSec?: number }
  | { ok: true; liked: boolean; likeCount: number };

export type DeleteCommentResult =
  | { ok: false; code: "not_found" | "forbidden" | "upstream_unavailable"; message: string }
  | { ok: true; deleted: true };

async function loadPublicPostBySlug(
  prisma: PrismaClient,
  slug: string,
) {
  if (isDeniedPostSlug(slug)) return null;
  const post = await prisma.post.findFirst({
    where: {
      slug,
      ...publicCatalogWhere(),
    },
    include: {
      author: { include: { artistProfile: true } },
      _count: { select: { likes: true } },
    },
  });
  if (!post) return null;
  if (isDeniedAuthorEmail(post.author.email)) return null;
  return post;
}

function engagementForbidden(dbUser: DbUserWithProfile): string | null {
  if (isDeniedAuthorEmail(dbUser.email)) {
    return "That identity cannot respond.";
  }
  return null;
}

/**
 * Persist a comment for a signed-in house member on a public post.
 */
export async function createCommentForUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
  rawBody: unknown,
): Promise<CreateCommentResult> {
  const denied = engagementForbidden(dbUser);
  if (denied) {
    return { ok: false, code: "forbidden", message: denied };
  }

  const parsed = commentBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid comment",
      fields,
    };
  }

  const limit = checkRateLimit(`v1:comment:${dbUser.id}`, {
    windowMs: 60_000,
    max: 20,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many notes just now.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return {
        ok: false,
        code: "not_found",
        message: "That post is not open for comments.",
      };
    }

    const comment = await prisma.comment.create({
      data: {
        body: parsed.data.body,
        postId: post.id,
        userId: dbUser.id,
      },
    });

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "comment.create",
      targetType: "Comment",
      targetId: comment.id,
      meta: { postId: post.id, slug: post.slug },
    });

    return {
      ok: true,
      comment: {
        id: comment.id,
        body: comment.body,
        author: {
          name: dbUser.name,
          handle: dbUser.artistProfile?.handle ?? null,
        },
        createdAt: comment.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[createCommentForUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not leave that note.",
    };
  }
}

/**
 * Toggle like for a signed-in user on a public post.
 */
export async function toggleLikeForUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
): Promise<ToggleLikeResult> {
  const denied = engagementForbidden(dbUser);
  if (denied) {
    return { ok: false, code: "forbidden", message: denied };
  }

  const limit = checkRateLimit(`v1:like:${dbUser.id}`, {
    windowMs: 60_000,
    max: 40,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many likes just now.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return {
        ok: false,
        code: "not_found",
        message: "That post is not open for likes.",
      };
    }

    const existing = await prisma.like.findUnique({
      where: {
        userId_postId: { userId: dbUser.id, postId: post.id },
      },
    });

    let liked: boolean;
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      liked = false;
      await writeAuditLog(prisma, {
        actorId: dbUser.id,
        action: "like.remove",
        targetType: "Post",
        targetId: post.id,
        meta: { slug: post.slug },
      });
    } else {
      await prisma.like.create({
        data: { userId: dbUser.id, postId: post.id },
      });
      liked = true;
      await writeAuditLog(prisma, {
        actorId: dbUser.id,
        action: "like.add",
        targetType: "Post",
        targetId: post.id,
        meta: { slug: post.slug },
      });
    }

    const likeCount = await prisma.like.count({ where: { postId: post.id } });
    return { ok: true, liked, likeCount };
  } catch (error) {
    console.error("[toggleLikeForUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not update like.",
    };
  }
}

/**
 * Author or ADMIN may remove a comment on a public post.
 */
export async function deleteCommentForUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  slug: string,
  commentId: string,
): Promise<DeleteCommentResult> {
  try {
    const post = await loadPublicPostBySlug(prisma, slug);
    if (!post) {
      return { ok: false, code: "not_found", message: "That post is not on the wall." };
    }

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, postId: post.id },
    });
    if (!comment) {
      return { ok: false, code: "not_found", message: "That comment is gone." };
    }

    const canDelete =
      dbUser.role === "ADMIN" || comment.userId === dbUser.id;
    if (!canDelete) {
      return {
        ok: false,
        code: "forbidden",
        message: "You can only remove your own notes.",
      };
    }

    await prisma.comment.delete({ where: { id: comment.id } });
    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "comment.delete",
      targetType: "Comment",
      targetId: comment.id,
      meta: { postId: post.id, slug: post.slug },
    });

    return { ok: true, deleted: true };
  } catch (error) {
    console.error("[deleteCommentForUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not remove that note.",
    };
  }
}

const WHOLE_NUMBER_RE = /^\d+$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,64}$/;

export type CommentsQuery = { cursor?: string; take: number };

export function parseCommentsQuery(
  params: URLSearchParams,
):
  | { ok: true; query: CommentsQuery }
  | { ok: false; message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  let take = COMMENT_DEFAULT_TAKE;
  const rawTake = params.get("take");
  if (rawTake !== null && rawTake !== "") {
    const n = WHOLE_NUMBER_RE.test(rawTake) ? Number(rawTake) : NaN;
    if (!Number.isSafeInteger(n) || n < 1) {
      fields.take = `take must be a whole number from 1 to ${COMMENT_MAX_TAKE}.`;
    } else {
      take = Math.min(n, COMMENT_MAX_TAKE);
    }
  }

  const cursor = params.get("cursor") || undefined;
  if (cursor !== undefined && !CURSOR_RE.test(cursor)) {
    fields.cursor = "cursor must be a nextCursor value from a previous page.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return { ok: true, query: { cursor, take } };
}

export async function listCommentsForSlug(
  prisma: PrismaClient,
  slug: string,
  query: CommentsQuery,
): Promise<
  | { ok: false; code: "not_found"; message: string }
  | {
      ok: true;
      items: EngagementCommentDTO[];
      nextCursor: string | null;
      commentCount: number;
    }
> {
  const post = await loadPublicPostBySlug(prisma, slug);
  if (!post) {
    return {
      ok: false,
      code: "not_found",
      message: "That post is not on the wall.",
    };
  }

  const publicCommentWhere = {
    postId: post.id,
    user: { email: { notIn: [...DENIED_AUTHOR_EMAILS] } },
  };

  const comments = await prisma.comment.findMany({
    where: publicCommentWhere,
    orderBy: { createdAt: "desc" },
    take: query.take + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    include: {
      user: { include: { artistProfile: true } },
    },
  });

  const hasMore = comments.length > query.take;
  const slice = hasMore ? comments.slice(0, query.take) : comments;
  const commentCount = await prisma.comment.count({
    where: publicCommentWhere,
  });

  return {
    ok: true,
    items: slice.map((c) => ({
      id: c.id,
      body: c.body,
      author: {
        name: c.user.name,
        handle: c.user.artistProfile?.handle ?? null,
      },
      createdAt: c.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    commentCount,
  };
}

export async function likeStateForUser(
  prisma: PrismaClient,
  slug: string,
  userId: string | null,
): Promise<{ likedByMe: boolean | null; likeCount: number } | null> {
  const post = await loadPublicPostBySlug(prisma, slug);
  if (!post) return null;
  const likeCount = post._count.likes;
  if (!userId) return { likedByMe: null, likeCount };
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId: post.id } },
  });
  return { likedByMe: Boolean(existing), likeCount };
}
