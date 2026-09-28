import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const db = {
    post: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    artistProfile: { findUnique: vi.fn() },
    tag: { findMany: vi.fn() },
  };
  return { db, connected: true };
});

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => (state.connected ? state.db : null),
}));

import { GET as listPostsV1 } from "@/app/api/v1/posts/route";
import { GET as getPostV1 } from "@/app/api/v1/posts/[slug]/route";
import { GET as getArtistV1 } from "@/app/api/v1/artists/[handle]/route";
import { GET as listTagsV1 } from "@/app/api/v1/tags/route";
import { GET as listPostsLegacy } from "@/app/api/posts/route";
import { publicCatalogWhere } from "@/features/posts/denylist";

const db = state.db;
const ORIGIN = "https://theartistpost.fluxlab.agency";

function author(overrides: { email?: string; approved?: boolean } = {}) {
  return {
    id: "user_1",
    email: overrides.email ?? "painter@example.com",
    name: "Real Painter",
    image: null,
    role: "ARTIST",
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

const listV1 = (query = "") =>
  listPostsV1(new Request(`http://localhost/api/v1/posts${query}`));
const detailV1 = (slug: string) =>
  getPostV1(new Request(`http://localhost/api/v1/posts/${slug}`), {
    params: Promise.resolve({ slug }),
  });
const artistV1 = (handle: string) =>
  getArtistV1(new Request(`http://localhost/api/v1/artists/${handle}`), {
    params: Promise.resolve({ handle }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  state.connected = true;
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
  db.post.findMany.mockResolvedValue([]);
  db.post.findFirst.mockResolvedValue(null);
  db.post.count.mockResolvedValue(0);
  db.artistProfile.findUnique.mockResolvedValue(null);
  db.tag.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/v1/posts", () => {
  it("defaults to 12 and keeps the public catalog filter", async () => {
    const response = await listV1();
    expect(response.status).toBe(200);
    const query = db.post.findMany.mock.calls[0]?.[0];
    expect(query.take).toBe(13);
    expect(query.where).toMatchObject(publicCatalogWhere());
  });

  it("caps take at 24", async () => {
    await listV1("?take=500");
    expect(db.post.findMany.mock.calls[0]?.[0].take).toBe(25);
  });

  it.each(["0", "-3", "1.5", "abc", "1e2"])(
    "rejects take=%s with validation_failed",
    async (take) => {
      const response = await listV1(`?take=${take}`);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("validation_failed");
      expect(body.error.fields.take).toMatch(/1 to 24/);
      expect(db.post.findMany).not.toHaveBeenCalled();
    },
  );

  it("rejects a malformed tag or cursor", async () => {
    const tag = await (await listV1("?tag=%3Cscript%3E")).json();
    expect(tag.error.fields.tag).toBeDefined();
    const cursor = await (await listV1("?cursor=a%20b")).json();
    expect(cursor.error.fields.cursor).toBeDefined();
  });

  it("maps posts to summaries with absolute URLs and a next cursor", async () => {
    db.post.findMany.mockResolvedValue([
      postRow("p1"),
      postRow("p2", { mediaUrl: "https://images.unsplash.com/stock.jpg" }),
      postRow("p3"),
    ]);
    const { ok, data } = await (await listV1("?take=2&tag=neon")).json();
    expect(ok).toBe(true);
    expect(db.post.findMany.mock.calls[0]?.[0].where.tags).toEqual({
      some: { slug: "neon" },
    });
    expect(data.nextCursor).toBe("p2");
    expect(data.items).toHaveLength(2);
    expect(data.items[0]).toEqual({
      id: "p1",
      slug: "work-p1",
      title: "Work p1",
      description: "On the wall.",
      media: { url: `${ORIGIN}/uploads/p1.webp`, type: "IMAGE" },
      tags: [{ slug: "neon", name: "Neon" }],
      artist: {
        handle: "realpainter",
        name: "Real Painter",
        avatarUrl: `${ORIGIN}/uploads/avatar.webp`,
      },
      likeCount: 4,
      commentCount: 2,
      publishedAt: "2026-09-01T12:00:00.000Z",
    });
    // Stock placeholders are swapped for the house coming-soon card.
    expect(data.items[1].media.url).toBe(`${ORIGIN}/brand/coming-soon.webp`);
  });

  it("returns an empty page when there is no database", async () => {
    state.connected = false;
    const response = await listV1();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { items: [], nextCursor: null },
    });
  });
});

describe("GET /api/posts (website)", () => {
  it("also caps take at 24", async () => {
    await listPostsLegacy(new Request("http://localhost/api/posts?take=1000"));
    expect(db.post.findMany.mock.calls[0]?.[0].take).toBe(25);
  });

  it("keeps its default of 9", async () => {
    await listPostsLegacy(new Request("http://localhost/api/posts"));
    expect(db.post.findMany.mock.calls[0]?.[0].take).toBe(10);
  });
});

describe("GET /api/v1/posts/[slug]", () => {
  it("returns a not_found envelope when the post is missing", async () => {
    const response = await detailV1("work-missing");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "not_found", message: "That post is not on the wall." },
    });
  });

  it("404s denied seed slugs without querying", async () => {
    const response = await detailV1("midnight-filament");
    expect(response.status).toBe(404);
    expect(db.post.findFirst).not.toHaveBeenCalled();
  });

  it("404s posts by a denied author", async () => {
    db.post.findFirst.mockResolvedValue({
      ...postRow("p1"),
      author: author({ email: "guest@theartistpost.org" }),
      comments: [],
    });
    expect((await detailV1("work-p1")).status).toBe(404);
  });

  it("returns newest comments first, capped at 50, name only", async () => {
    db.post.findFirst.mockResolvedValue({
      ...postRow("p1"),
      comments: [
        {
          id: "c_old",
          body: "First!",
          createdAt: new Date("2026-09-02T00:00:00Z"),
          user: { id: "u_a", name: "Ada", image: "/uploads/a.webp" },
        },
        {
          id: "c_new",
          body: "Still here.",
          createdAt: new Date("2026-09-03T00:00:00Z"),
          user: { id: "u_b", name: "Bo", image: null },
        },
      ],
    });

    const response = await detailV1("work-p1");
    expect(response.status).toBe(200);
    const query = db.post.findFirst.mock.calls[0]?.[0];
    expect(query.where).toMatchObject({ ...publicCatalogWhere(), slug: "work-p1" });
    expect(query.include.comments.orderBy).toEqual({ createdAt: "desc" });
    expect(query.include.comments.take).toBe(50);

    const { data } = await response.json();
    expect(data.slug).toBe("work-p1");
    expect(data.media.url).toBe(`${ORIGIN}/uploads/p1.webp`);
    expect(data.comments).toEqual([
      {
        id: "c_new",
        body: "Still here.",
        author: { name: "Bo" },
        createdAt: "2026-09-03T00:00:00.000Z",
      },
      {
        id: "c_old",
        body: "First!",
        author: { name: "Ada" },
        createdAt: "2026-09-02T00:00:00.000Z",
      },
    ]);
  });
});

