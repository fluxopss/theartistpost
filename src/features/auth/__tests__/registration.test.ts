import { describe, expect, it } from "vitest";
import {
  decodeSessionToken,
  encodeSessionToken,
} from "@/features/auth/sessionCookie";
import { getAuthSecret } from "@/features/auth/secret";
import {
  registerArtistAction,
  registerMemberAction,
} from "@/features/auth/actions";
import {
  createCommentAction,
  getLikeStatusAction,
  toggleLikeAction,
} from "@/features/posts/engagement";
import { authorizePublisher, isMockGuestSession } from "@/features/auth/publishGate";
import { MOCK_SESSION_USER } from "@/features/auth/mock-user";
import type { SessionUser } from "@/features/auth/types";
import type { DbUserWithProfile } from "@/features/auth/publishGate";

describe("session cookie HMAC", () => {
  it("round-trips a session user", () => {
    const secret = "test-secret-for-hmac";
    const user: SessionUser = {
      id: "cuid_member",
      name: "Jordan",
      email: "jordan@example.com",
      role: "VIEWER",
    };
    const token = encodeSessionToken(user, secret);
    const decoded = decodeSessionToken(token, secret);
    expect(decoded?.id).toBe(user.id);
    expect(decoded?.email).toBe(user.email);
    expect(decoded?.name).toBe(user.name);
    expect(decoded?.role).toBe(user.role);
  });

  it("rejects tampered tokens", () => {
    const secret = "test-secret-for-hmac";
    const token = encodeSessionToken(
      {
        id: "x",
        name: "X",
        email: "x@example.com",
        role: "VIEWER",
      },
      secret,
    );
    const [body] = token.split(".");
    expect(decodeSessionToken(`${body}.deadbeef`, secret)).toBeNull();
  });

  it("exposes a non-production secret helper when env unset", () => {
    // In vitest NODE_ENV is typically test — treat like non-production fallback.
    expect(typeof getAuthSecret()).toBe("string");
  });
});

describe("registration validation", () => {
  it("registerMemberAction rejects invalid email", async () => {
    const result = await registerMemberAction({
      name: "Jo",
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
  });

  it("registerMemberAction refuses reserved guest email", async () => {
    const result = await registerMemberAction({
      name: "Guest",
      email: "guest@theartistpost.org",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/reserved/i);
  });

  it("registerArtistAction refuses studioguest handle", async () => {
    const result = await registerArtistAction({
      name: "Real Name",
      email: "real.artist@example.com",
      handle: "studioguest",
      medium: "Musicians",
      intent: "I want to hang sound in the house.",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/reserved/i);
  });

  it("registerArtistAction rejects short intent", async () => {
    const result = await registerArtistAction({
      name: "Real Name",
      email: "real.artist@example.com",
      handle: "realsound",
      medium: "Musicians",
      intent: "short",
    });
    expect(result.ok).toBe(false);
  });
});

describe("engagement requires real session", () => {
  it("createCommentAction refuses anonymous", async () => {
    const result = await createCommentAction({
      postId: "post_fake",
      body: "Hello wall",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/join/i);
  });

  it("toggleLikeAction refuses anonymous", async () => {
    const result = await toggleLikeAction({ postId: "post_fake" });
    expect(result.ok).toBe(false);
  });

  it("getLikeStatusAction refuses anonymous", async () => {
    const result = await getLikeStatusAction({ postId: "post_fake" });
    expect(result.ok).toBe(false);
  });
});

describe("pending artist still cannot publish", () => {
  it("unapproved artist fails authorizePublisher", () => {
    const session: SessionUser = {
      id: "u1",
      name: "Waiting",
      email: "waiting@example.com",
      handle: "waiting",
      role: "ARTIST",
    };
    const dbUser = {
      id: "u1",
      email: "waiting@example.com",
      name: "Waiting",
      image: null,
      role: "ARTIST" as const,
      supabaseAuthId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artistProfile: {
        id: "ap1",
        userId: "u1",
        handle: "waiting",
        bio: "Musicians · intent",
        avatarUrl: null,
        socialLinks: null,
        approved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } satisfies DbUserWithProfile;

    expect(authorizePublisher(session, dbUser).ok).toBe(false);
  });

  it("mock guest remains non-authoritative", () => {
    expect(isMockGuestSession(MOCK_SESSION_USER)).toBe(true);
    expect(isMockGuestSession(null)).toBe(true);
  });
});
