import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { SocialLinks } from "@/features/posts/types";
import { writeAuditLog } from "@/features/posts/audit";
import { toArtistProfileDTO } from "@/server/api/dto";
import { toAuthUserDTO, type DbUserWithProfile } from "@/features/auth/sessionUser";

export const mePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    bio: z.string().trim().max(480).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.bio !== undefined, {
    message: "Provide name and/or bio.",
  });

export type MePatchResult =
  | {
      ok: false;
      code: "validation_failed" | "conflict" | "upstream_unavailable";
      message: string;
      fields?: Record<string, string>;
    }
  | {
      ok: true;
      user: ReturnType<typeof toAuthUserDTO>;
      profile: (ReturnType<typeof toArtistProfileDTO> & {
        approved: boolean;
        pendingApproval: boolean;
      }) | null;
      canPublish: boolean;
      permissions: { publish: boolean; admin: boolean };
    };

/**
 * Self-serve account polish: display name + artist bio.
 * Never changes role or approval.
 */
export async function patchMeProfile(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  raw: unknown,
): Promise<MePatchResult> {
  const parsed = mePatchSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid profile update",
      fields,
    };
  }

  if (parsed.data.bio !== undefined && !dbUser.artistProfile) {
    return {
      ok: false,
      code: "conflict",
      message: "Only artist accounts have a studio bio.",
    };
  }

  try {
    if (parsed.data.name !== undefined && parsed.data.name !== dbUser.name) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { name: parsed.data.name },
      });
    }

    if (parsed.data.bio !== undefined && dbUser.artistProfile) {
      const bio =
        parsed.data.bio === null || parsed.data.bio === ""
          ? null
          : parsed.data.bio;
      await prisma.artistProfile.update({
        where: { id: dbUser.artistProfile.id },
        data: { bio },
      });
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
        name: parsed.data.name !== undefined,
        bio: parsed.data.bio !== undefined,
      },
    });

    const profile = fresh.artistProfile;
    const canPublish =
      fresh.role === "ADMIN" ||
      (fresh.role === "ARTIST" && profile?.approved === true);

    return {
      ok: true,
      user: toAuthUserDTO(fresh),
      canPublish,
      permissions: {
        publish: canPublish,
        admin: fresh.role === "ADMIN",
      },
      profile: profile
        ? {
            ...toArtistProfileDTO({
              id: profile.id,
              handle: profile.handle,
              name: fresh.name,
              bio: profile.bio,
              avatarUrl: profile.avatarUrl ?? fresh.image,
              socialLinks: (profile.socialLinks as SocialLinks | null) ?? null,
            }),
            approved: profile.approved,
            pendingApproval: !profile.approved,
          }
        : null,
    };
  } catch (error) {
    console.error("[patchMeProfile]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not update your profile.",
    };
  }
}