describe("GET /api/v1/artists/[handle]", () => {
  it("404s unknown and unapproved artists", async () => {
    const unknown = await artistV1("nobody");
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error.code).toBe("not_found");

    db.artistProfile.findUnique.mockResolvedValue({
      ...author({ approved: false }).artistProfile,
      user: { ...author(), posts: [] },
    });
    expect((await artistV1("realpainter")).status).toBe(404);
  });

  it("returns the approved profile, only real links, and their posts", async () => {
    db.artistProfile.findUnique.mockResolvedValue({
      ...author().artistProfile,
      socialLinks: {
        instagram: "https://instagram.com/realpainter",
        website: "javascript:alert(1)",
        medium: "Painters",
        intent: "Private join note",
      },
      user: author(),
    });
    db.post.count.mockResolvedValue(1);
    db.post.findMany.mockResolvedValue([postRow("p1")]);

    const response = await artistV1("realpainter");
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.artist).toEqual({
      handle: "realpainter",
      name: "Real Painter",
      bio: "Paints the plaster.",
      avatarUrl: `${ORIGIN}/uploads/avatar.webp`,
      socialLinks: { instagram: "https://instagram.com/realpainter" },
      postCount: 1,
    });
    expect(data.posts).toHaveLength(1);
    expect(data.items).toEqual(data.posts);
    expect(data.postCount).toBe(1);
    expect(data.nextCursor).toBeNull();
    expect(data.posts[0].media.url).toBe(`${ORIGIN}/uploads/p1.webp`);
  });
});

describe("GET /api/v1/tags", () => {
  it("lists tags as { slug, name }", async () => {
    db.tag.findMany.mockResolvedValue([
      { id: "t1", name: "Neon", slug: "neon", createdAt: new Date(), updatedAt: new Date() },
    ]);
    const response = await listTagsV1();
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(await response.json()).toEqual({
      ok: true,
      data: [{ slug: "neon", name: "Neon" }],
    });
  });
});
