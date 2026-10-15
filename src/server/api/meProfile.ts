import { createHash } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import {
  toAuthUserDTO,
  type AuthUserDTO,
  type DbUserWithProfile,
} from "@/features/auth/sessionUser";
import { writeAuditLog } from "@/features/posts/audit";
import type { SocialLinks } from "@/features/posts/types";
import { content } from "@/lib/content";
import { toArtistProfileDTO } from "@/server/api/dto";
import {
  handleSchema,
  isHandleAvailable,
  normalizeHandle,
} from "@/server/api/handles";
import { IMAGE_MAX_BYTES, storeUploadedMedia } from "@/server/api/media";
import { toTopicDTO, type TopicDTO } from "@/server/api/topics";
import { absoluteUrl } from "@/server/api/urls";
import { zodFieldErrors } from "@/server/api/validation";

export const BIO_MAX = 480;
export const HEADLINE_MAX = 80;
export const LOCATION_MAX = 60;
export const TOPICS_MAX = 8;

const emptyToNull = (value: string | null) =>
  value === null || value === "" ? null : value;

export const mePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    handle: handleSchema.optional(),
    bio: z.string().trim().max(BIO_MAX).nullable().optional().transform((v) =>
      v === undefined ? undefined : emptyToNull(v),
    ),
    headline: z
      .string()
      .trim()
      .max(HEADLINE_MAX)
      .nullable()
      .optional()
      .transform((v) => (v === undefined ? undefined : emptyToNull(v))),
    location: z
      .string()
      .trim()
      .max(LOCATION_MAX)
      .nullable()
      .optional()
      .transform((v) => (v === undefined ? undefined : emptyToNull(v))),
    chapterId: z.string().trim().min(1).max(40).nullable().optional(),
    topicSlugs: z
      .array(z.string().trim().regex(/^[a-z0-9-]{1,40}$/, "Invalid topic."))
      .max(TOPICS_MAX, `Pick up to ${TOPICS_MAX} topics.`)
      .optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Provide at least one profile field.",
  });

export type MeUserDTO = AuthUserDTO & {
  bio: string | null;
  headline: string | null;
  location: string | null;
  chapterId: string | null;
  topics: TopicDTO[];
  termsAcceptedAt: string | null;
  suspended: boolean;
  followerCount: number;
  followingCount: number;
  unreadNotifications: number;
};

export type MeDTO = {
  user: MeUserDTO;
  canPublish: boolean;
  permissions: { publish: boolean; admin: boolean };
  profile:
    | (ReturnType<typeof toArtistProfileDTO> & {
        approved: boolean;
        pendingApproval: boolean;
      })
    | null;
};

/**
 * Shape behind GET/PATCH `/me`: the original auth/profile payload plus the
 * community profile (bio, topics, counts, terms, suspension).
 */
export async function toMeDTO(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
): Promise<MeDTO> {
  const [userTopics, followerCount, followingCount, unreadNotifications] =
    await Promise.all([
      prisma.userTopic.findMany({
        where: { userId: dbUser.id },
        include: { topic: true },
        orderBy: { topic: { sortOrder: "asc" } },
      }),
      prisma.follow.count({ where: { followingId: dbUser.id } }),
      prisma.follow.count({ where: { followerId: dbUser.id } }),
      prisma.notification.count({
        where: { userId: dbUser.id, readAt: null },
      }),
    ]);

  const profile = dbUser.artistProfile;
  const canPublish =
    dbUser.role === "ADMIN" ||
    (dbUser.role === "ARTIST" && profile?.approved === true);
  const base = toAuthUserDTO(dbUser);

  return {
    user: {
      ...base,
      image: absoluteUrl(dbUser.image),
      bio: dbUser.bio ?? profile?.bio ?? null,
      headline: dbUser.headline ?? null,
      location: dbUser.location ?? null,
      chapterId: dbUser.chapterId ?? null,
      topics: userTopics.map((row) => toTopicDTO(row.topic)),
      termsAcceptedAt: dbUser.termsAcceptedAt?.toISOString() ?? null,
      suspended: Boolean(dbUser.suspendedAt),
      followerCount,
      followingCount,
      unreadNotifications,
    },
    canPublish,
    permissions: { publish: canPublish, admin: dbUser.role === "ADMIN" },
    profile: profile
      ? {
          ...toArtistProfileDTO({
            id: profile.id,
            handle: profile.handle,
            name: dbUser.name,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl ?? dbUser.image,
            socialLinks: (profile.socialLinks as SocialLinks | null) ?? null,
          }),
          approved: profile.approved,
          pendingApproval: !profile.approved,
        }
      : null,
  };
}

export type MePatchResult =
  | {
      ok: false;
      code:
        | "validation_failed"
        | "conflict"
        | "rate_limited"
        | "upstream_unavailable";
      message: string;
      fields?: Record<string, string>;
      retryAfterSec?: number;
    }
  | { ok: true; me: MeDTO };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

const HANDLE_TAKEN = "That handle is already taken.";

