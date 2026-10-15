// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { GET as listV1 } from "@/app/api/v1/notifications/route";
import { POST as readV1 } from "@/app/api/v1/notifications/read/route";
import { POST as createCommunityV1 } from "@/app/api/v1/community/route";
import { POST as supportV1 } from "@/app/api/v1/community/[id]/support/route";
import { POST as commentV1 } from "@/app/api/v1/posts/[slug]/comments/route";
import { POST as likeV1 } from "@/app/api/v1/posts/[slug]/like/route";
import { POST as followV1 } from "@/app/api/v1/people/[handle]/follow/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { notify, truncatePreview } from "@/server/api/notifications";
import {
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";
import type { PrismaClient } from "@prisma/client";

const BASE = "http://localhost/api/v1";
const prisma = db as unknown as PrismaClient;

const me = userRow({ id: "user_viewer", handle: "viewer", name: "Vera Viewer" });
const robbi = userRow({ id: "user_robbi", handle: "robbi", name: "Robbi" });

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const base = {
  userId: robbi.id,
  actorId: me.id,
  type: "FOLLOW" as const,
  targetKind: "person" as const,
  targetRef: "viewer",
};

describe("notify", () => {
  it("creates a row for a normal notification", async () => {
    await notify(prisma, { ...base, preview: "hello" });
    expect(db.notification.create).toHaveBeenCalledWith({
      data: {
        userId: robbi.id,
        actorId: me.id,
        type: "FOLLOW",
        targetKind: "person",
        targetRef: "viewer",
        preview: "hello",
      },
    });
  });

  it("never notifies yourself", async () => {
    await notify(prisma, { ...base, userId: me.id });
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("never notifies across a block, in either direction", async () => {
    db.block.findFirst.mockResolvedValue({ blockerId: robbi.id });
    await notify(prisma, base);
    expect(db.notification.create).not.toHaveBeenCalled();
    expect(db.block.findFirst.mock.calls[0]?.[0].where.OR).toEqual([
      { blockerId: robbi.id, blockedId: me.id },
      { blockerId: me.id, blockedId: robbi.id },
    ]);
  });

  it("de-duplicates an identical unread notification", async () => {
    db.notification.findFirst.mockResolvedValueOnce(null);
    await notify(prisma, base);
    db.notification.findFirst.mockResolvedValueOnce({ id: "n1" });
    await notify(prisma, base);
    expect(db.notification.create).toHaveBeenCalledTimes(1);
    expect(db.notification.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      userId: robbi.id,
      type: "FOLLOW",
      actorId: me.id,
      targetKind: "person",
      targetRef: "viewer",
      readAt: null,
    });
  });

  it("truncates the preview to 120 characters on one line", async () => {
    await notify(prisma, { ...base, preview: `${"word ".repeat(60)}\n\nend` });
    const preview = db.notification.create.mock.calls[0]?.[0].data.preview as string;
    expect(preview.length).toBeLessThanOrEqual(120);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview).not.toContain("\n");
    expect(truncatePreview("short")).toBe("short");
    expect(truncatePreview("   ")).toBeNull();
    expect(truncatePreview(null)).toBeNull();
  });

  it("never throws, even when the database does", async () => {
    db.notification.create.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(notify(prisma, base)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("GET /api/v1/notifications", () => {
  it("requires a session", async () => {
    expect((await listV1(getRequest(`${BASE}/notifications`))).status).toBe(401);
  });

  it("lists newest first with DTO targets and the unread count", async () => {
    const auth = signInAs(me);
    const actor = {
      handle: "robbi",
      name: "Robbi",
      image: null,
      artistProfile: null,
    };
    const row = (id: string, over: Record<string, unknown>) => ({
      id,
      type: "FOLLOW",
      actorId: robbi.id,
      targetKind: "person",
      targetRef: "robbi",
      preview: null,
      readAt: null,
      createdAt: new Date("2026-10-14T12:00:00Z"),
      actor,
      ...over,
    });
    db.notification.findMany.mockResolvedValue([
      row("n1", {}),
      row("n2", { type: "SUPPORT", targetKind: "community", targetRef: "cp1", preview: "Nice" }),
      row("n3", { type: "LIKE", targetKind: "post", targetRef: "real-work", preview: "Real Work", readAt: new Date("2026-10-14T13:00:00Z") }),
      row("n4", { type: "MENTION", targetKind: "community", targetRef: null }),
    ]);
    db.notification.count.mockResolvedValue(3);

    const response = await listV1(getRequest(`${BASE}/notifications?take=10`, auth));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.unreadCount).toBe(3);
    expect(data.nextCursor).toBeNull();
    expect(data.items[0]).toEqual({
      id: "n1",
      type: "FOLLOW",
      actor: { handle: "robbi", name: "Robbi", avatarUrl: null },
      target: { kind: "person", handle: "robbi" },
      preview: null,
      readAt: null,
      createdAt: "2026-10-14T12:00:00.000Z",
    });
    expect(data.items[1].target).toEqual({ kind: "community", id: "cp1" });
    expect(data.items[2].target).toEqual({ kind: "post", slug: "real-work" });
    expect(data.items[2].readAt).toBe("2026-10-14T13:00:00.000Z");
    expect(data.items[3].target).toBeNull();
    const args = db.notification.findMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({ userId: me.id });
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("omits notifications from blocked people and pages with a cursor", async () => {
    const auth = signInAs(me);
    db.block.findMany.mockResolvedValue([{ blockerId: me.id, blockedId: "user_bad" }]);
    const rows = ["a", "b", "c"].map((id) => ({
      id,
      type: "FOLLOW",
      actorId: robbi.id,
      targetKind: "person",
      targetRef: "robbi",
      preview: null,
      readAt: null,
      createdAt: new Date("2026-10-14T12:00:00Z"),
      actor: { handle: "robbi", name: "Robbi", image: null, artistProfile: null },
    }));
    db.notification.findMany.mockResolvedValue(rows);
    const { data } = await (
      await listV1(getRequest(`${BASE}/notifications?take=2&cursor=zz`, auth))
    ).json();
    expect(data.items).toHaveLength(2);
    expect(data.nextCursor).toBe("b");
    const args = db.notification.findMany.mock.calls[0]?.[0];
    expect(args.where.OR).toEqual([{ actorId: null }, { actorId: { notIn: ["user_bad"] } }]);
    expect(args).toMatchObject({ take: 3, skip: 1, cursor: { id: "zz" } });
  });

  it("is readable by a suspended user", async () => {
    const suspended = userRow({ id: "user_s", suspendedAt: new Date() });
    expect((await listV1(getRequest(`${BASE}/notifications`, signInAs(suspended)))).status).toBe(200);
  });
});

describe("POST /api/v1/notifications/read", () => {
  it("marks every unread notification when no ids are given", async () => {
    const auth = signInAs(me);
    db.notification.updateMany.mockResolvedValue({ count: 4 });
    db.notification.count.mockResolvedValue(0);
    const response = await readV1(jsonRequest(`${BASE}/notifications/read`, "POST", {}, auth));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ unreadCount: 0 });
    const args = db.notification.updateMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({ userId: me.id, readAt: null });
    expect(args.data.readAt).toBeInstanceOf(Date);
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "notification.read",
    );
  });

  it("marks only the given ids, scoped to the caller (other users' ids are ignored)", async () => {
    const auth = signInAs(me);
    db.notification.updateMany.mockResolvedValue({ count: 1 });
    db.notification.count.mockResolvedValue(2);
    const response = await readV1(
      jsonRequest(`${BASE}/notifications/read`, "POST", { ids: ["mine", "theirs"] }, auth),
    );
    expect((await response.json()).data.unreadCount).toBe(2);
    expect(db.notification.updateMany.mock.calls[0]?.[0].where).toEqual({
      userId: me.id,
      readAt: null,
      id: { in: ["mine", "theirs"] },
    });
  });

  it("accepts an empty body and rejects malformed ids", async () => {
    const empty = await readV1(
      new Request(`${BASE}/notifications/read`, { method: "POST", headers: signInAs(me) }),
    );
    expect(empty.status).toBe(200);
    const bad = await readV1(
      jsonRequest(`${BASE}/notifications/read`, "POST", { ids: ["bad id!"] }, signInAs(me)),
    );
    expect(bad.status).toBe(400);
  });

  it("requires a session", async () => {
    expect(
      (await readV1(jsonRequest(`${BASE}/notifications/read`, "POST", {}))).status,
    ).toBe(401);
  });
});

describe("notification triggers", () => {
  const types = () =>
    db.notification.create.mock.calls.map((c) => ({
      type: c[0].data.type,
      userId: c[0].data.userId,
      targetKind: c[0].data.targetKind,
      targetRef: c[0].data.targetRef,
    }));

  it("FOLLOW goes to the followed person, pointing at the follower's profile", async () => {
    const auth = signInAs(me);
    db.user.findFirst.mockResolvedValue(robbi);
    await followV1(
      jsonRequest(`${BASE}/people/robbi/follow`, "POST", undefined, auth),
      { params: Promise.resolve({ handle: "robbi" }) },
    );
    expect(types()).toEqual([
      { type: "FOLLOW", userId: robbi.id, targetKind: "person", targetRef: "viewer" },
    ]);
  });

  const wallPost = {
    id: "post_1",
    slug: "real-work",
    title: "Real Work",
    authorId: robbi.id,
    status: "PUBLISHED",
    author: { id: robbi.id, email: "painter@example.com", artistProfile: { approved: true } },
    _count: { likes: 1 },
  };

  it("LIKE goes to the Wall post's author with the post slug", async () => {
    const auth = signInAs(me);
    db.post.findFirst.mockResolvedValue(wallPost);
    await likeV1(jsonRequest(`${BASE}/posts/real-work/like`, "POST", {}, auth), {
      params: Promise.resolve({ slug: "real-work" }),
    });
    expect(types()).toEqual([
      { type: "LIKE", userId: robbi.id, targetKind: "post", targetRef: "real-work" },
    ]);
  });

  it("COMMENT goes to the Wall post's author", async () => {
    const auth = signInAs(me);
    db.post.findFirst.mockResolvedValue(wallPost);
    db.comment.create.mockResolvedValue({
      id: "c1",
      body: "Beautiful light.",
      createdAt: new Date(),
    });
    await commentV1(
      jsonRequest(`${BASE}/posts/real-work/comments`, "POST", { body: "Beautiful light." }, auth),
      { params: Promise.resolve({ slug: "real-work" }) },
    );
    expect(types()).toEqual([
      { type: "COMMENT", userId: robbi.id, targetKind: "post", targetRef: "real-work" },
    ]);
    expect(db.notification.create.mock.calls[0]?.[0].data.preview).toBe("Beautiful light.");
  });

  it("liking or commenting on your own Wall post notifies no one", async () => {
    const auth = signInAs(me);
    db.post.findFirst.mockResolvedValue({ ...wallPost, authorId: me.id });
    await likeV1(jsonRequest(`${BASE}/posts/real-work/like`, "POST", {}, auth), {
      params: Promise.resolve({ slug: "real-work" }),
    });
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  function communityRow(id: string, over: Record<string, unknown> = {}) {
    return {
      id,
      authorId: robbi.id,
      kind: "SHOUTOUT",
      body: `Post ${id}`,
      imageUrl: null,
      topicId: null,
      parentId: null,
      hiddenAt: null,
      createdAt: new Date("2026-10-01T12:00:00Z"),
      updatedAt: new Date("2026-10-01T12:00:00Z"),
      author: robbi,
      topic: null,
      _count: { reactions: 0, replies: 0 },
      ...over,
    };
  }

  it("SUPPORT goes to the post's author, targeting the thread", async () => {
    const auth = signInAs(me);
    db.communityPost.findFirst.mockResolvedValue(communityRow("cp1"));
    await supportV1(jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, auth), {
      params: Promise.resolve({ id: "cp1" }),
    });
    expect(types()).toEqual([
      { type: "SUPPORT", userId: robbi.id, targetKind: "community", targetRef: "cp1" },
    ]);
  });

  it("REPLY goes to the parent's author, MENTION to each mentioned person", async () => {
    const auth = signInAs(me);
    const jo = userRow({ id: "user_jo", handle: "jo" });
    db.communityPost.findFirst.mockResolvedValue(communityRow("cp_root"));
    db.communityPost.create.mockResolvedValue(
      communityRow("cp_reply", {
        authorId: me.id,
        author: me,
        parentId: "cp_root",
        body: "Bravo @robbie and @jo and @viewer!",
      }),
    );
    // @jo resolves; @robbie is not a real handle; @viewer is the author themself
    db.user.findMany.mockResolvedValue([{ id: jo.id }, { id: me.id }]);

    await createCommunityV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "KINDNESS", body: "Bravo @robbie and @jo and @viewer!", parentId: "cp_root" },
        auth,
      ),
    );
    expect(types()).toEqual([
      { type: "REPLY", userId: robbi.id, targetKind: "community", targetRef: "cp_root" },
      { type: "MENTION", userId: jo.id, targetKind: "community", targetRef: "cp_root" },
    ]);
    const mentionLookup = db.user.findMany.mock.calls[0]?.[0].where;
    expect(mentionLookup.handle).toEqual({ in: ["robbie", "jo", "viewer"] });
  });

  it("a top-level post mentions people pointing at the post itself", async () => {
    const auth = signInAs(me);
    db.communityPost.create.mockResolvedValue(
      communityRow("cp_new", { authorId: me.id, author: me, body: "Thanks @robbi!" }),
    );
    db.user.findMany.mockResolvedValue([{ id: robbi.id }]);
    await createCommunityV1(
      jsonRequest(`${BASE}/community`, "POST", { kind: "SHOUTOUT", body: "Thanks @robbi!" }, auth),
    );
    expect(types()).toEqual([
      { type: "MENTION", userId: robbi.id, targetKind: "community", targetRef: "cp_new" },
    ]);
  });

  it("does not notify across a block", async () => {
    const auth = signInAs(me);
    db.communityPost.findFirst.mockResolvedValue(communityRow("cp1"));
    db.block.findFirst.mockResolvedValue({ blockerId: robbi.id });
    await supportV1(jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, auth), {
      params: Promise.resolve({ id: "cp1" }),
    });
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
