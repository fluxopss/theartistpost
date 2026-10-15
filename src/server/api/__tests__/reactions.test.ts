// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { GET as listV1, POST as createV1 } from "@/app/api/v1/community/route";
import { GET as threadV1 } from "@/app/api/v1/community/[id]/route";
import {
  DELETE as unreactV1,
  PUT as reactV1,
} from "@/app/api/v1/community/[id]/reaction/route";
import { GET as reactorsV1 } from "@/app/api/v1/community/[id]/reactions/route";
import { POST as supportV1 } from "@/app/api/v1/community/[id]/support/route";
import {
  DELETE as unreactWallV1,
  PUT as reactWallV1,
} from "@/app/api/v1/posts/[slug]/reaction/route";
import { GET as likeStateV1 } from "@/app/api/v1/posts/[slug]/like/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import {
  REACTIONS,
  REACTION_EMOJI,
} from "@/server/api/reactions";
import { graphemeLength } from "@/shared/lib/graphemes";
import { truncatePreview } from "@/server/api/textFilter";
import {
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const BASE = "http://localhost/api/v1";
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const slugCtx = (slug: string) => ({ params: Promise.resolve({ slug }) });

const me = userRow({ id: "user_viewer", handle: "viewer", name: "Vera Viewer" });
const robbi = userRow({ id: "user_robbi", handle: "robbi", name: "Robbi" });

function postRow(id: string, overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

function groups(...entries: Array<[string, string, number]>) {
  return entries.map(([postId, reaction, n]) => ({
    postId,
    reaction,
    _count: { _all: n },
  }));
}

function put(id: string, body: unknown, auth: Record<string, string>) {
  return reactV1(
    jsonRequest(`${BASE}/community/${id}/reaction`, "PUT", body, auth),
    idCtx(id),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("reaction set", () => {
  it("is exactly the curated kind set, Support first, nothing negative", () => {
    expect(REACTIONS).toEqual(["SUPPORT", "LOVE", "FIRE", "APPLAUSE", "INSPIRED"]);
    expect(REACTION_EMOJI).toEqual({
      SUPPORT: "✨",
      LOVE: "❤️",
      FIRE: "🔥",
      APPLAUSE: "👏",
      INSPIRED: "🎨",
    });
  });
});

describe("PUT /api/v1/community/[id]/reaction", () => {
  it("adds a reaction, returning the viewer's reaction and per-emoji counts", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValue(null);
    db.communityReaction.groupBy.mockResolvedValue(
      groups(["cp1", "LOVE", 2], ["cp1", "SUPPORT", 1]),
    );

    const response = await put("cp1", { reaction: "LOVE" }, signInAs(me));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({
      viewerReaction: "LOVE",
      reactionCounts: { SUPPORT: 1, LOVE: 2, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 },
      supportCount: 3,
      supported: true,
    });
    expect(db.communityReaction.create).toHaveBeenCalledWith({
      data: { userId: me.id, postId: "cp1", reaction: "LOVE" },
    });
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "community.reaction_set",
    );
  });

  it("changing a reaction replaces the old one (update, never a second row)", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValue({
      userId: me.id,
      postId: "cp1",
      reaction: "SUPPORT",
    });
    db.communityReaction.groupBy.mockResolvedValue(groups(["cp1", "FIRE", 1]));

    const response = await put("cp1", { reaction: "FIRE" }, signInAs(me));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      viewerReaction: "FIRE",
      supportCount: 1,
    });
    expect(db.communityReaction.create).not.toHaveBeenCalled();
    expect(db.communityReaction.update).toHaveBeenCalledWith({
      where: { userId_postId: { userId: me.id, postId: "cp1" } },
      data: { reaction: "FIRE" },
    });
  });

  it("sending the same reaction again changes nothing", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValue({
      userId: me.id,
      postId: "cp1",
      reaction: "FIRE",
    });
    db.communityReaction.groupBy.mockResolvedValue(groups(["cp1", "FIRE", 1]));

    const response = await put("cp1", { reaction: "FIRE" }, signInAs(me));
    expect(response.status).toBe(200);
    expect(db.communityReaction.create).not.toHaveBeenCalled();
    expect(db.communityReaction.update).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("rejects anything outside the curated set (no negative reactions)", async () => {
    for (const bad of ["ANGRY", "DISLIKE", "💩", "fire", "", null, 7, undefined]) {
      const response = await put("cp1", { reaction: bad }, signInAs(me));
      expect(response.status).toBe(400);
    }
    expect(db.communityReaction.create).not.toHaveBeenCalled();
  });

  it("requires a community member and a visible post", async () => {
    db.communityPost.findFirst.mockResolvedValue(null);
    expect((await put("cp1", { reaction: "LOVE" }, signInAs(me))).status).toBe(404);
    const fresh = userRow({ id: "user_new", termsAcceptedAt: null });
    expect((await put("cp1", { reaction: "LOVE" }, signInAs(fresh))).status).toBe(403);
    const anon = await reactV1(
      jsonRequest(`${BASE}/community/cp1/reaction`, "PUT", { reaction: "LOVE" }),
      idCtx("cp1"),
    );
    expect(anon.status).toBe(401);
  });

  it("survives two quick taps racing (unique violation turns into an update)", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValue(null);
    db.communityReaction.create.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    db.communityReaction.groupBy.mockResolvedValue(groups(["cp1", "LOVE", 1]));
    const response = await put("cp1", { reaction: "LOVE" }, signInAs(me));
    expect(response.status).toBe(200);
    expect(db.communityReaction.update).toHaveBeenCalled();
  });

  it("rate limits at 60 changes a minute", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    const auth = signInAs(me);
    let last = 200;
    for (let i = 0; i < 61; i += 1) {
      db.user.findUnique.mockResolvedValueOnce(me);
      last = (await put("cp1", { reaction: "LOVE" }, auth)).status;
    }
    expect(last).toBe(429);
  });
});

