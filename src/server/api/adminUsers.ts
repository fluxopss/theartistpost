import { z } from "zod";
import type { PrismaClient, Role } from "@prisma/client";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import type { DbUserWithProfile } from "@/features/auth/sessionUser";

export const adminUserPatchSchema = z
  .object({
    role: z.enum(["VIEWER", "ARTIST", "ADMIN"]).optional(),
    artistApproved: z.boolean().optional(),
  })
  .refine(
    (value) => value.role !== undefined || value.artistApproved !== undefined,
    { message: "Provide role and/or artistApproved." },
  );

export type AdminUserDTO = {
  id: string;
  name: string;
  email: string;
  role: Role;
  handle: string | null;
  artistApproved: boolean | null;
  artistBio: string | null;
  deniedSeed: boolean;
  postCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
};

export function toAdminUserDTO(
  user: DbUserWithProfile & {
    _count?: { posts: number; comments: number; likes: number };
  },
): AdminUserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    handle: user.artistProfile?.handle ?? null,
    artistApproved: user.artistProfile?.approved ?? null,
    artistBio: user.artistProfile?.bio ?? null,
    deniedSeed: isDeniedAuthorEmail(user.email),
    postCount: user._count?.posts ?? 0,
    commentCount: user._count?.comments ?? 0,
    likeCount: user._count?.likes ?? 0,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getAdminUserById(
  prisma: PrismaClient,
  id: string,
): Promise<AdminUserDTO | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      artistProfile: true,
      _count: { select: { posts: true, comments: true, likes: true } },
    },
  });
  if (!user) return null;
  return toAdminUserDTO(user);
}

export type AdminUserPatchResult =
  | {
      ok: false;
      code: "validation_failed" | "not_found" | "conflict" | "forbidden";
      message: string;
      fields?: Record<string, string>;
    }
  | { ok: true; user: AdminUserDTO };

/**
 * Admin-only customer mutations: role and/or artist approval.
 * Never invents users. Never auto-creates ArtistProfile for approval.
 */
export async function patchAdminUser(
  prisma: PrismaClient,
  actor: DbUserWithProfile,
  targetId: string,
  raw: unknown,
): Promise<AdminUserPatchResult> {
  const parsed = adminUserPatchSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid update",
      fields,
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: { artistProfile: true },
  });
  if (!target) {
    return { ok: false, code: "not_found", message: "That account was not found." };
  }

  if (isDeniedAuthorEmail(target.email)) {
    return {
      ok: false,
      code: "forbidden",
      message: "Reserved seed identities cannot be managed here.",
    };
  }

  const { role, artistApproved } = parsed.data;

  if (role && target.id === actor.id && actor.role === "ADMIN" && role !== "ADMIN") {
    return {
      ok: false,
      code: "conflict",
      message: "You cannot remove your own admin role.",
    };
  }

  if (artistApproved !== undefined && !target.artistProfile) {
    return {
      ok: false,
      code: "conflict",
      message: "That account has no artist profile to approve.",
    };
  }

  if (role === "ARTIST" && !target.artistProfile && artistApproved === undefined) {
    return {
      ok: false,
      code: "conflict",
      message: "Promote to ARTIST only when an ArtistProfile already exists.",
    };
  }

  try {
    if (role && role !== target.role) {
      await prisma.user.update({
        where: { id: target.id },
        data: { role },
      });
      await writeAuditLog(prisma, {
        actorId: actor.id,
        action: "user.role_change",
        targetType: "User",
        targetId: target.id,
        meta: { from: target.role, to: role, email: target.email },
      });
    }

    if (
      artistApproved !== undefined &&
      target.artistProfile &&
      target.artistProfile.approved !== artistApproved
    ) {
      await prisma.artistProfile.update({
        where: { id: target.artistProfile.id },
        data: { approved: artistApproved },
      });
      // Approval implies ARTIST role; revoke leaves role as-is (admin may demote separately).
      if (artistApproved && target.role === "VIEWER") {
        await prisma.user.update({
          where: { id: target.id },
          data: { role: "ARTIST" },
        });
      }
      await writeAuditLog(prisma, {
        actorId: actor.id,
        action: artistApproved ? "artist.approve" : "artist.revoke",
        targetType: "ArtistProfile",
        targetId: target.artistProfile.id,
        meta: {
          email: target.email,
          handle: target.artistProfile.handle,
          via: "admin/users",
        },
      });
    }

    const fresh = await getAdminUserById(prisma, target.id);
    if (!fresh) {
      return { ok: false, code: "not_found", message: "That account was not found." };
    }
    return { ok: true, user: fresh };
  } catch (error) {
    console.error("[patchAdminUser]", error);
    return {
      ok: false,
      code: "conflict",
      message: "Could not update that account.",
    };
  }
}
