import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const db = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    artistProfile: {
      update: vi.fn(),
    },
    post: {
      findFirst: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    like: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  return { db, connected: true };
});

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => (state.connected ? state.db : null),
}));

import { GET as listAdminUsersV1 } from "@/app/api/v1/admin/users/route";
import {
  GET as getAdminUserV1,
  PATCH as patchAdminUserV1,
} from "@/app/api/v1/admin/users/[id]/route";
import {
  GET as listCommentsV1,
  POST as createCommentV1,
} from "@/app/api/v1/posts/[slug]/comments/route";
import { DELETE as deleteCommentV1 } from "@/app/api/v1/posts/[slug]/comments/[id]/route";
import {
  GET as getLikeV1,
  POST as toggleLikeV1,
} from "@/app/api/v1/posts/[slug]/like/route";
import { PATCH as patchMeV1 } from "@/app/api/v1/me/route";
import { encodeSessionToken } from "@/features/auth/sessionCookie";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { publicCatalogWhere } from "@/features/posts/denylist";

const db = state.db;

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_member",
    email: "member@example.com",
    name: "Member One",
    image: null,
    role: "VIEWER",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    artistProfile: null,
    ...overrides,
  };
}

function pendingArtist(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_pending",
    email: "pending@example.com",
    name: "Pending Painter",
    image: null,
    role: "ARTIST",
    createdAt: new Date("2026-01-02T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    artistProfile: {
      id: "ap_pending",
      userId: "user_pending",
      handle: "pendingpainter",
      bio: "Waiting.",
      avatarUrl: null,
      socialLinks: null,
      approved: false,
      createdAt: new Date("2026-01-02T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    },
    ...overrides,
  };
}

function adminUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_admin",
    email: "admin@example.com",
    name: "House Admin",
    image: null,
    role: "ADMIN",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    artistProfile: null,
    ...overrides,
  };
}

function publicPost() {
  return {
    id: "post_1",
    slug: "real-work",
    authorId: "user_artist",
    title: "Real Work",
    description: null,
    mediaUrl: "/uploads/a.webp",
    mediaType: "IMAGE",
    status: "PUBLISHED",
    featured: false,
    publishedAt: new Date("2026-09-01T12:00:00Z"),
    author: {
      id: "user_artist",
      email: "painter@example.com",
      name: "Real Painter",
      artistProfile: {
        id: "ap_1",
        handle: "realpainter",
        approved: true,
      },
    },
    _count: { likes: 2 },
  };
}

function bearerFor(user: { id: string; email: string; name: string; role: string; artistProfile?: { handle: string } | null }) {
  const token = encodeSessionToken(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "VIEWER" | "ARTIST" | "ADMIN",
      handle: user.artistProfile?.handle,
    },
    "test-auth-secret-for-v1",
  );
  return { Authorization: `Bearer ${token}` };
}

