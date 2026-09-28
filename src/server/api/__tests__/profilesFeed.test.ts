import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const db = {
    post: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    artistProfile: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    tag: { findMany: vi.fn() },
  };
  return { db, connected: true };
});

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => (state.connected ? state.db : null),
}));

import { GET as getArtistV1 } from "@/app/api/v1/artists/[handle]/route";
import { GET as getArtistTimelineV1 } from "@/app/api/v1/artists/[handle]/timeline/route";
import { GET as getFeedAuthorV1 } from "@/app/api/v1/feed/author/[handle]/route";
import { GET as getFeedV1 } from "@/app/api/v1/feed/route";
import { GET as getMeV1 } from "@/app/api/v1/me/route";
import { GET as listAdminUsersV1 } from "@/app/api/v1/admin/users/route";
import { encodeSessionToken } from "@/features/auth/sessionCookie";
import { publicCatalogWhere } from "@/features/posts/denylist";

const db = state.db;
const ORIGIN = "https://theartistpost.fluxlab.agency";

function author(overrides: { email?: string; approved?: boolean; role?: string } = {}) {
  return {
    id: "user_1",
    email: overrides.email ?? "painter@example.com",
    name: "Real Painter",
    image: null,
    role: overrides.role ?? "ARTIST",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    artistProfile: {
      id: "ap_1",
      userId: "user_1",
      handle: "realpainter",
      bio: "Paints the plaster.",
      avatarUrl: "/uploads/avatar.webp",
      socialLinks: null,
      approved: overrides.approved ?? true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
  };
}

function postRow(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    authorId: "user_1",
    title: `Work ${id}`,
    slug: `work-${id}`,
    description: "On the wall.",
    mediaUrl: `/uploads/${id}.webp`,
    mediaType: "IMAGE",
    theme: null,
    status: "PUBLISHED",
    featured: false,
    viewCount: 3,
    publishedAt: new Date("2026-09-01T12:00:00Z"),
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date("2026-09-01T12:00:00Z"),
    author: author(),
    tags: [{ id: "t1", name: "Neon", slug: "neon" }],
    _count: { likes: 4, comments: 2 },
    ...extra,
  };
}

function bearerFor(user: ReturnType<typeof author>) {
  const token = encodeSessionToken(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ARTIST" | "ADMIN" | "VIEWER",
      handle: user.artistProfile?.handle,
      image: user.image,
    },
    process.env.AUTH_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}

const artistV1 = (handle: string, query = "") =>
  getArtistV1(new Request(`http://localhost/api/v1/artists/${handle}${query}`), {
    params: Promise.resolve({ handle }),
  });

const timelineV1 = (handle: string, query = "") =>
  getArtistTimelineV1(
    new Request(`http://localhost/api/v1/artists/${handle}/timeline${query}`),
    { params: Promise.resolve({ handle }) },
  );

const feedAuthorV1 = (handle: string, query = "") =>
  getFeedAuthorV1(
    new Request(`http://localhost/api/v1/feed/author/${handle}${query}`),
    { params: Promise.resolve({ handle }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.connected = true;
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  db.post.findMany.mockResolvedValue([]);
  db.post.findFirst.mockResolvedValue(null);
  db.post.count.mockResolvedValue(0);
  db.artistProfile.findUnique.mockResolvedValue(null);
  db.user.findUnique.mockResolvedValue(null);
  db.user.findMany.mockResolvedValue([]);
  db.tag.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/v1/artists/[handle] (paginated profile)", () => {
  it("404s unknown and unapproved artists", async () => {
    expect((await artistV1("nobody")).status).toBe(404);

    db.artistProfile.findUnique.mockResolvedValue({
      ...author({ approved: false }).artistProfile,
      user: author({ approved: false }),
    });
    expect((await artistV1("realpainter")).status).toBe(404);
  });

  it("returns profile, postCount, items, and posts alias with pagination", async () => {
    const profile = {
      ...author().artistProfile,
      user: author(),
    };
    db.artistProfile.findUnique.mockResolvedValue(profile);
    db.post.count.mockResolvedValue(3);
    db.post.findMany.mockResolvedValue([
      postRow("p1"),
      postRow("p2"),
      postRow("p3"),
    ]);

    const response = await artistV1("realpainter", "?take=2");
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.artist).toMatchObject({
      handle: "realpainter",
      name: "Real Painter",
      bio: "Paints the plaster.",
      postCount: 3,
    });
    expect(data.postCount).toBe(3);
    expect(data.items).toHaveLength(2);
    expect(data.posts).toEqual(data.items);
    expect(data.nextCursor).toBe("p2");
    expect(db.post.findMany.mock.calls[0]?.[0].where).toMatchObject({
      ...publicCatalogWhere(),
      authorId: "user_1",
    });
  });
});

