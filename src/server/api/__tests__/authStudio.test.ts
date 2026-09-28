import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const db = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    artistProfile: {
      findUnique: vi.fn(),
    },
    authChallenge: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    post: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
    },
  };
  return { db, connected: true };
});

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => (state.connected ? state.db : null),
}));

import { POST as joinV1 } from "@/app/api/v1/auth/join/route";
import { POST as requestCodeV1 } from "@/app/api/v1/auth/request-code/route";
import { POST as verifyV1 } from "@/app/api/v1/auth/verify/route";
import { GET as meV1 } from "@/app/api/v1/auth/me/route";
import { POST as refreshV1 } from "@/app/api/v1/auth/refresh/route";
import { POST as logoutV1 } from "@/app/api/v1/auth/logout/route";
import { GET as listStudioPostsV1, POST as createStudioPostV1 } from "@/app/api/v1/studio/posts/route";
import { encodeSessionToken } from "@/features/auth/sessionCookie";
import { resetRateLimits } from "@/features/auth/rateLimit";

const db = state.db;

function jsonRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function getRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: "GET", headers });
}

function approvedArtist(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_artist",
    email: "painter@example.com",
    name: "Real Painter",
    image: null,
    role: "ARTIST",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    artistProfile: {
      id: "ap_1",
      userId: "user_artist",
      handle: "realpainter",
      bio: "Paints.",
      avatarUrl: null,
      socialLinks: null,
      approved: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  state.connected = true;
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  vi.stubEnv("AUTH_CODE_ECHO", "1");
  vi.stubEnv("NODE_ENV", "test");
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    if (data.artistProfile) {
      const create = data.artistProfile as { create: Record<string, unknown> };
      return {
        id: "user_new_artist",
        email: data.email,
        name: data.name,
        role: data.role,
        image: null,
        artistProfile: {
          id: "ap_new",
          userId: "user_new_artist",
          handle: create.create.handle,
          bio: create.create.bio,
          approved: false,
          avatarUrl: null,
          socialLinks: create.create.socialLinks,
        },
      };
    }
    return {
      id: "user_new_member",
      email: data.email,
      name: data.name,
      role: data.role,
      image: null,
      artistProfile: null,
    };
  });
  db.artistProfile.findUnique.mockResolvedValue(null);
  db.authChallenge.updateMany.mockResolvedValue({ count: 0 });
  db.authChallenge.create.mockResolvedValue({
    id: "chal_1",
    email: "painter@example.com",
    purpose: "SIGN_IN",
    codeHash: "x",
    attempts: 0,
    expiresAt: new Date(Date.now() + 600_000),
    consumedAt: null,
    createdAt: new Date(),
  });
  db.authChallenge.findFirst.mockResolvedValue(null);
  db.authChallenge.update.mockResolvedValue({});
  db.auditLog.create.mockResolvedValue({});
  db.post.findMany.mockResolvedValue([]);
  db.tag.upsert.mockResolvedValue({ id: "t1", name: "Neon", slug: "neon" });
  db.post.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "post_1",
    slug: data.slug,
    title: data.title,
    description: data.description ?? null,
    status: data.status,
    mediaUrl: data.mediaUrl ?? null,
    mediaType: data.mediaType,
    publishedAt: data.publishedAt ?? null,
    createdAt: new Date("2026-09-28T12:00:00Z"),
    updatedAt: new Date("2026-09-28T12:00:00Z"),
    tags: [{ id: "t1", name: "Neon", slug: "neon" }],
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/v1/auth/join", () => {
  it("creates a member and returns a Bearer token", async () => {
    db.user.findUnique
      .mockResolvedValueOnce(null) // register check
      .mockResolvedValueOnce({
        id: "user_new_member",
        email: "new.member@example.com",
        name: "New Member",
        role: "VIEWER",
        image: null,
        artistProfile: null,
      });

    const response = await joinV1(
      jsonRequest("http://localhost/api/v1/auth/join", {
        door: "member",
        name: "New Member",
        email: "new.member@example.com",
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.token).toMatch(/^.+\..+$/);
    expect(body.data.user.role).toBe("VIEWER");
    expect(body.data.user.email).toBe("new.member@example.com");
  });

  it("refuses an existing email with a sign-in hint", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "existing",
      email: "old@example.com",
      name: "Old",
      role: "VIEWER",
    });

    const response = await joinV1(
      jsonRequest("http://localhost/api/v1/auth/join", {
        door: "member",
        name: "Old",
        email: "old@example.com",
      }),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("conflict");
    expect(body.error.message).toMatch(/sign-in code/i);
  });
});

