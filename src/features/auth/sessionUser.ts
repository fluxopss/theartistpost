import type { ArtistProfile, Role, User } from "@prisma/client";
import type { SessionUser } from "@/features/auth/types";

export type DbUserWithProfile = User & {
  artistProfile: ArtistProfile | null;
};

export function toSessionUser(input: {
  id: string;
  email: string;
  name: string;
  role: Role | SessionUser["role"];
  handle?: string | null;
  image?: string | null;
}): SessionUser {
  return {
    id: input.id,
    email: input.email,
    name: input.name,
    role: input.role,
    handle: input.handle ?? undefined,
    image: input.image ?? null,
  };
}

export function sessionUserFromDb(user: DbUserWithProfile): SessionUser {
  return toSessionUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    handle: user.artistProfile?.handle,
    image: user.image,
  });
}

/** Wire shape for GET /api/v1/auth/me and auth success payloads. */
export type AuthUserDTO = {
  id: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  handle: string | null;
  image: string | null;
  artist: {
    handle: string;
    approved: boolean;
    pendingApproval: boolean;
  } | null;
};

export function toAuthUserDTO(
  user: DbUserWithProfile | SessionUser,
  profile?: ArtistProfile | null,
): AuthUserDTO {
  const artistProfile =
    profile !== undefined
      ? profile
      : "artistProfile" in user
        ? user.artistProfile
        : null;

  const handle =
    artistProfile?.handle ??
    ("handle" in user ? (user.handle ?? null) : null);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    handle: handle ?? null,
    image: user.image ?? null,
    artist: artistProfile
      ? {
          handle: artistProfile.handle,
          approved: artistProfile.approved,
          pendingApproval: !artistProfile.approved,
        }
      : user.role === "ARTIST"
        ? {
            handle: handle ?? "",
            approved: false,
            pendingApproval: true,
          }
        : null,
  };
}