describe("DELETE /api/v1/community/[id]/reaction", () => {
  it("removes the viewer's reaction", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValue({
      userId: me.id,
      postId: "cp1",
      reaction: "LOVE",
    });
    db.communityReaction.groupBy.mockResolvedValue([]);
    const response = await unreactV1(
      jsonRequest(`${BASE}/community/cp1/reaction`, "DELETE", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({
      viewerReaction: null,
      reactionCounts: { SUPPORT: 0, LOVE: 0, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 },
      supportCount: 0,
      supported: false,
    });
    expect(db.communityReaction.delete).toHaveBeenCalledTimes(1);
  });

  it("is a quiet no-op when there is nothing to remove", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValue(null);
    const response = await unreactV1(
      jsonRequest(`${BASE}/community/cp1/reaction`, "DELETE", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect(response.status).toBe(200);
    expect(db.communityReaction.delete).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/community/[id]/support (kept for older app builds)", () => {
  it("still toggles: none → SUPPORT, any reaction → removed", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValueOnce(null);
    db.communityReaction.groupBy.mockResolvedValueOnce(groups(["cp1", "SUPPORT", 3]));
    const on = await supportV1(
      jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect((await on.json()).data).toMatchObject({ supported: true, supportCount: 3 });
    expect(db.communityReaction.create).toHaveBeenCalledWith({
      data: { userId: me.id, postId: "cp1", reaction: "SUPPORT" },
    });

    db.communityReaction.findUnique.mockResolvedValueOnce({
      userId: me.id,
      postId: "cp1",
      reaction: "FIRE",
    });
    db.communityReaction.groupBy.mockResolvedValueOnce(groups(["cp1", "SUPPORT", 2]));
    const off = await supportV1(
      jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect((await off.json()).data).toMatchObject({
      supported: false,
      supportCount: 2,
      viewerReaction: null,
    });
  });
});

describe("reaction notifications", () => {
  beforeEach(() => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.groupBy.mockResolvedValue([]);
  });

  it("notifies the author once when someone first reacts", async () => {
    db.communityReaction.findUnique.mockResolvedValue(null);
    await put("cp1", { reaction: "LOVE" }, signInAs(me));
    expect(db.notification.create).toHaveBeenCalledTimes(1);
    expect(db.notification.create.mock.calls[0]?.[0].data).toMatchObject({
      userId: robbi.id,
      actorId: me.id,
      type: "SUPPORT",
      targetKind: "community",
      targetRef: "cp1",
    });
  });

  it("does not notify again when the reactor switches emoji", async () => {
    db.communityReaction.findUnique.mockResolvedValue({
      userId: me.id,
      postId: "cp1",
      reaction: "LOVE",
    });
    await put("cp1", { reaction: "FIRE" }, signInAs(me));
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("does not notify again after remove-and-react, even if the first was read", async () => {
    db.communityReaction.findUnique.mockResolvedValue(null);
    db.notification.findFirst.mockResolvedValue({ id: "n_old" });
    await put("cp1", { reaction: "APPLAUSE" }, signInAs(me));
    expect(db.notification.create).not.toHaveBeenCalled();
    // The persistent dedupe looks at ANY earlier notification, read or not.
    const where = db.notification.findFirst.mock.calls.at(-1)?.[0].where;
    expect(where).toMatchObject({
      userId: robbi.id,
      actorId: me.id,
      type: "SUPPORT",
      targetKind: "community",
      targetRef: "cp1",
    });
    expect(where).not.toHaveProperty("readAt");
  });

  it("reactions on replies notify against the thread", async () => {
    db.communityPost.findFirst.mockResolvedValue(
      postRow("reply1", { parentId: "cp1" }),
    );
    db.communityReaction.findUnique.mockResolvedValue(null);
    await put("reply1", { reaction: "INSPIRED" }, signInAs(me));
    expect(db.notification.create.mock.calls[0]?.[0].data.targetRef).toBe("cp1");
  });
});

describe("community reads carry reactions", () => {
  it("feed items include per-emoji counts and the viewer's reaction", async () => {
    db.communityPost.findMany.mockResolvedValue([
      postRow("cp1", {
        _count: { reactions: 4, replies: 1 },
        reactions: [{ userId: me.id, reaction: "FIRE" }],
      }),
      postRow("cp2"),
    ]);
    db.communityReaction.groupBy.mockResolvedValue(
      groups(["cp1", "FIRE", 3], ["cp1", "SUPPORT", 1]),
    );
    const response = await listV1(getRequest(`${BASE}/community`, signInAs(me)));
    const { data } = await response.json();
    expect(data.items[0]).toMatchObject({
      id: "cp1",
      supportCount: 4,
      viewerSupported: true,
      viewerReaction: "FIRE",
      reactionCounts: { SUPPORT: 1, LOVE: 0, FIRE: 3, APPLAUSE: 0, INSPIRED: 0 },
    });
    expect(data.items[1]).toMatchObject({
      id: "cp2",
      supportCount: 0,
      viewerReaction: null,
      reactionCounts: { SUPPORT: 0, LOVE: 0, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 },
    });
    // One grouped read for the whole page, not one query per post.
    expect(db.communityReaction.groupBy).toHaveBeenCalledTimes(1);
    expect(db.communityReaction.groupBy.mock.calls[0]?.[0].where).toEqual({
      postId: { in: ["cp1", "cp2"] },
    });
  });

  it("anonymous reads see counts but no viewer reaction", async () => {
    db.communityPost.findMany.mockResolvedValue([postRow("cp1")]);
    db.communityReaction.groupBy.mockResolvedValue(groups(["cp1", "LOVE", 2]));
    const response = await listV1(getRequest(`${BASE}/community`));
    const { data } = await response.json();
    expect(data.items[0]).toMatchObject({
      viewerReaction: null,
      viewerSupported: false,
      reactionCounts: { LOVE: 2 },
    });
  });

  it("the thread carries them for the post and its replies", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityPost.findMany.mockResolvedValue([
      postRow("r1", { parentId: "cp1" }),
    ]);
    db.communityReaction.groupBy.mockResolvedValue(
      groups(["cp1", "APPLAUSE", 1], ["r1", "LOVE", 1]),
    );
    const response = await threadV1(getRequest(`${BASE}/community/cp1`), idCtx("cp1"));
    const { data } = await response.json();
    expect(data.post.reactionCounts.APPLAUSE).toBe(1);
    expect(data.replies[0].reactionCounts.LOVE).toBe(1);
  });

  it("never exposes a most-reacted ordering: the feed stays newest-first", async () => {
    db.communityPost.findMany.mockResolvedValue([]);
    await listV1(getRequest(`${BASE}/community`));
    expect(db.communityPost.findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { createdAt: "desc" },
      { id: "desc" },
    ]);
  });
});

describe("GET /api/v1/community/[id]/reactions (who reacted)", () => {
  const reactor = (userId: string, reaction: string, user = userRow({ id: userId, handle: userId.replace("user_", "") })) => ({
    userId,
    postId: "cp1",
    reaction,
    createdAt: new Date("2026-10-02T12:00:00Z"),
    user: { ...user, artistProfile: null },
  });

  it("lists people with their emoji, newest first, hiding blocked and suspended", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.block.findMany.mockResolvedValue([
      { blockerId: me.id, blockedId: "user_blocked" },
    ]);
    db.communityReaction.findMany.mockResolvedValue([
      reactor("user_ana", "FIRE"),
      reactor("user_ben", "SUPPORT"),
    ]);
    db.follow.findMany.mockResolvedValue([{ followingId: "user_ana" }]);

    const response = await reactorsV1(
      getRequest(`${BASE}/community/cp1/reactions`, signInAs(me)),
      idCtx("cp1"),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.nextCursor).toBeNull();
    expect(data.items).toHaveLength(2);
    expect(data.items[0]).toMatchObject({
      reaction: "FIRE",
      person: { handle: "ana", viewerFollows: true },
    });
    expect(data.items[1]).toMatchObject({
      reaction: "SUPPORT",
      person: { handle: "ben", viewerFollows: false },
    });

    const query = db.communityReaction.findMany.mock.calls[0]?.[0];
    expect(query.where.postId).toBe("cp1");
    expect(query.where.userId).toEqual({ notIn: ["user_blocked"] });
    expect(query.where.user).toMatchObject({ suspendedAt: null });
    expect(query.orderBy).toEqual([{ createdAt: "desc" }, { userId: "desc" }]);
  });

  it("filters by one emoji and pages with a cursor", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findMany.mockResolvedValue([
      reactor("user_a", "LOVE"),
      reactor("user_b", "LOVE"),
      reactor("user_c", "LOVE"),
    ]);
    const response = await reactorsV1(
      getRequest(`${BASE}/community/cp1/reactions?reaction=LOVE&take=2`),
      idCtx("cp1"),
    );
    const { data } = await response.json();
    expect(data.items).toHaveLength(2);
    expect(data.nextCursor).toBe("user_b");
    const query = db.communityReaction.findMany.mock.calls[0]?.[0];
    expect(query.where.reaction).toBe("LOVE");
    expect(query.take).toBe(3);

    const bad = await reactorsV1(
      getRequest(`${BASE}/community/cp1/reactions?reaction=ANGRY`),
      idCtx("cp1"),
    );
    expect(bad.status).toBe(400);
  });

  it("404s for hidden or missing posts and works anonymously", async () => {
    db.communityPost.findFirst.mockResolvedValue(null);
    const missing = await reactorsV1(
      getRequest(`${BASE}/community/cp1/reactions`),
      idCtx("cp1"),
    );
    expect(missing.status).toBe(404);
  });
});

describe("Wall reactions", () => {
  const artist = {
    id: "user_artist",
    email: "painter@example.com",
    name: "Real Painter",
    artistProfile: { id: "ap_1", handle: "realpainter", approved: true },
  };
  const wallPost = () => ({
    id: "post_1",
    slug: "real-work",
    authorId: "user_artist",
    title: "Real Work",
    status: "PUBLISHED",
    author: artist,
    _count: { likes: 2 },
  });

  it("PUT sets an emoji on a Wall post, replacing any earlier one", async () => {
    db.post.findFirst.mockResolvedValue(wallPost());
    db.like.findUnique.mockResolvedValue({
      id: "like_1",
      userId: me.id,
      postId: "post_1",
      reaction: "LOVE",
    });
    db.like.groupBy.mockResolvedValue(groups(["post_1", "INSPIRED", 1]));
    const response = await reactWallV1(
      jsonRequest(`${BASE}/posts/real-work/reaction`, "PUT", { reaction: "INSPIRED" }, signInAs(me)),
      slugCtx("real-work"),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      viewerReaction: "INSPIRED",
      liked: true,
      likeCount: 1,
      reactionCounts: { INSPIRED: 1, LOVE: 0 },
    });
    expect(db.like.update).toHaveBeenCalledWith({
      where: { id: "like_1" },
      data: { reaction: "INSPIRED" },
    });
    expect(db.like.create).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("a first reaction notifies the artist once with a LIKE", async () => {
    db.post.findFirst.mockResolvedValue(wallPost());
    db.like.findUnique.mockResolvedValue(null);
    db.like.groupBy.mockResolvedValue(groups(["post_1", "FIRE", 1]));
    const response = await reactWallV1(
      jsonRequest(`${BASE}/posts/real-work/reaction`, "PUT", { reaction: "FIRE" }, signInAs(me)),
      slugCtx("real-work"),
    );
    expect(response.status).toBe(200);
    expect(db.like.create).toHaveBeenCalledWith({
      data: { userId: me.id, postId: "post_1", reaction: "FIRE" },
    });
    expect(db.notification.create.mock.calls[0]?.[0].data).toMatchObject({
      userId: "user_artist",
      type: "LIKE",
      targetKind: "post",
      targetRef: "real-work",
    });
  });

  it("rejects reactions outside the set and supports DELETE", async () => {
    db.post.findFirst.mockResolvedValue(wallPost());
    const bad = await reactWallV1(
      jsonRequest(`${BASE}/posts/real-work/reaction`, "PUT", { reaction: "ANGRY" }, signInAs(me)),
      slugCtx("real-work"),
    );
    expect(bad.status).toBe(400);

    db.like.findUnique.mockResolvedValue({ id: "like_1", reaction: "LOVE" });
    db.like.groupBy.mockResolvedValue([]);
    const gone = await unreactWallV1(
      jsonRequest(`${BASE}/posts/real-work/reaction`, "DELETE", undefined, signInAs(me)),
      slugCtx("real-work"),
    );
    expect(gone.status).toBe(200);
    expect((await gone.json()).data).toMatchObject({
      viewerReaction: null,
      liked: false,
      likeCount: 0,
    });
    expect(db.like.delete).toHaveBeenCalledWith({ where: { id: "like_1" } });
  });

  it("like state returns the counts and the viewer's emoji", async () => {
    db.post.findFirst.mockResolvedValue(wallPost());
    db.like.findUnique.mockResolvedValue({ id: "l", reaction: "FIRE" });
    db.like.groupBy.mockResolvedValue(
      groups(["post_1", "FIRE", 2], ["post_1", "LOVE", 1]),
    );
    const response = await likeStateV1(
      getRequest(`${BASE}/posts/real-work/like`, signInAs(me)),
      slugCtx("real-work"),
    );
    expect((await response.json()).data).toMatchObject({
      likedByMe: true,
      likeCount: 3,
      viewerReaction: "FIRE",
      reactionCounts: { FIRE: 2, LOVE: 1, SUPPORT: 0 },
    });
  });
});

describe("emoji in posts and comments", () => {
  it("counts a person-visible character as one: 500 emoji fit, 501 do not", async () => {
    const family = "👨‍👩‍👧‍👦"; // one ZWJ sequence = 11 UTF-16 units
    expect(graphemeLength(family)).toBe(1);
    expect(graphemeLength("🎨❤️🔥")).toBe(3);
    expect(graphemeLength("é")).toBe(1);

    db.communityPost.create.mockResolvedValue(
      postRow("cp_emoji", { authorId: me.id, author: me, body: "🎨".repeat(500) }),
    );
    const ok = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "SHOUTOUT", body: "🎨".repeat(500) },
        signInAs(me),
      ),
    );
    expect(ok.status).toBe(201);
    expect((await ok.json()).data.body).toBe("🎨".repeat(500));
    // Stored exactly as sent: nothing strips or rewrites emoji.
    expect(db.communityPost.create.mock.calls[0]?.[0].data.body).toBe(
      "🎨".repeat(500),
    );

    const tooLong = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "SHOUTOUT", body: "🎨".repeat(501) },
        signInAs(me),
      ),
    );
    expect(tooLong.status).toBe(400);
  });

  it("the text filter still catches blocked words hidden with emoji selectors", async () => {
    const dodge = "fu️ck you";
    const response = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "SHOUTOUT", body: dodge },
        signInAs(me),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("notification previews never cut an emoji in half", () => {
    const text = `${"a".repeat(118)}👨‍👩‍👧‍👦 and more`;
    const preview = truncatePreview(text)!;
    expect(graphemeLength(preview)).toBeLessThanOrEqual(120);
    // No lone surrogate: round-trips through UTF-8 unchanged.
    expect(new TextDecoder().decode(new TextEncoder().encode(preview))).toBe(
      preview,
    );
    expect(preview.endsWith("…")).toBe(true);
  });
});
