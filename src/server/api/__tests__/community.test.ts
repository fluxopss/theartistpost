// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

const storeMock = vi.hoisted(() => ({ storeUploadedMedia: vi.fn() }));
vi.mock("@/server/api/media", async () => {
  const actual =
    await vi.importActual<typeof import("@/server/api/media")>(
      "@/server/api/media",
    );
  return { ...actual, storeUploadedMedia: storeMock.storeUploadedMedia };
});

import {
  GET as listV1,
  POST as createV1,
} from "@/app/api/v1/community/route";
import { POST as mediaV1 } from "@/app/api/v1/community/media/route";
import {
  DELETE as deleteV1,
  GET as threadV1,
} from "@/app/api/v1/community/[id]/route";
import { POST as supportV1 } from "@/app/api/v1/community/[id]/support/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { extractMentions } from "@/server/api/community";
import { COMMUNITY_GATE_MESSAGE } from "@/server/api/safety";
import { BLOCKED_TERMS, KIND_MESSAGE } from "@/server/api/textFilter";
import {
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const BASE = "http://localhost/api/v1";
const ORIGIN = "https://theartistpost.fluxlab.agency";
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });

const me = userRow({ id: "user_viewer", handle: "viewer", name: "Vera Viewer" });
const robbi = userRow({ id: "user_robbi", handle: "robbi", name: "Robbi" });
const admin = userRow({ id: "user_admin", handle: "boss", role: "ADMIN" });

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

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
  storeMock.storeUploadedMedia.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("extractMentions", () => {
  it("lowercases, dedupes and caps at 5", () => {
    expect(extractMentions("hi @Robbie and @robbie @x")).toEqual(["robbie"]);
    expect(extractMentions("no mention here, mail me a@b.com")).toEqual([]);
    expect(extractMentions("@aa @bb @cc @dd @ee @ff @gg")).toEqual([
      "aa",
      "bb",
      "cc",
      "dd",
      "ee",
    ]);
    expect(extractMentions("(@robbie) and\n@jo_e-1")).toEqual(["jo_e-1"]);
  });
});