/**
 * Self-serve profile edits: name, handle, bio, headline, location, home
 * chapter and topics. Never changes role, approval or suspension.
 *
 * Artists keep their ArtistProfile handle (it is their public Wall URL), so
 * for them `handle` may only repeat it. Members choose freely.
 */
export async function patchMeProfile(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  raw: unknown,
): Promise<MePatchResult> {
  const parsed = mePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid profile update",
      fields: zodFieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  const limit = checkRateLimit(`v1:profile:${dbUser.id}`, {
    windowMs: 60_000,
    max: 20,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down — too many profile edits just now.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const artist = dbUser.artistProfile;

    if (input.chapterId) {
      const chapters = await content.getChapters();
      if (!chapters.some((chapter) => chapter.id === input.chapterId)) {
        return {
          ok: false,
          code: "validation_failed",
          message: "Pick a chapter from the list.",
          fields: { chapterId: "Pick a chapter from the list." },
        };
      }
    }

    let nextHandle: string | undefined;
    if (input.handle !== undefined) {
      const current = dbUser.handle ? normalizeHandle(dbUser.handle) : null;
      if (artist && input.handle !== normalizeHandle(artist.handle)) {
        return {
          ok: false,
          code: "conflict",
          message: "Artist handles are set by the house team.",
          fields: { handle: "Artist handles are set by the house team." },
        };
      }
      if (input.handle !== current) {
        const available = await isHandleAvailable(
          prisma,
          input.handle,
          dbUser.id,
        );
        if (!available) {
          return {
            ok: false,
            code: "conflict",
            message: HANDLE_TAKEN,
            fields: { handle: HANDLE_TAKEN },
          };
        }
        nextHandle = input.handle;
      }
    }

    let topicIds: string[] | undefined;
    if (input.topicSlugs !== undefined) {
      const slugs = [...new Set(input.topicSlugs)];
      const found = slugs.length
        ? await prisma.topic.findMany({
            where: { slug: { in: slugs }, active: true },
          })
        : [];
      const bySlug = new Map(found.map((topic) => [topic.slug, topic.id]));
      const unknown = slugs.filter((slug) => !bySlug.has(slug));
      if (unknown.length > 0) {
        const message = `Unknown topic: ${unknown.join(", ")}`;
        return {
          ok: false,
          code: "validation_failed",
          message,
          fields: { topicSlugs: message },
        };
      }
      topicIds = slugs.map((slug) => bySlug.get(slug)!);
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined && input.name !== dbUser.name) {
      data.name = input.name;
    }
    if (nextHandle !== undefined) data.handle = nextHandle;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.headline !== undefined) data.headline = input.headline;
    if (input.location !== undefined) data.location = input.location;
    if (input.chapterId !== undefined) data.chapterId = input.chapterId;
    // An artist repeating their own handle backfills a missing User.handle.
    if (
      input.handle !== undefined &&
      !dbUser.handle &&
      nextHandle === undefined
    ) {
      data.handle = input.handle;
    }

    try {
      if (Object.keys(data).length > 0) {
        await prisma.user.update({ where: { id: dbUser.id }, data });
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return {
          ok: false,
          code: "conflict",
          message: HANDLE_TAKEN,
          fields: { handle: HANDLE_TAKEN },
        };
      }
      throw error;
    }

    if (input.bio !== undefined && artist) {
      await prisma.artistProfile.update({
        where: { id: artist.id },
        data: { bio: input.bio },
      });
    }

    if (topicIds !== undefined) {
      await prisma.$transaction([
        prisma.userTopic.deleteMany({ where: { userId: dbUser.id } }),
        ...(topicIds.length > 0
          ? [
              prisma.userTopic.createMany({
                data: topicIds.map((topicId) => ({
                  userId: dbUser.id,
                  topicId,
                })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);
    }

    const fresh = await prisma.user.findUnique({
      where: { id: dbUser.id },
      include: { artistProfile: true },
    });
    if (!fresh) {
      return {
        ok: false,
        code: "upstream_unavailable",
        message: "Could not refresh your account.",
      };
    }

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "user.profile_update",
      targetType: "User",
      targetId: dbUser.id,
      meta: {
        name: input.name !== undefined,
        handle: input.handle !== undefined,
        bio: input.bio !== undefined,
        headline: input.headline !== undefined,
        location: input.location !== undefined,
        chapterId: input.chapterId !== undefined,
        topics: input.topicSlugs !== undefined,
      },
    });

    return { ok: true, me: await toMeDTO(prisma, fresh) };
  } catch (error) {
    console.error("[patchMeProfile]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not update your profile.",
    };
  }
}

export type AvatarResult =
  | { ok: true; avatarUrl: string }
  | {
      ok: false;
      code: "validation_failed" | "rate_limited" | "upstream_unavailable";
      message: string;
      retryAfterSec?: number;
    };

/** Avatar upload: images only, same storage rules as studio media. */
export async function setAvatar(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  file: File,
): Promise<AvatarResult> {
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Profile photos must be images (JPEG, PNG, WebP or GIF).",
    };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Image must be under 2.5MB",
    };
  }

  const limit = checkRateLimit(`v1:avatar:${dbUser.id}`, {
    windowMs: 60 * 60_000,
    max: 10,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Too many photo changes. Try again later.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const stored = await storeUploadedMedia(file);
    if (!stored.ok) {
      return { ok: false, code: stored.code, message: stored.error };
    }
    if (stored.media.mediaType !== "IMAGE") {
      return {
        ok: false,
        code: "validation_failed",
        message: "Profile photos must be images.",
      };
    }

    const url = stored.media.url;
    await prisma.user.update({ where: { id: dbUser.id }, data: { image: url } });
    if (dbUser.artistProfile) {
      await prisma.artistProfile.update({
        where: { id: dbUser.artistProfile.id },
        data: { avatarUrl: url },
      });
    }
    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "user.avatar_update",
      targetType: "User",
      targetId: dbUser.id,
    });

    return { ok: true, avatarUrl: absoluteUrl(url) ?? url };
  } catch (error) {
    console.error("[setAvatar]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save your photo.",
    };
  }
}

