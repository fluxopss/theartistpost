import type { SocialLinks } from "@/features/posts/types";
import { toArtistProfileDTO } from "@/server/api/dto";
import { requireApiSession } from "@/server/api/session";
import { apiOk, withApiErrors } from "@/server/api/respond";

export const runtime = "nodejs";

/**
 * Signed-in customer surface (engine Slice C).
 * Same identity as `/api/v1/auth/me`, plus a public artist profile DTO when
 * the account has an ArtistProfile, and explicit permissions.
 */
export async function GET(request: Request) {
  return withApiErrors("me", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    const profile = ctx.dbUser.artistProfile;
    const canPublish =
      ctx.dbUser.role === "ADMIN" ||
      (ctx.dbUser.role === "ARTIST" && profile?.approved === true);
    const canAdmin = ctx.dbUser.role === "ADMIN";

    return apiOk({
      user: ctx.user,
      canPublish,
      permissions: {
        publish: canPublish,
        admin: canAdmin,
      },
      profile: profile
        ? {
            ...toArtistProfileDTO({
              id: profile.id,
              handle: profile.handle,
              name: ctx.dbUser.name,
              bio: profile.bio,
              avatarUrl: profile.avatarUrl ?? ctx.dbUser.image,
              socialLinks: (profile.socialLinks as SocialLinks | null) ?? null,
            }),
            approved: profile.approved,
            pendingApproval: !profile.approved,
          }
        : null,
    });
  });
}
