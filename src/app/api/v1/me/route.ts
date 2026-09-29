import type { SocialLinks } from "@/features/posts/types";
import { toArtistProfileDTO } from "@/server/api/dto";
import { patchMeProfile } from "@/server/api/meProfile";
import { requireApiSession } from "@/server/api/session";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";

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

/** Self-serve name / artist bio updates. Never changes role or approval. */
export async function PATCH(request: Request) {
  return withApiErrors("me:patch", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await patchMeProfile(ctx.prisma, ctx.dbUser, body);
    if (!result.ok) {
      return apiError(result.code, result.message, { fields: result.fields });
    }

    return apiOk({
      user: result.user,
      canPublish: result.canPublish,
      permissions: result.permissions,
      profile: result.profile,
    });
  });
}