export const termsSchema = z.object({ accept: z.literal(true) });

export type TermsResult =
  | { ok: true; termsAcceptedAt: string }
  | {
      ok: false;
      code: "validation_failed" | "upstream_unavailable";
      message: string;
    };

/** Record Community Guidelines acceptance (first acceptance timestamp wins). */
export async function acceptTerms(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  raw: unknown,
): Promise<TermsResult> {
  if (!termsSchema.safeParse(raw).success) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Accept the Community Guidelines to continue.",
    };
  }
  if (dbUser.termsAcceptedAt) {
    return { ok: true, termsAcceptedAt: dbUser.termsAcceptedAt.toISOString() };
  }

  try {
    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: { termsAcceptedAt: now },
    });
    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "user.terms_accept",
      targetType: "User",
      targetId: dbUser.id,
    });
    return {
      ok: true,
      termsAcceptedAt: (updated?.termsAcceptedAt ?? now).toISOString(),
    };
  } catch (error) {
    console.error("[acceptTerms]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not record that just now.",
    };
  }
}

export const deleteAccountSchema = z.object({ confirm: z.literal("DELETE") });

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false;
      code: "validation_failed" | "conflict" | "upstream_unavailable";
      message: string;
    };

/**
 * In-app account deletion (App Store 5.1.1(v)). Foreign keys cascade the
 * user's follows (both sides), reactions, community posts (and replies under
 * them), notifications (as recipient and actor), blocks, reports filed, topic
 * links, likes, comments and posts. Reports ABOUT their content are removed
 * explicitly because those targets are polymorphic. The audit row keeps only
 * a SHA-256 of the email.
 */
export async function deleteAccount(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  raw: unknown,
): Promise<DeleteAccountResult> {
  if (!deleteAccountSchema.safeParse(raw).success) {
    return {
      ok: false,
      code: "validation_failed",
      message: 'Type DELETE to confirm.',
    };
  }

  try {
    if (dbUser.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({
        where: { role: "ADMIN", id: { not: dbUser.id } },
      });
      if (otherAdmins === 0) {
        return {
          ok: false,
          code: "conflict",
          message:
            "You are the only admin. Ask the house team to hand over admin first.",
        };
      }
    }

    const [communityPosts, comments, posts] = await Promise.all([
      prisma.communityPost.findMany({
        where: { authorId: dbUser.id },
        select: { id: true },
      }),
      prisma.comment.findMany({
        where: { userId: dbUser.id },
        select: { id: true },
      }),
      prisma.post.findMany({
        where: { authorId: dbUser.id },
        select: { id: true },
      }),
    ]);

    const reportTargets: Array<Record<string, unknown>> = [
      { targetType: "USER", targetId: dbUser.id },
    ];
    if (communityPosts.length > 0) {
      reportTargets.push({
        targetType: "COMMUNITY_POST",
        targetId: { in: communityPosts.map((p) => p.id) },
      });
    }
    if (comments.length > 0) {
      reportTargets.push({
        targetType: "COMMENT",
        targetId: { in: comments.map((c) => c.id) },
      });
    }
    if (posts.length > 0) {
      reportTargets.push({
        targetType: "POST",
        targetId: { in: posts.map((p) => p.id) },
      });
    }

    await prisma.$transaction([
      prisma.report.deleteMany({
        where: { OR: reportTargets as never },
      }),
      prisma.user.delete({ where: { id: dbUser.id } }),
    ]);

    await writeAuditLog(prisma, {
      actorId: null,
      action: "user.delete",
      targetType: "User",
      targetId: dbUser.id,
      meta: {
        emailSha256: createHash("sha256")
          .update(dbUser.email.trim().toLowerCase())
          .digest("hex"),
        role: dbUser.role,
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("[deleteAccount]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not delete your account just now.",
    };
  }
}
