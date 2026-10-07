"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/features/auth/adapter";
import { isMockGuestSession } from "@/features/auth/publishGate";
import { hitRateLimit } from "@/features/auth/rateLimit";
import {
  isDeniedAuthorEmail,
  isDeniedPostSlug,
  publicCatalogWhere,
} from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import { getPrisma } from "@/shared/lib/prisma";

const commentSchema = z.object({
  postId: z.string().min(1).max(64),
  body: z.string().trim().min(1).max(280),
});

const likeSchema = z.object({
  postId: z.string().min(1).max(64),
});

export type CommentActionResult =
  | { ok: false; error: string }
  | {
      ok: true;
      comment: { id: string; body: string; author: string; createdAt: string };
    };

export type LikeActionResult =
  | { ok: false; error: string }
  | { ok: true; liked: boolean; likeCount: number };

export type LikeStatusResult =
  | { ok: false; error: string }
  | { ok: true; liked: boolean; likeCount: number };

async function requireEngagementUser() {
  const session = await getSession();
  if (!session || isMockGuestSession(session)) {
    return { ok: false as const, error: "Join to leave a note on the Wall." };
  }
  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false as const, error: "Comments are briefly offline." };
  }
  const dbUser = await prisma.user.findUnique({ where: { email: session.email } });
  if (!dbUser) {
    return { ok: false as const, error: "Join to leave a note on the Wall." };
  }
  if (isDeniedAuthorEmail(dbUser.email)) {
    return { ok: false as const, error: "That identity cannot respond." };
  }
  return { ok: true as const, prisma, dbUser, session };
}

async function loadPublicPost(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  postId: string,
) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      ...publicCatalogWhere(),
    },
    include: {
      author: { include: { artistProfile: true } },
      _count: { select: { likes: true } },
    },
  });
  if (!post) return null;
  if (isDeniedPostSlug(post.slug)) return null;
  if (isDeniedAuthorEmail(post.author.email)) return null;
  return post;
}

/**
 * Persist a comment for signed-in VIEWER / ARTIST / ADMIN on a public post.
 */
export async function createCommentAction(
  raw: z.infer<typeof commentSchema>,
): Promise<CommentActionResult> {
  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid comment",
    };
  }

  const gate = await requireEngagementUser();
  if (!gate.ok) return gate;

  if (
    !hitRateLimit(`comment:${gate.dbUser.id}`, { windowMs: 60_000, max: 20 })
  ) {
    return { ok: false, error: "Slow down — too many notes just now." };
  }

  try {
    const post = await loadPublicPost(gate.prisma, parsed.data.postId);
    if (!post) {
      return { ok: false, error: "That post is not open for comments." };
    }

    const comment = await gate.prisma.comment.create({
      data: {
        body: parsed.data.body,
        postId: post.id,
        userId: gate.dbUser.id,
      },
    });

    await writeAuditLog(gate.prisma, {
      actorId: gate.dbUser.id,
      action: "comment.create",
      targetType: "Comment",
      targetId: comment.id,
      meta: { postId: post.id },
    });

    revalidatePath(`/post/${post.slug}`);

    return {
      ok: true,
      comment: {
        id: comment.id,
        body: comment.body,
        author: gate.dbUser.name,
        createdAt: comment.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("[createCommentAction]", error);
    return { ok: false, error: "Could not leave that note." };
  }
}

/**
 * Current like state for the signed-in visitor on a public post.
 * Used to hydrate the web LikeButton before the first click.
 */
export async function getLikeStatusAction(
  raw: z.infer<typeof likeSchema>,
): Promise<LikeStatusResult> {
  const parsed = likeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid like" };
  }

  const gate = await requireEngagementUser();
  if (!gate.ok) return gate;

  try {
    const post = await loadPublicPost(gate.prisma, parsed.data.postId);
    if (!post) {
      return { ok: false, error: "That post is not open for likes." };
    }

    const existing = await gate.prisma.like.findUnique({
      where: {
        userId_postId: { userId: gate.dbUser.id, postId: post.id },
      },
    });

    return {
      ok: true,
      liked: Boolean(existing),
      likeCount: post._count.likes,
    };
  } catch (error) {
    console.error("[getLikeStatusAction]", error);
    return { ok: false, error: "Could not load like." };
  }
}

/**
 * Toggle like for signed-in users on a public approved published post.
 */
export async function toggleLikeAction(
  raw: z.infer<typeof likeSchema>,
): Promise<LikeActionResult> {
  const parsed = likeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid like" };
  }

  const gate = await requireEngagementUser();
  if (!gate.ok) return gate;

  if (!hitRateLimit(`like:${gate.dbUser.id}`, { windowMs: 60_000, max: 40 })) {
    return { ok: false, error: "Slow down — too many likes just now." };
  }

  try {
    const post = await loadPublicPost(gate.prisma, parsed.data.postId);
    if (!post) {
      return { ok: false, error: "That post is not open for likes." };
    }

    const existing = await gate.prisma.like.findUnique({
      where: {
        userId_postId: { userId: gate.dbUser.id, postId: post.id },
      },
    });

    let liked: boolean;
    if (existing) {
      await gate.prisma.like.delete({ where: { id: existing.id } });
      liked = false;
      await writeAuditLog(gate.prisma, {
        actorId: gate.dbUser.id,
        action: "like.remove",
        targetType: "Post",
        targetId: post.id,
      });
    } else {
      await gate.prisma.like.create({
        data: { userId: gate.dbUser.id, postId: post.id },
      });
      liked = true;
      await writeAuditLog(gate.prisma, {
        actorId: gate.dbUser.id,
        action: "like.add",
        targetType: "Post",
        targetId: post.id,
      });
    }

    const likeCount = await gate.prisma.like.count({ where: { postId: post.id } });
    revalidatePath(`/post/${post.slug}`);

    return { ok: true, liked, likeCount };
  } catch (error) {
    console.error("[toggleLikeAction]", error);
    return { ok: false, error: "Could not update like." };
  }
}