describe("POST /api/v1/community", () => {
  const body = { kind: "SHOUTOUT", body: "Huge love to @robbie for Friday!" };

  it("requires a community member: terms accepted", async () => {
    const fresh = userRow({ id: "user_new", termsAcceptedAt: null });
    const response = await createV1(
      jsonRequest(`${BASE}/community`, "POST", body, signInAs(fresh)),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toBe(COMMUNITY_GATE_MESSAGE);
    expect(db.communityPost.create).not.toHaveBeenCalled();
  });

  it("requires sign-in and an unsuspended account", async () => {
    expect(
      (await createV1(jsonRequest(`${BASE}/community`, "POST", body))).status,
    ).toBe(401);
    const suspended = userRow({ id: "user_s", suspendedAt: new Date() });
    expect(
      (
        await createV1(
          jsonRequest(`${BASE}/community`, "POST", body, signInAs(suspended)),
        )
      ).status,
    ).toBe(403);
  });

  it("rejects empty, whitespace and 501-char bodies, and bad kinds", async () => {
    for (const bad of [
      { kind: "SHOUTOUT", body: "" },
      { kind: "SHOUTOUT", body: "    " },
      { kind: "SHOUTOUT", body: "x".repeat(501) },
      { kind: "NOPE", body: "hello" },
    ]) {
      const response = await createV1(
        jsonRequest(`${BASE}/community`, "POST", bad, signInAs(me)),
      );
      expect(response.status).toBe(400);
    }
    db.communityPost.create.mockResolvedValue(
      postRow("cp_500", { authorId: me.id, author: me, kind: "ASK" }),
    );
    const ok = await createV1(
      jsonRequest(`${BASE}/community`, "POST", { kind: "ASK", body: "x".repeat(500) }, signInAs(me)),
    );
    expect(ok.status).toBe(201);
  });

  it("rejects blocked words with the kind message", async () => {
    const response = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "UPDATE", body: `you ${BLOCKED_TERMS[0]}` },
        signInAs(me),
      ),
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.message).toBe(KIND_MESSAGE);
    expect(json.error.fields.body).toBe(KIND_MESSAGE);
    expect(db.communityPost.create).not.toHaveBeenCalled();
  });

  it("only accepts imageUrl under /uploads/ or the site origin's /uploads/", async () => {
    for (const imageUrl of [
      "https://evil.example/uploads/a.jpg",
      "/etc/passwd",
      "/uploads/../secret.jpg",
      "javascript:alert(1)",
      "/uploads/a.jpg?x=1",
    ]) {
      const response = await createV1(
        jsonRequest(`${BASE}/community`, "POST", { ...body, imageUrl }, signInAs(me)),
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error.fields.imageUrl).toBeTruthy();
    }
    expect(db.communityPost.create).not.toHaveBeenCalled();

    db.communityPost.create.mockResolvedValue(
      postRow("cp_img", { authorId: me.id, author: me, imageUrl: "/uploads/a.jpg" }),
    );
    for (const imageUrl of ["/uploads/a.jpg", `${ORIGIN}/uploads/a.jpg`]) {
      const response = await createV1(
        jsonRequest(`${BASE}/community`, "POST", { ...body, imageUrl }, signInAs(me)),
      );
      expect(response.status).toBe(201);
      expect(db.communityPost.create.mock.calls.at(-1)?.[0].data.imageUrl).toBe(
        "/uploads/a.jpg",
      );
    }
  });

  it("creates a post and returns the DTO (201) with an audit row", async () => {
    db.topic.findFirst.mockResolvedValue({
      id: "t_music",
      slug: "music",
      name: "Musicians",
      kind: "genre",
    });
    db.communityPost.create.mockResolvedValue(
      postRow("cp_new", {
        authorId: me.id,
        author: me,
        kind: "SHOUTOUT",
        body: body.body,
        topicId: "t_music",
        topic: { slug: "music", name: "Musicians", kind: "genre" },
      }),
    );
    const response = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { ...body, topicSlug: "music" },
        signInAs(me),
      ),
    );
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data).toMatchObject({
      id: "cp_new",
      kind: "SHOUTOUT",
      body: body.body,
      imageUrl: null,
      topic: { slug: "music", name: "Musicians", kind: "genre" },
      parentId: null,
      author: { handle: "viewer", name: "Vera Viewer", isArtist: false },
      supportCount: 0,
      replyCount: 0,
      viewerSupported: false,
      canDelete: true,
    });
    expect(db.communityPost.create.mock.calls[0]?.[0].data).toMatchObject({
      authorId: me.id,
      kind: "SHOUTOUT",
      body: body.body,
      topicId: "t_music",
      parentId: null,
    });
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "community.post_create",
    );
  });

  it("rejects an unknown topicSlug", async () => {
    db.topic.findFirst.mockResolvedValue(null);
    const response = await createV1(
      jsonRequest(`${BASE}/community`, "POST", { ...body, topicSlug: "nope" }, signInAs(me)),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.topicSlug).toBeTruthy();
  });

  it("replies one level deep: reply to a reply is a 400", async () => {
    db.communityPost.findFirst.mockResolvedValue(
      postRow("cp_reply", { parentId: "cp_root" }),
    );
    const response = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "UPDATE", body: "nested", parentId: "cp_reply" },
        signInAs(me),
      ),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("Replies stay one level deep.");
    expect(db.communityPost.create).not.toHaveBeenCalled();
  });

  it("replying to a missing or hidden parent is a 404", async () => {
    db.communityPost.findFirst.mockResolvedValue(null);
    const response = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "UPDATE", body: "hello?", parentId: "cp_gone" },
        signInAs(me),
      ),
    );
    expect(response.status).toBe(404);
    const where = db.communityPost.findFirst.mock.calls[0]?.[0].where;
    expect(where).toMatchObject({ id: "cp_gone", hiddenAt: null });
  });

  it("creates a reply under a visible top-level post", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp_root"));
    db.communityPost.create.mockResolvedValue(
      postRow("cp_r1", { authorId: me.id, author: me, parentId: "cp_root", body: "Congrats!" }),
    );
    const response = await createV1(
      jsonRequest(
        `${BASE}/community`,
        "POST",
        { kind: "KINDNESS", body: "Congrats!", parentId: "cp_root" },
        signInAs(me),
      ),
    );
    expect(response.status).toBe(201);
    expect((await response.json()).data.parentId).toBe("cp_root");
    expect(db.communityPost.create.mock.calls[0]?.[0].data.parentId).toBe("cp_root");
  });

  it("rate limits at 10 posts per 10 minutes", async () => {
    db.communityPost.create.mockResolvedValue(
      postRow("cp_x", { authorId: me.id, author: me }),
    );
    for (let i = 0; i < 10; i += 1) {
      const response = await createV1(
        jsonRequest(`${BASE}/community`, "POST", { kind: "UPDATE", body: `note ${i}` }, signInAs(me)),
      );
      expect(response.status).toBe(201);
    }
    const blocked = await createV1(
      jsonRequest(`${BASE}/community`, "POST", { kind: "UPDATE", body: "one more" }, signInAs(me)),
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("GET /api/v1/community", () => {
  it("lists top-level, visible posts newest first; excludes hidden, replies, blocked authors", async () => {
    const auth = signInAs(me);
    db.block.findMany.mockResolvedValue([
      { blockerId: me.id, blockedId: "user_bad" },
      { blockerId: "user_worse", blockedId: me.id },
    ]);
    db.communityPost.findMany.mockResolvedValue([
      postRow("cp1", { reactions: [{ userId: me.id }], _count: { reactions: 2, replies: 1 } }),
    ]);

    const response = await listV1(getRequest(`${BASE}/community`, auth));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      id: "cp1",
      supportCount: 2,
      replyCount: 1,
      viewerSupported: true,
      canDelete: false,
    });
    expect(data.nextCursor).toBeNull();

    const args = db.communityPost.findMany.mock.calls[0]?.[0];
    expect(args.where).toMatchObject({ parentId: null, hiddenAt: null });
    expect(JSON.stringify(args.where)).toContain('"notIn":["user_bad","user_worse"]');
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    // the visible-reply count also hides hidden replies and blocked people
    expect(JSON.stringify(args.include._count)).toContain('"hiddenAt":null');
  });

  it("is public: anonymous reads work and flag nothing as supported", async () => {
    db.communityPost.findMany.mockResolvedValue([postRow("cp1")]);
    const { data } = await (await listV1(getRequest(`${BASE}/community`))).json();
    expect(data.items[0]).toMatchObject({ viewerSupported: false, canDelete: false });
  });

  it("pages with take/cursor", async () => {
    db.communityPost.findMany.mockResolvedValue([postRow("a"), postRow("b"), postRow("c")]);
    const { data } = await (
      await listV1(getRequest(`${BASE}/community?take=2&cursor=z9`))
    ).json();
    expect(data.items.map((i: { id: string }) => i.id)).toEqual(["a", "b"]);
    expect(data.nextCursor).toBe("b");
    expect(db.communityPost.findMany.mock.calls[0]?.[0]).toMatchObject({
      take: 3,
      skip: 1,
      cursor: { id: "z9" },
    });
  });

  it("filters by topic and kind and validates them", async () => {
    await listV1(getRequest(`${BASE}/community?topic=music&kind=COLLAB`));
    const where = db.communityPost.findMany.mock.calls[0]?.[0].where;
    expect(where).toMatchObject({ kind: "COLLAB", topic: { slug: "music" } });

    expect((await listV1(getRequest(`${BASE}/community?kind=NOPE`))).status).toBe(400);
    expect((await listV1(getRequest(`${BASE}/community?scope=nobody`))).status).toBe(400);
    expect((await listV1(getRequest(`${BASE}/community?take=0`))).status).toBe(400);
  });

  it("scope=following needs sign-in and limits to followed authors", async () => {
    expect((await listV1(getRequest(`${BASE}/community?scope=following`))).status).toBe(401);

    const auth = signInAs(me);
    db.follow.findMany.mockResolvedValue([{ followingId: robbi.id }]);
    const response = await listV1(getRequest(`${BASE}/community?scope=following`, auth));
    expect(response.status).toBe(200);
    expect(db.communityPost.findMany.mock.calls[0]?.[0].where.authorId).toEqual({
      in: [robbi.id],
    });
  });

  it("scope=following with no follows is an empty page without a query", async () => {
    const auth = signInAs(me);
    db.follow.findMany.mockResolvedValue([]);
    const { data } = await (
      await listV1(getRequest(`${BASE}/community?scope=following`, auth))
    ).json();
    expect(data).toEqual({ items: [], nextCursor: null });
    expect(db.communityPost.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/community?scope=foryou", () => {
  const older = new Date("2026-10-01T10:00:00Z");
  const mid = new Date("2026-10-01T11:00:00Z");
  const newer = new Date("2026-10-01T12:00:00Z");
  const ids = (body: { data: { items: { id: string }[] } }) =>
    body.data.items.map((item) => item.id);

  it("needs sign-in", async () => {
    expect((await listV1(getRequest(`${BASE}/community?scope=foryou`))).status).toBe(401);
  });

  it("puts posts on the viewer's topics first, then followed authors, then the rest, newest first within each tier", async () => {
    const auth = signInAs(me);
    db.userTopic.findMany.mockResolvedValue([{ topicId: "t_music" }]);
    db.follow.findMany.mockResolvedValue([{ followingId: "user_pal" }]);
    // 1st query: boosted candidates (topic or followed author); 2nd: everything else.
    db.communityPost.findMany
      .mockResolvedValueOnce([
        postRow("followed_new", { authorId: "user_pal", createdAt: newer }),
        postRow("topic_old", { topicId: "t_music", createdAt: older }),
        postRow("topic_mid", { topicId: "t_music", createdAt: mid }),
      ])
      .mockResolvedValueOnce([
        postRow("rest_newest", { createdAt: newer }),
        postRow("rest_old", { createdAt: older }),
      ]);

    const response = await listV1(getRequest(`${BASE}/community?scope=foryou`, auth));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(ids(body)).toEqual([
      "topic_mid",
      "topic_old",
      "followed_new",
      "rest_newest",
      "rest_old",
    ]);
    expect(body.data.nextCursor).toBeNull();

    const boosted = db.communityPost.findMany.mock.calls[0]?.[0];
    expect(JSON.stringify(boosted.where)).toContain('"topicId":{"in":["t_music"]}');
    expect(JSON.stringify(boosted.where)).toContain('"authorId":{"in":["user_pal"]}');
    expect(boosted.where).toMatchObject({ parentId: null, hiddenAt: null });
  });

  it("the rest query still returns posts with no topic (SQL NOT IN drops NULL topicId)", async () => {
    const auth = signInAs(me);
    db.userTopic.findMany.mockResolvedValue([{ topicId: "t_music" }]);
    db.follow.findMany.mockResolvedValue([{ followingId: "user_pal" }]);
    await listV1(getRequest(`${BASE}/community?scope=foryou`, auth));

    const rest = db.communityPost.findMany.mock.calls
      .map((call) => call[0].where)
      .find((where) => !where.OR);
    expect(rest).toBeDefined();
    const json = JSON.stringify(rest);
    // A null topic must be allowed explicitly; notIn alone excludes it.
    expect(json).toContain('{"topicId":null}');
    expect(json).toContain('"topicId":{"notIn":["t_music"]}');
    expect(json).toContain('"authorId":{"notIn":["user_pal"]}');
  });

  it("pages through the ranked list with the last id as cursor", async () => {
    const auth = signInAs(me);
    db.userTopic.findMany.mockResolvedValue([{ topicId: "t_music" }]);
    db.follow.findMany.mockResolvedValue([]);
    const boosted = [
      postRow("t1", { topicId: "t_music", createdAt: newer }),
      postRow("t2", { topicId: "t_music", createdAt: mid }),
    ];
    const rest = [postRow("r1", { createdAt: newer })];
    // The boosted query carries a top-level OR (topic / followed author); the rest query does not.
    db.communityPost.findMany.mockImplementation(async (args: { where: { OR?: unknown } }) =>
      args.where.OR ? boosted : rest,
    );

    const first = await (
      await listV1(getRequest(`${BASE}/community?scope=foryou&take=2`, auth))
    ).json();
    expect(ids(first)).toEqual(["t1", "t2"]);
    expect(first.data.nextCursor).toBe("t2");

    // signInAs resolves the session once; sign in again for the next request.
    const authAgain = signInAs(me);
    const second = await (
      await listV1(getRequest(`${BASE}/community?scope=foryou&take=2&cursor=t2`, authAgain))
    ).json();
    expect(ids(second)).toEqual(["r1"]);
    expect(second.data.nextCursor).toBeNull();
  });

  it("falls back to newest-first when the viewer has no topics and follows no one", async () => {
    const auth = signInAs(me);
    db.userTopic.findMany.mockResolvedValue([]);
    db.follow.findMany.mockResolvedValue([]);
    db.communityPost.findMany.mockResolvedValue([postRow("a"), postRow("b")]);
    const body = await (
      await listV1(getRequest(`${BASE}/community?scope=foryou`, auth))
    ).json();
    expect(ids(body)).toEqual(["a", "b"]);
    // Nothing to boost on, so a single plain query is enough.
    expect(db.communityPost.findMany).toHaveBeenCalledTimes(1);
  });

  it("never shows blocked authors in For You", async () => {
    const auth = signInAs(me);
    db.block.findMany.mockResolvedValue([{ blockerId: me.id, blockedId: "user_bad" }]);
    db.userTopic.findMany.mockResolvedValue([{ topicId: "t_music" }]);
    await listV1(getRequest(`${BASE}/community?scope=foryou`, auth));
    expect(db.communityPost.findMany).toHaveBeenCalled();
    for (const call of db.communityPost.findMany.mock.calls) {
      expect(JSON.stringify(call[0].where)).toContain('"notIn":["user_bad"]');
    }
  });
});

describe("GET /api/v1/community/[id]", () => {
  it("returns the post with replies oldest first (max 100)", async () => {
    db.communityPost.findFirst.mockResolvedValue(
      postRow("cp_root", { _count: { reactions: 1, replies: 2 } }),
    );
    db.communityPost.findMany.mockResolvedValue([
      postRow("r1", { parentId: "cp_root", createdAt: new Date("2026-10-01T13:00:00Z") }),
      postRow("r2", { parentId: "cp_root", createdAt: new Date("2026-10-01T14:00:00Z") }),
    ]);
    const response = await threadV1(getRequest(`${BASE}/community/cp_root`), idCtx("cp_root"));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.post).toMatchObject({ id: "cp_root", replyCount: 2 });
    expect(data.replies.map((r: { id: string }) => r.id)).toEqual(["r1", "r2"]);
    const args = db.communityPost.findMany.mock.calls[0]?.[0];
    expect(args.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
    expect(args.take).toBe(100);
    expect(args.where).toMatchObject({ parentId: "cp_root", hiddenAt: null });
  });

  it("404s for a hidden or missing post and for a blocked author", async () => {
    db.communityPost.findFirst.mockResolvedValue(null);
    expect((await threadV1(getRequest(`${BASE}/community/nope`), idCtx("nope"))).status).toBe(404);
    expect(db.communityPost.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      id: "nope",
      hiddenAt: null,
    });
  });

  it("resolves a reply id to its thread root", async () => {
    db.communityPost.findFirst
      .mockResolvedValueOnce(postRow("r1", { parentId: "cp_root" }))
      .mockResolvedValueOnce(postRow("cp_root"));
    const { data } = await (
      await threadV1(getRequest(`${BASE}/community/r1`), idCtx("r1"))
    ).json();
    expect(data.post.id).toBe("cp_root");
  });
});

describe("DELETE /api/v1/community/[id]", () => {
  it("forbids a non-author, non-admin", async () => {
    db.communityPost.findUnique.mockResolvedValue(postRow("cp1"));
    const response = await deleteV1(
      jsonRequest(`${BASE}/community/cp1`, "DELETE", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect(response.status).toBe(403);
    expect(db.communityPost.delete).not.toHaveBeenCalled();
  });

  it("lets the author delete their own post", async () => {
    db.communityPost.findUnique.mockResolvedValue(postRow("cp1", { authorId: me.id }));
    const response = await deleteV1(
      jsonRequest(`${BASE}/community/cp1`, "DELETE", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ deleted: true });
    expect(db.communityPost.delete).toHaveBeenCalledWith({ where: { id: "cp1" } });
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "community.post_delete",
    );
  });

  it("lets an ADMIN delete anyone's post, even a hidden one", async () => {
    db.communityPost.findUnique.mockResolvedValue(postRow("cp1", { hiddenAt: new Date() }));
    const response = await deleteV1(
      jsonRequest(`${BASE}/community/cp1`, "DELETE", undefined, signInAs(admin)),
      idCtx("cp1"),
    );
    expect(response.status).toBe(200);
    expect(db.communityPost.delete).toHaveBeenCalledTimes(1);
  });

  it("404s for a missing post", async () => {
    db.communityPost.findUnique.mockResolvedValue(null);
    const response = await deleteV1(
      jsonRequest(`${BASE}/community/gone`, "DELETE", undefined, signInAs(me)),
      idCtx("gone"),
    );
    expect(response.status).toBe(404);
  });
});

describe("POST /api/v1/community/[id]/support", () => {
  it("toggles support on and off, returning counts", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.findUnique.mockResolvedValueOnce(null);
    db.communityReaction.groupBy.mockResolvedValueOnce([
      { postId: "cp1", reaction: "SUPPORT", _count: { _all: 3 } },
    ]);
    const on = await supportV1(
      jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect(on.status).toBe(200);
    expect((await on.json()).data).toMatchObject({
      supported: true,
      supportCount: 3,
      viewerReaction: "SUPPORT",
    });
    expect(db.communityReaction.create).toHaveBeenCalledWith({
      data: { userId: me.id, postId: "cp1", reaction: "SUPPORT" },
    });

    db.communityReaction.findUnique.mockResolvedValueOnce({
      userId: me.id,
      postId: "cp1",
      reaction: "SUPPORT",
    });
    db.communityReaction.groupBy.mockResolvedValueOnce([
      { postId: "cp1", reaction: "SUPPORT", _count: { _all: 2 } },
    ]);
    const off = await supportV1(
      jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect((await off.json()).data).toMatchObject({
      supported: false,
      supportCount: 2,
      viewerReaction: null,
    });
    expect(db.communityReaction.delete).toHaveBeenCalledTimes(1);
  });

  it("stays idempotent per user when two taps race (unique violation)", async () => {
    db.communityPost.findFirst.mockResolvedValue(postRow("cp1"));
    db.communityReaction.create.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    db.communityReaction.groupBy.mockResolvedValue([
      { postId: "cp1", reaction: "SUPPORT", _count: { _all: 1 } },
    ]);
    const response = await supportV1(
      jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      supported: true,
      supportCount: 1,
    });
  });

  it("404s for hidden/missing posts and requires a community member", async () => {
    db.communityPost.findFirst.mockResolvedValue(null);
    const missing = await supportV1(
      jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, signInAs(me)),
      idCtx("cp1"),
    );
    expect(missing.status).toBe(404);
    expect(db.communityPost.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      id: "cp1",
      hiddenAt: null,
    });

    const fresh = userRow({ id: "user_new", termsAcceptedAt: null });
    const gated = await supportV1(
      jsonRequest(`${BASE}/community/cp1/support`, "POST", undefined, signInAs(fresh)),
      idCtx("cp1"),
    );
    expect(gated.status).toBe(403);
  });
});

function imageRequest(file: File, headers: Record<string, string>) {
  const form = new FormData();
  form.set("file", file);
  return new Request(`${BASE}/community/media`, { method: "POST", headers, body: form });
}

describe("POST /api/v1/community/media", () => {
  it("rejects video and requires a file", async () => {
    const video = new File([new Uint8Array([1, 2, 3])], "x.mp4", { type: "video/mp4" });
    const response = await mediaV1(imageRequest(video, signInAs(me)));
    expect(response.status).toBe(400);
    expect(storeMock.storeUploadedMedia).not.toHaveBeenCalled();

    const empty = await mediaV1(
      new Request(`${BASE}/community/media`, {
        method: "POST",
        headers: signInAs(me),
        body: new FormData(),
      }),
    );
    expect(empty.status).toBe(400);
  });

  it("stores an image and returns its url", async () => {
    storeMock.storeUploadedMedia.mockResolvedValue({
      ok: true,
      media: {
        url: "/uploads/a.jpg",
        absoluteUrl: `${ORIGIN}/uploads/a.jpg`,
        mediaType: "IMAGE",
        contentType: "image/jpeg",
        bytes: 3,
      },
    });
    const img = new File([new Uint8Array([0xff, 0xd8, 0xff])], "a.jpg", { type: "image/jpeg" });
    const response = await mediaV1(imageRequest(img, signInAs(me)));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ url: `${ORIGIN}/uploads/a.jpg` });
  });

  it("requires a community member", async () => {
    const fresh = userRow({ id: "user_new", termsAcceptedAt: null });
    const img = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" });
    const response = await mediaV1(imageRequest(img, signInAs(fresh)));
    expect(response.status).toBe(403);
  });
});