describe("GET /api/v1/artists/[handle]/timeline + feed/author", () => {
  it("returns an author timeline page", async () => {
    db.artistProfile.findUnique.mockResolvedValue({
      ...author().artistProfile,
      user: author(),
    });
    db.post.count.mockResolvedValue(1);
    db.post.findMany.mockResolvedValue([postRow("p1")]);

    const response = await timelineV1("realpainter");
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.kind).toBe("author");
    expect(data.artist.handle).toBe("realpainter");
    expect(data.artist.postCount).toBe(1);
    expect(data.items).toHaveLength(1);
    expect(data.nextCursor).toBeNull();
  });

  it("mirrors the same payload on /feed/author/[handle]", async () => {
    db.artistProfile.findUnique.mockResolvedValue({
      ...author().artistProfile,
      user: author(),
    });
    db.post.count.mockResolvedValue(1);
    db.post.findMany.mockResolvedValue([postRow("p1")]);

    const response = await feedAuthorV1("realpainter", "?take=1");
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.kind).toBe("author");
    expect(data.items[0].slug).toBe("work-p1");
  });

  it("rejects a bad cursor", async () => {
    const response = await timelineV1("realpainter", "?cursor=not%20ok");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_failed");
  });
});

describe("GET /api/v1/feed", () => {
  it("returns explore feed with followingAvailable false", async () => {
    db.post.findMany.mockResolvedValue([postRow("p1")]);
    const response = await getFeedV1(
      new Request("http://localhost/api/v1/feed?take=12"),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.kind).toBe("explore");
    expect(data.followingAvailable).toBe(false);
    expect(data.items).toHaveLength(1);
    expect(data.nextCursor).toBeNull();
  });

  it("returns empty page when there is no database", async () => {
    state.connected = false;
    const response = await getFeedV1(new Request("http://localhost/api/v1/feed"));
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        kind: "explore",
        items: [],
        nextCursor: null,
        followingAvailable: false,
      },
    });
  });
});

describe("GET /api/v1/me", () => {
  it("requires a session", async () => {
    const response = await getMeV1(new Request("http://localhost/api/v1/me"));
    expect(response.status).toBe(401);
  });

  it("returns user, permissions, and profile for an approved artist", async () => {
    const user = author();
    db.user.findUnique.mockResolvedValue(user);

    const response = await getMeV1(
      new Request("http://localhost/api/v1/me", {
        headers: bearerFor(user),
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.canPublish).toBe(true);
    expect(data.permissions).toEqual({ publish: true, admin: false });
    expect(data.profile).toMatchObject({
      handle: "realpainter",
      approved: true,
      pendingApproval: false,
    });
  });
});

describe("GET /api/v1/admin/users", () => {
  it("forbids non-admins", async () => {
    const user = author();
    db.user.findUnique.mockResolvedValue(user);
    const response = await listAdminUsersV1(
      new Request("http://localhost/api/v1/admin/users", {
        headers: bearerFor(user),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("lists real users for an admin", async () => {
    const admin = {
      ...author({ role: "ADMIN" }),
      artistProfile: null,
    };
    db.user.findUnique.mockResolvedValue(admin);
    db.user.findMany.mockResolvedValue([
      {
        ...author(),
        createdAt: new Date("2026-09-01T00:00:00Z"),
      },
    ]);

    const response = await listAdminUsersV1(
      new Request("http://localhost/api/v1/admin/users", {
        headers: {
          Authorization: `Bearer ${encodeSessionToken(
            {
              id: admin.id,
              email: admin.email,
              name: admin.name,
              role: "ADMIN",
              image: null,
            },
            process.env.AUTH_SECRET!,
          )}`,
        },
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      name: "Real Painter",
      email: "painter@example.com",
      role: "ARTIST",
      handle: "realpainter",
      artistApproved: true,
    });
  });
});
