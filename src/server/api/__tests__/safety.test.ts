// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { GET as adminReportsV1 } from "@/app/api/v1/admin/reports/route";
import { PATCH as actReportV1 } from "@/app/api/v1/admin/reports/[id]/route";
import { GET as artistV1 } from "@/app/api/v1/artists/[handle]/route";
import {
  GET as blocksV1,
  POST as blockV1,
} from "@/app/api/v1/blocks/route";
import { DELETE as unblockV1 } from "@/app/api/v1/blocks/[handle]/route";
import { POST as createCommunityV1 } from "@/app/api/v1/community/route";
import { DELETE as deleteMeV1 } from "@/app/api/v1/me/route";
import { GET as feedV1 } from "@/app/api/v1/feed/route";
import {
  GET as commentsV1,
  POST as commentCreateV1,
} from "@/app/api/v1/posts/[slug]/comments/route";
import { GET as postV1 } from "@/app/api/v1/posts/[slug]/route";
import { POST as likeV1 } from "@/app/api/v1/posts/[slug]/like/route";
import { POST as reportV1 } from "@/app/api/v1/reports/route";
import { POST as studioPostsV1 } from "@/app/api/v1/studio/posts/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { BLOCKED_TERMS, KIND_MESSAGE } from "@/server/api/textFilter";
import {
  artistRow,
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const BASE = "http://localhost/api/v1";
const ORIGIN = "https://theartistpost.fluxlab.agency";

const me = userRow({ id: "user_viewer", handle: "viewer", name: "Vera Viewer" });
const robbi = userRow({ id: "user_robbi", handle: "robbi", name: "Robbi" });
const admin = userRow({ id: "user_admin", handle: "boss", role: "ADMIN", name: "Boss" });

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/v1/blocks", () => {
  it("blocks, removing follows and notifications in both directions", async () => {
    const auth = signInAs(me);
    db.user.findFirst.mockResolvedValue(robbi);
    const response = await blockV1(
      jsonRequest(`${BASE}/blocks`, "POST", { handle: "@Robbi" }, auth),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ blocked: true });
    expect(db.block.create).toHaveBeenCalledWith({
      data: { blockerId: me.id, blockedId: robbi.id },
    });
    expect(db.follow.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { followerId: me.id, followingId: robbi.id },
          { followerId: robbi.id, followingId: me.id },
        ],
      },
    });
    expect(db.notification.deleteMany.mock.calls[0]?.[0].where.OR).toEqual([
      { userId: me.id, actorId: robbi.id },
      { userId: robbi.id, actorId: me.id },
    ]);
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "block.create",
    );
  });

  it("rejects blocking yourself", async () => {
    const response = await blockV1(
      jsonRequest(`${BASE}/blocks`, "POST", { handle: "viewer" }, signInAs(me)),
    );
    expect(response.status).toBe(400);
    expect(db.block.create).not.toHaveBeenCalled();
  });

  it("404s for an unknown handle and is idempotent for a repeat", async () => {
    db.user.findFirst.mockResolvedValue(null);
    expect(
      (
        await blockV1(
          jsonRequest(`${BASE}/blocks`, "POST", { handle: "ghost" }, signInAs(me)),
        )
      ).status,
    ).toBe(404);

    db.user.findFirst.mockResolvedValue(robbi);
    db.block.findUnique.mockResolvedValue({ blockerId: me.id, blockedId: robbi.id });
    const again = await blockV1(
      jsonRequest(`${BASE}/blocks`, "POST", { handle: "robbi" }, signInAs(me)),
    );
    expect(again.status).toBe(200);
    expect(db.block.create).not.toHaveBeenCalled();
  });

  it("requires sign-in and an unsuspended account", async () => {
    expect(
      (await blockV1(jsonRequest(`${BASE}/blocks`, "POST", { handle: "robbi" }))).status,
    ).toBe(401);
    const suspended = userRow({ id: "user_s", suspendedAt: new Date() });
    expect(
      (
        await blockV1(
          jsonRequest(`${BASE}/blocks`, "POST", { handle: "robbi" }, signInAs(suspended)),
        )
      ).status,
    ).toBe(403);
  });
});