describe("auth request-code + verify + me", () => {
  it("issues a debug code in test and verifies into a session", async () => {
    const artist = approvedArtist();
    db.user.findUnique.mockResolvedValue(artist);

    const requestResponse = await requestCodeV1(
      jsonRequest("http://localhost/api/v1/auth/request-code", {
        email: "painter@example.com",
      }),
    );
    expect(requestResponse.status).toBe(200);
    const requested = await requestResponse.json();
    expect(requested.data.sent).toBe(true);
    expect(requested.data.debugCode).toMatch(/^\d{6}$/);

    // Wire verify against the same hash the challenge helper stored.
    const created = db.authChallenge.create.mock.calls[0]?.[0]?.data;
    expect(created?.codeHash).toBeTruthy();
    db.authChallenge.findFirst.mockResolvedValue({
      id: "chal_1",
      email: "painter@example.com",
      purpose: "SIGN_IN",
      codeHash: created.codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 600_000),
      consumedAt: null,
      createdAt: new Date(),
    });

    const verifyResponse = await verifyV1(
      jsonRequest("http://localhost/api/v1/auth/verify", {
        email: "painter@example.com",
        code: requested.data.debugCode,
      }),
    );
    expect(verifyResponse.status).toBe(200);
    const verified = await verifyResponse.json();
    expect(verified.data.token).toBeTruthy();
    expect(verified.data.user.role).toBe("ARTIST");
    expect(verified.data.user.artist?.approved).toBe(true);

    const me = await meV1(
      getRequest("http://localhost/api/v1/auth/me", {
        Authorization: `Bearer ${verified.data.token}`,
      }),
    );
    expect(me.status).toBe(200);
    const meBody = await me.json();
    expect(meBody.data.canPublish).toBe(true);
    expect(meBody.data.user.handle).toBe("realpainter");
  });

  it("returns unauthorized without a Bearer token", async () => {
    const response = await meV1(getRequest("http://localhost/api/v1/auth/me"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("unauthorized");
  });
});

describe("auth refresh + logout", () => {
  it("refreshes a valid token and accepts logout", async () => {
    const artist = approvedArtist();
    db.user.findUnique.mockResolvedValue(artist);
    const token = encodeSessionToken(
      {
        id: artist.id,
        email: artist.email,
        name: artist.name,
        role: "ARTIST",
        handle: "realpainter",
      },
      "test-auth-secret-for-v1",
    );

    const refreshed = await refreshV1(
      new Request("http://localhost/api/v1/auth/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(refreshed.status).toBe(200);
    const body = await refreshed.json();
    expect(body.data.token).toMatch(/^.+\..+$/);

    const loggedOut = await logoutV1(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(loggedOut.status).toBe(200);
    expect((await loggedOut.json()).data.signedOut).toBe(true);
  });
});

describe("studio posts", () => {
  it("lets an approved artist create and list own posts", async () => {
    const artist = approvedArtist();
    db.user.findUnique.mockResolvedValue(artist);
    const token = encodeSessionToken(
      {
        id: artist.id,
        email: artist.email,
        name: artist.name,
        role: "ARTIST",
        handle: "realpainter",
      },
      "test-auth-secret-for-v1",
    );

    const created = await createStudioPostV1(
      jsonRequest(
        "http://localhost/api/v1/studio/posts",
        {
          title: "Night Plaster",
          caption: "Wet walls under sodium light.",
          tags: ["Neon"],
          visibility: "PUBLISHED",
          mediaUrl: "/uploads/night.webp",
          mediaType: "IMAGE",
        },
        { Authorization: `Bearer ${token}` },
      ),
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.data.title).toBe("Night Plaster");
    expect(createdBody.data.status).toBe("PUBLISHED");
    expect(createdBody.data.caption).toBe("Wet walls under sodium light.");

    db.post.findMany.mockResolvedValue([
      {
        id: "post_1",
        slug: createdBody.data.slug,
        title: "Night Plaster",
        description: "Wet walls under sodium light.",
        status: "PUBLISHED",
        mediaUrl: "/uploads/night.webp",
        mediaType: "IMAGE",
        publishedAt: new Date("2026-09-28T12:00:00Z"),
        createdAt: new Date("2026-09-28T12:00:00Z"),
        updatedAt: new Date("2026-09-28T12:00:00Z"),
        tags: [{ id: "t1", name: "Neon", slug: "neon" }],
      },
    ]);

    const listed = await listStudioPostsV1(
      getRequest("http://localhost/api/v1/studio/posts", {
        Authorization: `Bearer ${token}`,
      }),
    );
    expect(listed.status).toBe(200);
    const listBody = await listed.json();
    expect(listBody.data.items).toHaveLength(1);
    expect(listBody.data.items[0].title).toBe("Night Plaster");
  });

  it("forbids an unapproved artist from publishing", async () => {
    const pending = approvedArtist({
      artistProfile: {
        id: "ap_1",
        userId: "user_artist",
        handle: "waiting",
        bio: null,
        avatarUrl: null,
        socialLinks: null,
        approved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    db.user.findUnique.mockResolvedValue(pending);
    const token = encodeSessionToken(
      {
        id: pending.id,
        email: pending.email,
        name: pending.name,
        role: "ARTIST",
        handle: "waiting",
      },
      "test-auth-secret-for-v1",
    );

    const response = await createStudioPostV1(
      jsonRequest(
        "http://localhost/api/v1/studio/posts",
        { title: "Nope", visibility: "DRAFT" },
        { Authorization: `Bearer ${token}` },
      ),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("forbidden");
  });
});
