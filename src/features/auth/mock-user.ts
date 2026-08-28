import type { SessionUser } from "@/features/auth/types";

/**
 * Device studio identity for Create until NextAuth exists.
 * Surface copy must say this is on-device, not a signed-in account.
 */
export const MOCK_SESSION_USER: SessionUser = {
  id: "user-mock-artist",
  name: "Studio Guest",
  email: "guest@theartistpost.org",
  handle: "studioguest",
  role: "ARTIST",
  image: "/brand/logo.webp",
};