function jsonRequest(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  state.connected = true;
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  db.user.findUnique.mockResolvedValue(null);
  db.user.findMany.mockResolvedValue([]);
  db.user.update.mockImplementation(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => ({
    ...adminUser({ id: where.id }),
    ...data,
  }));
  db.artistProfile.update.mockImplementation(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => ({
    id: where.id,
    userId: "user_pending",
    handle: "pendingpainter",
    bio: "Waiting.",
    avatarUrl: null,
    socialLinks: null,
    approved: false,
    createdAt: new Date("2026-01-02T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...data,
  }));
  db.post.findFirst.mockResolvedValue(null);
  db.comment.findMany.mockResolvedValue([]);
  db.comment.count.mockResolvedValue(0);
  db.comment.create.mockResolvedValue({
    id: "c1",
    body: "Beautiful light.",
    postId: "post_1",
    userId: "user_member",
    createdAt: new Date("2026-09-10T12:00:00Z"),
    updatedAt: new Date("2026-09-10T12:00:00Z"),
  });
  db.comment.findFirst.mockResolvedValue(null);
  db.comment.delete.mockResolvedValue({});
  db.like.findUnique.mockResolvedValue(null);
  db.like.create.mockResolvedValue({ id: "like_1" });
  db.like.delete.mockResolvedValue({});
  db.like.count.mockResolvedValue(3);
  db.auditLog.create.mockResolvedValue({ id: "audit_1" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET/POST /api/v1/posts/[slug]/comments", () => {
  it("lists comments for a public post and keeps the catalog filter", async () => {
    db.post.findFirst.mockResolvedValue(publicPost());
    db.comment.findMany.mockResolvedValue([
      {
        id: "c1",
        body: "Gorgeous.",
        createdAt: new Date("2026-09-10T12:00:00Z"),
        user: {
          name: "Member One",
          email: "member@example.com",
          artistProfile: null,
        },
      },
    ]);
    db.comment.count.mockResolvedValue(1);

    const response = await listCommentsV1(
      new Request("http://localhost/api/v1/posts/real-work/comments"),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].author.name).toBe("Member One");
    expect(db.post.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      slug: "real-work",
      ...publicCatalogWhere(),
    });
  });

  it("returns empty items honestly when there are no comments", async () => {
    db.post.findFirst.mockResolvedValue(publicPost());
    const body = await (
      await listCommentsV1(
        new Request("http://localhost/api/v1/posts/real-work/comments"),
        { params: Promise.resolve({ slug: "real-work" }) },
      )
    ).json();
    expect(body.data.items).toEqual([]);
    expect(body.data.commentCount).toBe(0);
  });

  it("requires auth to create a comment", async () => {
    const response = await createCommentV1(
      jsonRequest("http://localhost/api/v1/posts/real-work/comments", "POST", {
        body: "Hi",
      }),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(response.status).toBe(401);
  });

  it("creates a comment for a signed-in member", async () => {
    const user = member();
    db.user.findUnique.mockResolvedValue(user);
    db.post.findFirst.mockResolvedValue(publicPost());

    const response = await createCommentV1(
      jsonRequest(
        "http://localhost/api/v1/posts/real-work/comments",
        "POST",
        { body: "Beautiful light." },
        bearerFor(user),
      ),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.comment.body).toBe("Beautiful light.");
    expect(db.comment.create).toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalled();
  });

  it("rejects empty comment bodies", async () => {
    const user = member();
    db.user.findUnique.mockResolvedValue(user);
    const response = await createCommentV1(
      jsonRequest(
        "http://localhost/api/v1/posts/real-work/comments",
        "POST",
        { body: "   " },
        bearerFor(user),
      ),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(response.status).toBe(400);
    expect(db.comment.create).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/posts/[slug]/comments/[id]", () => {
  it("lets the author delete their own comment", async () => {
    const user = member();
    db.user.findUnique.mockResolvedValue(user);
    db.post.findFirst.mockResolvedValue(publicPost());
    db.comment.findFirst.mockResolvedValue({
      id: "c1",
      userId: user.id,
      postId: "post_1",
      body: "Bye",
    });

    const response = await deleteCommentV1(
      jsonRequest(
        "http://localhost/api/v1/posts/real-work/comments/c1",
        "DELETE",
        undefined,
        bearerFor(user),
      ),
      { params: Promise.resolve({ slug: "real-work", id: "c1" }) },
    );
    expect(response.status).toBe(200);
    expect(db.comment.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("forbids deleting someone else's comment", async () => {
    const user = member();
    db.user.findUnique.mockResolvedValue(user);
    db.post.findFirst.mockResolvedValue(publicPost());
    db.comment.findFirst.mockResolvedValue({
      id: "c1",
      userId: "someone_else",
      postId: "post_1",
      body: "Nope",
    });

    const response = await deleteCommentV1(
      jsonRequest(
        "http://localhost/api/v1/posts/real-work/comments/c1",
        "DELETE",
        undefined,
        bearerFor(user),
      ),
      { params: Promise.resolve({ slug: "real-work", id: "c1" }) },
    );
    expect(response.status).toBe(403);
    expect(db.comment.delete).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/posts/[slug]/like", () => {
  it("toggles a like on for a member", async () => {
    const user = member();
    db.user.findUnique.mockResolvedValue(user);
    db.post.findFirst.mockResolvedValue(publicPost());
    db.like.findUnique.mockResolvedValue(null);
    db.like.count.mockResolvedValue(3);

    const response = await toggleLikeV1(
      jsonRequest(
        "http://localhost/api/v1/posts/real-work/like",
        "POST",
        {},
        bearerFor(user),
      ),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ liked: true, likeCount: 3 });
  });

  it("returns like state anonymously without inventing likedByMe", async () => {
    db.post.findFirst.mockResolvedValue(publicPost());
    const body = await (
      await getLikeV1(
        new Request("http://localhost/api/v1/posts/real-work/like"),
        { params: Promise.resolve({ slug: "real-work" }) },
      )
    ).json();
    expect(body.data).toEqual({ likedByMe: null, likeCount: 2 });
  });
});

describe("admin users detail + approval", () => {
  it("forbids non-admins from the customer list", async () => {
    const user = member();
    db.user.findUnique.mockResolvedValue(user);
    const response = await listAdminUsersV1(
      new Request("http://localhost/api/v1/admin/users", {
        headers: bearerFor(user),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("filters pending artists when requested", async () => {
    const admin = adminUser();
    db.user.findUnique.mockResolvedValue(admin);
    db.user.findMany.mockResolvedValue([pendingArtist()]);

    const response = await listAdminUsersV1(
      new Request("http://localhost/api/v1/admin/users?pendingArtist=1", {
        headers: bearerFor(admin),
      }),
    );
    expect(response.status).toBe(200);
    expect(db.user.findMany.mock.calls[0]?.[0].where).toEqual({
      artistProfile: { is: { approved: false } },
    });
    const body = await response.json();
    expect(body.data.items[0].artistApproved).toBe(false);
  });

  it("approves a pending artist without inventing a profile", async () => {
    const admin = adminUser();
    const pending = pendingArtist();
    db.user.findUnique
      .mockResolvedValueOnce(admin) // requireAdmin
      .mockResolvedValueOnce(pending) // patch target
      .mockResolvedValueOnce({
        ...pending,
        role: "ARTIST",
        artistProfile: { ...pending.artistProfile, approved: true },
        _count: { posts: 0, comments: 0, likes: 0 },
      }); // getAdminUserById

    const response = await patchAdminUserV1(
      jsonRequest(
        "http://localhost/api/v1/admin/users/user_pending",
        "PATCH",
        { artistApproved: true },
        bearerFor(admin),
      ),
      { params: Promise.resolve({ id: "user_pending" }) },
    );
    expect(response.status).toBe(200);
    expect(db.artistProfile.update).toHaveBeenCalledWith({
      where: { id: "ap_pending" },
      data: { approved: true },
    });
    const body = await response.json();
    expect(body.data.user.artistApproved).toBe(true);
  });

  it("rejects approval when there is no artist profile", async () => {
    const admin = adminUser();
    const viewer = member();
    db.user.findUnique
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(viewer);

    const response = await patchAdminUserV1(
      jsonRequest(
        "http://localhost/api/v1/admin/users/user_member",
        "PATCH",
        { artistApproved: true },
        bearerFor(admin),
      ),
      { params: Promise.resolve({ id: "user_member" }) },
    );
    expect(response.status).toBe(409);
    expect(db.artistProfile.update).not.toHaveBeenCalled();
  });

  it("returns admin user detail with counts", async () => {
    const admin = adminUser();
    const pending = pendingArtist();
    db.user.findUnique
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce({
        ...pending,
        _count: { posts: 2, comments: 1, likes: 4 },
      });

    const response = await getAdminUserV1(
      new Request("http://localhost/api/v1/admin/users/user_pending", {
        headers: bearerFor(admin),
      }),
      { params: Promise.resolve({ id: "user_pending" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.user.postCount).toBe(2);
    expect(body.data.user.handle).toBe("pendingpainter");
  });

  it("blocks self-demotion from ADMIN", async () => {
    const admin = adminUser();
    db.user.findUnique
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(admin);

    const response = await patchAdminUserV1(
      jsonRequest(
        "http://localhost/api/v1/admin/users/user_admin",
        "PATCH",
        { role: "VIEWER" },
        bearerFor(admin),
      ),
      { params: Promise.resolve({ id: "user_admin" }) },
    );
    expect(response.status).toBe(409);
  });
});

describe("PATCH /api/v1/me", () => {
  it("updates display name for a member", async () => {
    const user = member();
    db.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, name: "New Name" });
    db.user.update.mockResolvedValue({ ...user, name: "New Name" });

    const response = await patchMeV1(
      jsonRequest(
        "http://localhost/api/v1/me",
        "PATCH",
        { name: "New Name" },
        bearerFor(user),
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.user.name).toBe("New Name");
    expect(body.data.profile).toBeNull();
  });

  it("rejects bio updates without an artist profile", async () => {
    const user = member();
    db.user.findUnique.mockResolvedValue(user);
    const response = await patchMeV1(
      jsonRequest(
        "http://localhost/api/v1/me",
        "PATCH",
        { bio: "I paint." },
        bearerFor(user),
      ),
    );
    expect(response.status).toBe(409);
  });
});
