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
  image:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
};