describe("GET /blocks and DELETE /blocks/[handle]", () => {
  it("lists the people you blocked as person summaries", async () => {
    db.block.findMany.mockResolvedValue([{ blocked: robbi }]);
    const { data } = await (
      await blocksV1(getRequest(`${BASE}/blocks`, signInAs(me)))
    ).json();
    expect(data).toEqual([
      {
        id: robbi.id,
        handle: "robbi",
        name: "Robbi",
        avatarUrl: null,
        headline: null,
        isArtist: false,
        viewerFollows: false,
      },
    ]);
    expect(db.block.findMany.mock.calls[0]?.[0].where).toEqual({ blockerId: me.id });
  });

  it("unblocks", async () => {
    db.user.findFirst.mockResolvedValue(robbi);
    db.block.deleteMany.mockResolvedValue({ count: 1 });
    const response = await unblockV1(
      jsonRequest(`${BASE}/blocks/robbi`, "DELETE", undefined, signInAs(me)),
      { params: Promise.resolve({ handle: "robbi" }) },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ blocked: false });
    expect(db.block.deleteMany).toHaveBeenCalledWith({
      where: { blockerId: me.id, blockedId: robbi.id },
    });
  });
});

describe("blocked content disappears", () => {
  it("drops a blocked author's comments from the blocker's list, and hidden comments for everyone", async () => {
    db.post.findFirst.mockResolvedValue({
      id: "post_1",
      slug: "real-work",
      authorId: "user_artist",
      author: { email: "painter@example.com", artistProfile: { approved: true } },
      _count: { likes: 0 },
    });
    db.block.findMany.mockResolvedValue([{ blockerId: me.id, blockedId: "user_bad" }]);
    await commentsV1(
      getRequest(`${BASE}/posts/real-work/comments`, signInAs(me)),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    const where = db.comment.findMany.mock.calls[0]?.[0].where;
    expect(where.hiddenAt).toBeNull();
    expect(where.user.id).toEqual({ notIn: ["user_bad"] });
    expect(db.comment.count.mock.calls[0]?.[0].where).toEqual(where);

    // anonymous: still hides hidden comments, no block filter
    db.comment.findMany.mockClear();
    await commentsV1(getRequest(`${BASE}/posts/real-work/comments`), {
      params: Promise.resolve({ slug: "real-work" }),
    });
    const anon = db.comment.findMany.mock.calls[0]?.[0].where;
    expect(anon.hiddenAt).toBeNull();
    expect(anon.user.id).toBeUndefined();
  });

  it("returns a member's own User.handle (no ArtistProfile) on every comment", async () => {
    db.post.findFirst.mockResolvedValue({
      id: "post_1",
      slug: "real-work",
      authorId: "user_artist",
      author: { email: "painter@example.com", artistProfile: { approved: true } },
      _count: { likes: 0 },
    });
    db.comment.findMany.mockResolvedValue([
      {
        id: "c1",
        body: "Gorgeous.",
        createdAt: new Date("2026-09-10T12:00:00Z"),
        user: {
          name: "Member One",
          email: "m@example.com",
          handle: "member_one",
          image: "/uploads/m.webp",
          artistProfile: null,
        },
      },
    ]);
    db.comment.count.mockResolvedValue(1);
    const { data } = await (
      await commentsV1(getRequest(`${BASE}/posts/real-work/comments`), {
        params: Promise.resolve({ slug: "real-work" }),
      })
    ).json();
    expect(data.items[0].author).toEqual({
      name: "Member One",
      handle: "member_one",
      avatarUrl: `${ORIGIN}/uploads/m.webp`,
    });

    // creating a comment returns the same author shape
    const writer = userRow({ id: "user_w", handle: "writer_w", image: null });
    db.comment.create.mockResolvedValue({
      id: "c2",
      body: "Lovely.",
      createdAt: new Date("2026-09-11T12:00:00Z"),
    });
    const created = await commentCreateV1(
      jsonRequest(`${BASE}/posts/real-work/comments`, "POST", { body: "Lovely." }, signInAs(writer)),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect((await created.json()).data.comment.author).toEqual({
      name: "Member One",
      handle: "writer_w",
      avatarUrl: null,
    });
  });

  it("embedded comments on the post detail hide hidden and blocked ones and carry handles", async () => {
    const postRow = {
      id: "p1",
      authorId: "user_artist",
      title: "Real Work",
      slug: "real-work",
      description: null,
      mediaUrl: "/uploads/p1.webp",
      mediaType: "IMAGE",
      theme: null,
      status: "PUBLISHED",
      featured: false,
      viewCount: 0,
      publishedAt: new Date("2026-09-01T12:00:00Z"),
      createdAt: new Date("2026-09-01T12:00:00Z"),
      updatedAt: new Date("2026-09-01T12:00:00Z"),
      author: artistRow("realpainter", { email: "painter@example.com" }),
      tags: [],
      _count: { likes: 0, comments: 1 },
      comments: [
        {
          id: "c1",
          body: "Hi",
          createdAt: new Date("2026-09-02T00:00:00Z"),
          user: { id: "u1", name: "Ada", image: null, handle: "ada", artistProfile: null },
        },
      ],
    };
    db.post.findFirst.mockResolvedValue(postRow);
    db.block.findMany.mockResolvedValue([{ blockerId: me.id, blockedId: "user_bad" }]);
    const response = await postV1(getRequest(`${BASE}/posts/real-work`, signInAs(me)), {
      params: Promise.resolve({ slug: "real-work" }),
    });
    const include = db.post.findFirst.mock.calls[0]?.[0].include;
    expect(include.comments.where).toEqual({
      hiddenAt: null,
      userId: { notIn: ["user_bad"] },
    });
    expect(include._count.select.comments).toEqual({ where: { hiddenAt: null } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).data.comments[0].author.handle).toBe("ada");
  });

  it("404s the post detail when the author and viewer are blocked, either way", async () => {
    const wallPost = (authorId: string) => ({
      id: "p1",
      authorId,
      title: "Real Work",
      slug: "real-work",
      description: null,
      mediaUrl: "/uploads/p1.webp",
      mediaType: "IMAGE",
      theme: null,
      status: "PUBLISHED",
      featured: false,
      viewCount: 0,
      publishedAt: new Date("2026-09-01T12:00:00Z"),
      createdAt: new Date("2026-09-01T12:00:00Z"),
      updatedAt: new Date("2026-09-01T12:00:00Z"),
      author: artistRow("realpainter", { id: authorId, email: "painter@example.com" }),
      tags: [],
      _count: { likes: 0, comments: 0 },
      comments: [],
    });
    const ctx = { params: Promise.resolve({ slug: "real-work" }) };

    for (const edge of [
      { blockerId: me.id, blockedId: "user_artist" },
      { blockerId: "user_artist", blockedId: me.id },
    ]) {
      db.post.findFirst.mockResolvedValue(wallPost("user_artist"));
      db.block.findMany.mockResolvedValue([edge]);
      const blocked = await postV1(getRequest(`${BASE}/posts/real-work`, signInAs(me)), ctx);
      expect(blocked.status).toBe(404);
    }

    // an unrelated block, or no session, still reads the post
    db.block.findMany.mockResolvedValue([{ blockerId: me.id, blockedId: "user_other" }]);
    expect(
      (await postV1(getRequest(`${BASE}/posts/real-work`, signInAs(me)), ctx)).status,
    ).toBe(200);
    db.block.findMany.mockResolvedValue([]);
    expect((await postV1(getRequest(`${BASE}/posts/real-work`), ctx)).status).toBe(200);
  });

  it("hides blocked artists' works from the explore feed and author pages", async () => {
    db.block.findMany.mockResolvedValue([{ blockerId: me.id, blockedId: "user_artist" }]);
    const feed = await feedV1(getRequest(`${BASE}/feed`, signInAs(me)));
    expect(feed.headers.get("cache-control")).toBe("no-store");
    expect(db.post.findMany.mock.calls[0]?.[0].where.authorId).toEqual({
      notIn: ["user_artist"],
    });

    db.artistProfile.findUnique.mockResolvedValue({ userId: "user_artist" });
    db.block.findMany.mockResolvedValue([{ blockerId: me.id, blockedId: "user_artist" }]);
    const page = await artistV1(
      getRequest(`${BASE}/artists/realpainter`, signInAs(me)),
      { params: Promise.resolve({ handle: "realpainter" }) },
    );
    expect(page.status).toBe(404);
  });

  it("keeps the anonymous explore feed public-cacheable and unfiltered", async () => {
    const feed = await feedV1(getRequest(`${BASE}/feed`));
    expect(feed.headers.get("cache-control")).toBe("public, max-age=60");
    expect(db.post.findMany.mock.calls[0]?.[0].where.authorId).toBeUndefined();
  });

  it("screens comment text", async () => {
    const response = await commentCreateV1(
      jsonRequest(
        `${BASE}/posts/real-work/comments`,
        "POST",
        { body: `you ${BLOCKED_TERMS[0]}` },
        signInAs(me),
      ),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe(KIND_MESSAGE);
    expect(db.comment.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/reports", () => {
  // `setup` runs after sign-in is queued, so one-shot mocks hit the right call.
  const report = (body: unknown, setup?: () => void) => {
    const auth = signInAs(me);
    setup?.();
    return reportV1(jsonRequest(`${BASE}/reports`, "POST", body, auth));
  };

  it("requires sign-in", async () => {
    expect(
      (
        await reportV1(
          jsonRequest(`${BASE}/reports`, "POST", {
            targetType: "USER",
            targetId: "x",
            reason: "spam",
          }),
        )
      ).status,
    ).toBe(401);
  });

  it("rejects reporting yourself or your own content", async () => {
    const self = await report({ targetType: "USER", targetId: me.id, reason: "spam" });
    expect(self.status).toBe(400);

    db.communityPost.findUnique.mockResolvedValue({ authorId: me.id });
    const own = await report({ targetType: "COMMUNITY_POST", targetId: "cp1", reason: "spam" });
    expect(own.status).toBe(400);
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("validates reason, target type and note length", async () => {
    for (const body of [
      { targetType: "USER", targetId: "u2", reason: "boring" },
      { targetType: "ALIEN", targetId: "u2", reason: "spam" },
      { targetType: "USER", targetId: "u2", reason: "spam", note: "x".repeat(501) },
    ]) {
      expect((await report(body)).status).toBe(400);
    }
  });

  it("404s when the target is gone", async () => {
    db.comment.findUnique.mockResolvedValue(null);
    expect(
      (await report({ targetType: "COMMENT", targetId: "gone", reason: "spam" })).status,
    ).toBe(404);
  });

  it("creates a report (201) and a repeat returns the same id (200)", async () => {
    db.report.create.mockResolvedValue({ id: "rep_1" });
    const first = await report(
      {
        targetType: "USER",
        targetId: robbi.id,
        reason: "harassment",
        note: "  rude  ",
      },
      () => db.user.findUnique.mockResolvedValueOnce({ id: robbi.id }),
    );
    expect(first.status).toBe(201);
    expect((await first.json()).data).toEqual({ id: "rep_1" });
    expect(db.report.create.mock.calls[0]?.[0].data).toMatchObject({
      reporterId: me.id,
      targetType: "USER",
      targetId: robbi.id,
      reason: "harassment",
      note: "rude",
    });
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "report.create",
    );

    db.report.findUnique.mockResolvedValue({ id: "rep_1" });
    db.report.create.mockClear();
    const again = await report(
      {
        targetType: "USER",
        targetId: robbi.id,
        reason: "harassment",
      },
      () => db.user.findUnique.mockResolvedValueOnce({ id: robbi.id }),
    );
    expect(again.status).toBe(200);
    expect((await again.json()).data).toEqual({ id: "rep_1" });
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("auto-hides a board post on the third distinct open report, not before", async () => {
    db.communityPost.findUnique.mockResolvedValue({ authorId: robbi.id });
    db.report.create.mockResolvedValue({ id: "rep_n" });

    db.report.count.mockResolvedValueOnce(2);
    await report({ targetType: "COMMUNITY_POST", targetId: "cp1", reason: "spam" });
    expect(db.communityPost.updateMany).not.toHaveBeenCalled();

    db.report.count.mockResolvedValueOnce(3);
    await report({ targetType: "COMMUNITY_POST", targetId: "cp1", reason: "spam" });
    const call = db.communityPost.updateMany.mock.calls[0]?.[0];
    expect(call.where).toEqual({ id: "cp1", hiddenAt: null });
    expect(call.data.hiddenAt).toBeInstanceOf(Date);
    expect(db.report.count.mock.calls[0]?.[0].where).toEqual({
      targetType: "COMMUNITY_POST",
      targetId: "cp1",
      status: "OPEN",
    });
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "moderation.auto_hide",
    );
  });

  it("auto-hides a comment with hiddenAt and archives a Wall post", async () => {
    db.report.create.mockResolvedValue({ id: "rep_n" });
    db.report.count.mockResolvedValue(3);

    db.comment.findUnique.mockResolvedValue({ userId: robbi.id });
    await report({ targetType: "COMMENT", targetId: "cm1", reason: "hate" });
    expect(db.comment.updateMany.mock.calls[0]?.[0].data.hiddenAt).toBeInstanceOf(Date);

    db.post.findUnique.mockResolvedValue({ authorId: robbi.id });
    await report({ targetType: "POST", targetId: "po1", reason: "sexual" });
    expect(db.post.updateMany).toHaveBeenCalledWith({
      where: { id: "po1", status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
  });

  it("never auto-hides a person", async () => {
    db.report.create.mockResolvedValue({ id: "rep_n" });
    db.report.count.mockResolvedValue(9);
    await report(
      { targetType: "USER", targetId: robbi.id, reason: "impersonation" },
      () => db.user.findUnique.mockResolvedValueOnce({ id: robbi.id }),
    );
    expect(db.report.count).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/admin/reports", () => {
  it("forbids non-admins", async () => {
    const response = await adminReportsV1(getRequest(`${BASE}/admin/reports`, signInAs(me)));
    expect(response.status).toBe(403);
    expect(db.report.groupBy).not.toHaveBeenCalled();
  });

  it("lists one row per target with its count, defaulting to OPEN", async () => {
    db.report.groupBy.mockResolvedValue([
      { targetType: "COMMENT", targetId: "cm1", _count: { _all: 3 } },
    ]);
    db.report.findFirst.mockResolvedValue({
      id: "rep_9",
      targetType: "COMMENT",
      targetId: "cm1",
      reason: "hate",
      note: null,
      status: "OPEN",
      createdAt: new Date("2026-10-14T10:00:00Z"),
      reporter: { handle: "viewer", name: "Vera" },
    });
    db.comment.findUnique.mockResolvedValue({ body: "A rude comment", userId: robbi.id });
    const auth = signInAs(admin);
    db.user.findUnique.mockResolvedValue({ id: robbi.id, name: "Robbi", handle: "robbi" });

    const response = await adminReportsV1(getRequest(`${BASE}/admin/reports`, auth));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toEqual({
      items: [
        {
          id: "rep_9",
          targetType: "COMMENT",
          targetId: "cm1",
          reason: "hate",
          note: null,
          status: "OPEN",
          reportCount: 3,
          preview: "A rude comment",
          owner: { id: robbi.id, name: "Robbi", handle: "robbi" },
          reporter: { handle: "viewer", name: "Vera" },
          createdAt: "2026-10-14T10:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
    expect(db.report.groupBy.mock.calls[0]?.[0]).toMatchObject({
      by: ["targetType", "targetId"],
      where: { status: "OPEN" },
      skip: 0,
      take: 21,
    });
  });

  it("pages with an offset cursor and rejects a bad status", async () => {
    db.report.groupBy.mockResolvedValue(
      ["a", "b", "c"].map((id) => ({
        targetType: "USER",
        targetId: id,
        _count: { _all: 1 },
      })),
    );
    db.report.findFirst.mockResolvedValue(null);
    const { data } = await (
      await adminReportsV1(
        getRequest(`${BASE}/admin/reports?take=2&cursor=4&status=DISMISSED`, signInAs(admin)),
      )
    ).json();
    expect(data.nextCursor).toBe("6");
    expect(db.report.groupBy.mock.calls[0]?.[0]).toMatchObject({
      where: { status: "DISMISSED" },
      skip: 4,
      take: 3,
    });

    const bad = await adminReportsV1(
      getRequest(`${BASE}/admin/reports?status=NOPE`, signInAs(admin)),
    );
    expect(bad.status).toBe(400);
  });
});

describe("PATCH /api/v1/admin/reports/[id]", () => {
  const reportRow = (over: Record<string, unknown> = {}) => ({
    id: "rep_1",
    targetType: "COMMENT",
    targetId: "cm1",
    reason: "hate",
    note: null,
    status: "OPEN",
    createdAt: new Date("2026-10-14T10:00:00Z"),
    reporter: { handle: "viewer", name: "Vera" },
    ...over,
  });
  const act = (body: unknown, user = admin) =>
    actReportV1(
      jsonRequest(`${BASE}/admin/reports/rep_1`, "PATCH", body, signInAs(user)),
      { params: Promise.resolve({ id: "rep_1" }) },
    );

  it("is admin only", async () => {
    expect((await act({ action: "hide" }, me)).status).toBe(403);
    expect(db.report.updateMany).not.toHaveBeenCalled();
  });

  it("hide on a COMMENT sets hiddenAt and resolves every open report on it", async () => {
    db.report.findUnique.mockResolvedValue(reportRow());
    db.report.updateMany.mockResolvedValue({ count: 3 });
    db.comment.findUnique.mockResolvedValue({ body: "Rude" });
    const response = await act({ action: "hide", reason: "abusive" });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({ id: "rep_1", status: "ACTIONED", reportCount: 3, preview: "Rude" });
    const hide = db.comment.updateMany.mock.calls[0]?.[0];
    expect(hide.where).toEqual({ id: "cm1", hiddenAt: null });
    expect(hide.data.hiddenAt).toBeInstanceOf(Date);
    expect(db.report.updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { targetType: "COMMENT", targetId: "cm1", status: "OPEN" },
      data: { status: "ACTIONED", resolvedById: admin.id },
    });
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "moderation.hide",
    );
  });

  it("dismiss closes the reports and restores an auto-hidden comment", async () => {
    db.report.findUnique.mockResolvedValue(reportRow());
    db.report.updateMany.mockResolvedValue({ count: 3 });
    const response = await act({ action: "dismiss" });
    expect((await response.json()).data.status).toBe("DISMISSED");
    expect(db.comment.updateMany).toHaveBeenCalledWith({
      where: { id: "cm1" },
      data: { hiddenAt: null },
    });
  });

  it("suspend_user sets suspendedAt on the owner and hides the content", async () => {
    db.report.findUnique.mockResolvedValue(reportRow());
    db.report.updateMany.mockResolvedValue({ count: 1 });
    db.comment.findUnique.mockResolvedValue({ userId: robbi.id, body: "Rude" });
    db.user.findUnique.mockResolvedValue({ role: "VIEWER" });
    const response = await act({ action: "suspend_user" });
    expect(response.status).toBe(200);
    const update = db.user.update.mock.calls[0]?.[0];
    expect(update.where).toEqual({ id: robbi.id });
    expect(update.data.suspendedAt).toBeInstanceOf(Date);
    expect(db.comment.updateMany).toHaveBeenCalled();
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "moderation.suspend_user",
    );
  });

  it("will not suspend an admin or yourself, and cannot hide a person", async () => {
    db.report.findUnique.mockResolvedValue(reportRow());
    db.comment.findUnique.mockResolvedValue({ userId: robbi.id });
    db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    expect((await act({ action: "suspend_user" })).status).toBe(409);

    db.report.findUnique.mockResolvedValue(
      reportRow({ targetType: "USER", targetId: admin.id }),
    );
    db.user.findUnique.mockResolvedValue({ id: admin.id, role: "ADMIN" });
    expect((await act({ action: "suspend_user" })).status).toBe(409);

    db.report.findUnique.mockResolvedValue(reportRow({ targetType: "USER", targetId: "u9" }));
    expect((await act({ action: "hide" })).status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("404s for an unknown report and 400s for an unknown action", async () => {
    db.report.findUnique.mockResolvedValue(null);
    expect((await act({ action: "hide" })).status).toBe(404);
    expect((await act({ action: "explode" })).status).toBe(400);
  });
});

describe("suspended users are read-only", () => {
  const suspended = userRow({ id: "user_sus", handle: "sus", suspendedAt: new Date() });

  it("cannot post to the board", async () => {
    const response = await createCommunityV1(
      jsonRequest(`${BASE}/community`, "POST", { kind: "UPDATE", body: "hi" }, signInAs(suspended)),
    );
    expect(response.status).toBe(403);
    expect(db.communityPost.create).not.toHaveBeenCalled();
  });

  it("cannot like or comment on the Wall", async () => {
    const like = await likeV1(
      jsonRequest(`${BASE}/posts/real-work/like`, "POST", {}, signInAs(suspended)),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(like.status).toBe(403);
    const comment = await commentCreateV1(
      jsonRequest(`${BASE}/posts/real-work/comments`, "POST", { body: "hi" }, signInAs(suspended)),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(comment.status).toBe(403);
    expect(db.like.create).not.toHaveBeenCalled();
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it("an approved artist cannot publish while suspended", async () => {
    const artist = artistRow("realpainter", { suspendedAt: new Date() });
    const response = await studioPostsV1(
      jsonRequest(`${BASE}/studio/posts`, "POST", { title: "New", status: "PUBLISHED" }, signInAs(artist)),
    );
    expect(response.status).toBe(403);
    expect(db.post.create).not.toHaveBeenCalled();
  });

  it("can still read, and can still delete their account", async () => {
    const read = await blocksV1(getRequest(`${BASE}/blocks`, signInAs(suspended)));
    expect(read.status).toBe(200);
    const del = await deleteMeV1(
      jsonRequest(`${BASE}/me`, "DELETE", { confirm: "DELETE" }, signInAs(suspended)),
    );
    expect(del.status).toBe(200);
    expect(db.user.delete).toHaveBeenCalledTimes(1);
  });
});
