import type { ArtistProfile, Role, User } from "@prisma/client";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import type { SessionUser } from "@/features/auth/types";

/** Mock device identity — never authorize writes. */
export const MOCK_GUEST_EMAIL = "guest@theartistpost.org";
export const MOCK_GUEST_HANDLE = "studioguest";

export const PUBLISHING_CLOSED_ERROR =
  "Publishing is closed until an artist is approved.";

export const SIGN_IN_REQUIRED_ERROR = "Sign in required";

export const NOT_AUTHORIZED_ERROR =
  "Only an approved artist may create posts.";

export type DbUserWithProfile = User & {
  artistProfile: ArtistProfile | null;
};

export function isMockGuestSession(
  session: SessionUser | null | undefined,
): boolean {
  if (!session) return true;
  const email = session.email.trim().toLowerCase();
  const handle = session.handle?.trim().toLowerCase() ?? "";
  if (email === MOCK_GUEST_EMAIL) return true;
  if (handle === MOCK_GUEST_HANDLE) return true;
  if (isDeniedAuthorEmail(email)) return true;
  if (session.id === "user-mock-artist") return true;
  return false;
}

export function isWritableRole(role: Role | SessionUser["role"]): boolean {
  return role === "ARTIST" || role === "ADMIN";
}

/**
 * Server write gate: real session, ARTIST|ADMIN, and approved profile
 * (ADMIN may write without a profile). Mock guest always fails.
 */
export function authorizePublisher(
  session: SessionUser | null | undefined,
  dbUser: DbUserWithProfile | null,
): { ok: true; canPublish: boolean } | { ok: false; error: string } {
  if (!session || isMockGuestSession(session)) {
    return { ok: false, error: PUBLISHING_CLOSED_ERROR };
  }
  if (!dbUser) {
    return { ok: false, error: NOT_AUTHORIZED_ERROR };
  }
  if (!isWritableRole(dbUser.role)) {
    return { ok: false, error: NOT_AUTHORIZED_ERROR };
  }
  if (dbUser.role === "ADMIN") {
    return { ok: true, canPublish: true };
  }
  if (!dbUser.artistProfile?.approved) {
    return { ok: false, error: NOT_AUTHORIZED_ERROR };
  }
  return { ok: true, canPublish: true };
}

/** Resolve requested visibility under the publish gate. */
export function resolvePostStatus(
  requested: "DRAFT" | "PUBLISHED",
  canPublish: boolean,
): "DRAFT" | "PUBLISHED" {
  if (requested === "PUBLISHED" && canPublish) return "PUBLISHED";
  return "DRAFT";
}
