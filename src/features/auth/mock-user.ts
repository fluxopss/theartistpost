import type { SessionUser } from "@/features/auth/types";

/**
 * Mock signed-in artist for local development.
 * TODO: Replace with NextAuth session once auth is wired.
 */
export const MOCK_SESSION_USER: SessionUser = {
  id: "user-mock-artist",
  name: "Studio Guest",
  email: "guest@theartistpost.org",
  handle: "studioguest",
  role: "ARTIST",
  image: "/brand/logo.webp",
};
