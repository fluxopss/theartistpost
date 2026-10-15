// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { GET as feedV1 } from "@/app/api/v1/feed/route";
import { GET as peopleV1 } from "@/app/api/v1/people/route";
import { GET as personV1 } from "@/app/api/v1/people/[handle]/route";
import { POST as followV1 } from "@/app/api/v1/people/[handle]/follow/route";
import { GET as followersV1 } from "@/app/api/v1/people/[handle]/followers/route";
import { GET as followingV1 } from "@/app/api/v1/people/[handle]/following/route";
import { GET as personCommunityV1 } from "@/app/api/v1/people/[handle]/community/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { COMMUNITY_GATE_MESSAGE } from "@/server/api/safety";
import {
  artistRow,
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const handleCtx = (handle: string) => ({ params: Promise.resolve({ handle }) });
const BASE = "http://localhost/api/v1";

const viewer = userRow({ id: "user_viewer", handle: "viewer", name: "Vera Viewer" });
const robbi = userRow({
  id: "user_robbi",
  handle: "robbi",
  name: "Robbi",
  headline: "Founder",
  bio: "Hello",
  location: "West Palm Beach",
  chapterId: "fl-wpb",
});

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/v1/people/[handle]/follow", () => {
  it("toggles follow on, then off, returning follower counts", async () => {
    let auth = signInAs(viewer);
    db.user.findFirst.mockResolvedValue(robbi);
    db.follow.findUnique.mockResolvedValueOnce(null);
    db.follow.count.mockResolvedValueOnce(5);

    const on = await followV1(
      jsonRequest(`${BASE}/people/robbi/follow`, "POST", undefined, auth),
      handleCtx("robbi"),
    );
    expect(on.status).toBe(200);
    expect((await on.json()).data).toEqual({ following: true, followerCount: 5 });
    expect(db.follow.create).toHaveBeenCalledWith({
      data: { followerId: viewer.id, followingId: robbi.id },
    });
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "follow.create",
    );

    auth = signInAs(viewer);
    db.follow.findUnique.mockResolvedValueOnce({
      followerId: viewer.id,
      followingId: robbi.id,
    });
    db.follow.count.mockResolvedValueOnce(4);
    const off = await followV1(
      jsonRequest(`${BASE}/people/robbi/follow`, "POST", undefined, auth),
      handleCtx("robbi"),
    );
    expect((await off.json()).data).toEqual({ following: false, followerCount: 4 });
    expect(db.follow.delete).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
      "follow.remove",
    );
  });

  it("rejects following yourself with 400", async () => {
    const auth = signInAs(viewer);
    const response = await followV1(
      jsonRequest(`${BASE}/people/viewer/follow`, "POST", undefined, auth),
      handleCtx("viewer"),
    );
    expect(response.status).toBe(400);
    expect(db.follow.create).not.toHaveBeenCalled();
  });

  it("returns 404 for a user who blocked you (and for one you blocked)", async () => {
    for (const edge of [
      { blockerId: robbi.id, blockedId: viewer.id },
      { blockerId: viewer.id, blockedId: robbi.id },
    ]) {
      const auth = signInAs(viewer);
      db.user.findFirst.mockResolvedValue(robbi);
      db.block.findMany.mockResolvedValue([edge]);
      const response = await followV1(
        jsonRequest(`${BASE}/people/robbi/follow`, "POST", undefined, auth),
        handleCtx("robbi"),
      );
      expect(response.status).toBe(404);
    }
    expect(db.follow.create).not.toHaveBeenCalled();
  });

  it("needs a community member: terms accepted and handle set", async () => {
    const newcomer = userRow({ id: "user_new", termsAcceptedAt: null });
    const response = await followV1(
      jsonRequest(`${BASE}/people/robbi/follow`, "POST", undefined, signInAs(newcomer)),
      handleCtx("robbi"),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toBe(COMMUNITY_GATE_MESSAGE);

    const noHandle = userRow({ id: "user_nh", handle: null });
    const second = await followV1(
      jsonRequest(`${BASE}/people/robbi/follow`, "POST", undefined, signInAs(noHandle)),
      handleCtx("robbi"),
    );
    expect(second.status).toBe(403);
  });

  it("is forbidden for a suspended user", async () => {
    const suspended = userRow({ id: "user_s", suspendedAt: new Date() });
    const response = await followV1(
      jsonRequest(`${BASE}/people/robbi/follow`, "POST", undefined, signInAs(suspended)),
      handleCtx("robbi"),
    );
    expect(response.status).toBe(403);
  });

  it("requires sign-in", async () => {
    const response = await followV1(
      jsonRequest(`${BASE}/people/robbi/follow`, "POST"),
      handleCtx("robbi"),
    );
    expect(response.status).toBe(401);
  });
});

describe("GET /api/v1/people/[handle]", () => {
  it("returns the full person DTO with viewer relations", async () => {
    const auth = signInAs(viewer);
    db.user.findFirst.mockResolvedValue(robbi);
    db.userTopic.findMany.mockResolvedValue([
      { topic: { slug: "music", name: "Musicians", kind: "genre" } },
    ]);
    db.follow.count
      .mockResolvedValueOnce(12) // followers
      .mockResolvedValueOnce(3); // following
    db.communityPost.count.mockResolvedValue(7);
    db.follow.findUnique
      .mockResolvedValueOnce({ followerId: viewer.id }) // viewer follows
      .mockResolvedValueOnce(null); // does not follow viewer back

    const response = await personV1(
      getRequest(`${BASE}/people/Robbi`, auth),
      handleCtx("Robbi"),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({
      id: robbi.id,
      handle: "robbi",
      name: "Robbi",
      headline: "Founder",
      bio: "Hello",
      location: "West Palm Beach",
      chapter: { id: "fl-wpb", name: "West Palm Beach" },
      topics: [{ slug: "music", name: "Musicians", kind: "genre" }],
      followerCount: 12,
      followingCount: 3,
      communityPostCount: 7,
      viewerFollows: true,
      followsViewer: false,
      isSelf: false,
      isArtist: false,
      artist: null,
    });
    expect(typeof data.joinedAt).toBe("string");
    expect(db.user.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      handle: "robbi",
      suspendedAt: null,
    });
  });

  it("is public: no session means no viewer relations", async () => {
    db.user.findFirst.mockResolvedValue(robbi);
    const response = await personV1(getRequest(`${BASE}/people/robbi`), handleCtx("robbi"));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.viewerFollows).toBe(false);
    expect(data.isSelf).toBe(false);
    expect(db.follow.findUnique).not.toHaveBeenCalled();
  });

  it("reports an approved artist", async () => {
    const painter = artistRow("realpainter");
    db.user.findFirst.mockResolvedValue(painter);
    const { data } = await (
      await personV1(getRequest(`${BASE}/people/realpainter`), handleCtx("realpainter"))
    ).json();
    expect(data.isArtist).toBe(true);
    expect(data.artist).toEqual({ handle: "realpainter", approved: true });
  });

  it("404s when missing or suspended (the lookup excludes suspended users)", async () => {
    db.user.findFirst.mockResolvedValue(null);
    const response = await personV1(getRequest(`${BASE}/people/ghost`), handleCtx("ghost"));
    expect(response.status).toBe(404);
    expect(db.user.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      suspendedAt: null,
    });
  });

  it("404s when blocked either way", async () => {
    for (const edge of [
      { blockerId: robbi.id, blockedId: viewer.id },
      { blockerId: viewer.id, blockedId: robbi.id },
    ]) {
      const auth = signInAs(viewer);
      db.user.findFirst.mockResolvedValue(robbi);
      db.block.findMany.mockResolvedValue([edge]);
      const response = await personV1(
        getRequest(`${BASE}/people/robbi`, auth),
        handleCtx("robbi"),
      );
      expect(response.status).toBe(404);
    }
  });

  it("lets you see yourself", async () => {
    const auth = signInAs(viewer);
    db.user.findFirst.mockResolvedValue(viewer);
    const { data } = await (
      await personV1(getRequest(`${BASE}/people/viewer`, auth), handleCtx("viewer"))
    ).json();
    expect(data.isSelf).toBe(true);
  });
});

describe("GET /api/v1/people", () => {
  it("rejects a 1-character query", async () => {
    const response = await peopleV1(getRequest(`${BASE}/people?q=a`));
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.q).toBeTruthy();
  });

  it("searches name and handle case-insensitively and returns summaries", async () => {
    db.user.findMany.mockResolvedValue([robbi]);
    const response = await peopleV1(getRequest(`${BASE}/people?q=Rob`));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.items).toEqual([
      {
        id: robbi.id,
        handle: "robbi",
        name: "Robbi",
        avatarUrl: null,
        headline: "Founder",
        isArtist: false,
        viewerFollows: false,
      },
    ]);
    expect(data.nextCursor).toBeNull();
    const where = db.user.findMany.mock.calls[0]?.[0].where;
    expect(JSON.stringify(where)).toContain('"mode":"insensitive"');
  });

  it("pages with a cursor", async () => {
    const rows = ["a1", "a2", "a3"].map((id) =>
      userRow({ id: `user_${id}`, handle: id }),
    );
    db.user.findMany.mockResolvedValue(rows);
    const { data } = await (
      await peopleV1(getRequest(`${BASE}/people?take=2&cursor=abc`))
    ).json();
    expect(data.items).toHaveLength(2);
    expect(data.nextCursor).toBe("user_a2");
    expect(db.user.findMany.mock.calls[0]?.[0]).toMatchObject({
      take: 3,
      skip: 1,
      cursor: { id: "abc" },
    });
  });

  it("filters by topic slug", async () => {
    db.user.findMany.mockResolvedValue([]);
    await peopleV1(getRequest(`${BASE}/people?topic=music`));
    expect(JSON.stringify(db.user.findMany.mock.calls[0]?.[0].where)).toContain(
      '"slug":"music"',
    );
  });

  it("hides blocked people from search results for a signed-in viewer", async () => {
    const auth = signInAs(viewer);
    db.block.findMany.mockResolvedValue([
      { blockerId: viewer.id, blockedId: "user_bad" },
      { blockerId: "user_worse", blockedId: viewer.id },
    ]);
    db.user.findMany.mockResolvedValue([]);
    await peopleV1(getRequest(`${BASE}/people?q=ab`, auth));
    expect(
      JSON.stringify(db.user.findMany.mock.calls[0]?.[0].where),
    ).toContain('"notIn":["user_bad","user_worse"]');
  });

  it("suggested=1 requires sign-in", async () => {
    const response = await peopleV1(getRequest(`${BASE}/people?suggested=1`));
    expect(response.status).toBe(401);
  });

  it("suggested=1 shares a topic, excludes self + followed, and caps at 12", async () => {
    const auth = signInAs(viewer);
    db.userTopic.findMany.mockResolvedValue([{ topicId: "t_music" }]);
    db.follow.findMany
      .mockResolvedValueOnce([{ followingId: "user_followed" }]) // already followed
      .mockResolvedValueOnce([]); // viewerFollows hydration
    db.user.findMany.mockResolvedValue([]);

    const response = await peopleV1(
      getRequest(`${BASE}/people?suggested=1&take=30`, auth),
    );
    expect(response.status).toBe(200);
    const args = db.user.findMany.mock.calls[0]?.[0];
    expect(args.take).toBe(13); // 12 + 1 lookahead
    const where = JSON.stringify(args.where);
    expect(where).toContain('"notIn":["user_viewer","user_followed"]');
    expect(where).toContain('"topicId":{"in":["t_music"]}');
  });

  it("suggested=1 is empty when the viewer has no topics yet", async () => {
    const auth = signInAs(viewer);
    db.userTopic.findMany.mockResolvedValue([]);
    const { data } = await (
      await peopleV1(getRequest(`${BASE}/people?suggested=1`, auth))
    ).json();
    expect(data).toEqual({ items: [], nextCursor: null });
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
});

describe("followers / following lists", () => {
  it("lists followers, hydrating viewerFollows, hiding blocked people", async () => {
    const auth = signInAs(viewer);
    db.user.findFirst.mockResolvedValue(robbi);
    db.block.findMany.mockResolvedValue([
      { blockerId: viewer.id, blockedId: "user_bad" },
    ]);
    const fan = userRow({ id: "user_fan", handle: "fan", name: "Fan" });
    db.follow.findMany
      .mockResolvedValueOnce([{ followerId: fan.id, follower: fan, createdAt: new Date() }])
      .mockResolvedValueOnce([{ followingId: fan.id }]);

    const response = await followersV1(
      getRequest(`${BASE}/people/robbi/followers`, auth),
      handleCtx("robbi"),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({ handle: "fan", viewerFollows: true });
    const args = db.follow.findMany.mock.calls[0]?.[0];
    expect(args.where.followingId).toBe(robbi.id);
    expect(JSON.stringify(args.where.follower)).toContain('"notIn":["user_bad"]');
    expect(JSON.stringify(args.where.follower)).toContain('"suspendedAt":null');
  });

  it("lists following with cursor paging", async () => {
    db.user.findFirst.mockResolvedValue(robbi);
    const rows = ["f1", "f2", "f3"].map((id) => ({
      followingId: `user_${id}`,
      following: userRow({ id: `user_${id}`, handle: id }),
      createdAt: new Date(),
    }));
    db.follow.findMany.mockResolvedValueOnce(rows);
    const { data } = await (
      await followingV1(
        getRequest(`${BASE}/people/robbi/following?take=2&cursor=user_f0`),
        handleCtx("robbi"),
      )
    ).json();
    expect(data.items.map((i: { handle: string }) => i.handle)).toEqual(["f1", "f2"]);
    expect(data.nextCursor).toBe("user_f2");
    expect(db.follow.findMany.mock.calls[0]?.[0]).toMatchObject({
      take: 3,
      skip: 1,
      cursor: {
        followerId_followingId: { followerId: robbi.id, followingId: "user_f0" },
      },
    });
  });

  it("404s for a blocked profile", async () => {
    const auth = signInAs(viewer);
    db.user.findFirst.mockResolvedValue(robbi);
    db.block.findMany.mockResolvedValue([
      { blockerId: robbi.id, blockedId: viewer.id },
    ]);
    const response = await followersV1(
      getRequest(`${BASE}/people/robbi/followers`, auth),
      handleCtx("robbi"),
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /api/v1/people/[handle]/community", () => {
  it("returns top-level, visible posts only", async () => {
    db.user.findFirst.mockResolvedValue(robbi);
    db.communityPost.findMany.mockResolvedValue([
      {
        id: "cp1",
        authorId: robbi.id,
        kind: "SHOUTOUT",
        body: "Go @viewer!",
        imageUrl: null,
        topicId: null,
        parentId: null,
        hiddenAt: null,
        createdAt: new Date("2026-10-01T00:00:00Z"),
        updatedAt: new Date("2026-10-01T00:00:00Z"),
        author: robbi,
        topic: null,
        _count: { reactions: 3, replies: 1 },
      },
    ]);
    const response = await personCommunityV1(
      getRequest(`${BASE}/people/robbi/community`),
      handleCtx("robbi"),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.items[0]).toMatchObject({
      id: "cp1",
      kind: "SHOUTOUT",
      supportCount: 3,
      replyCount: 1,
      viewerSupported: false,
      canDelete: false,
      parentId: null,
      author: { handle: "robbi", name: "Robbi", isArtist: false },
    });
    const where = db.communityPost.findMany.mock.calls[0]?.[0].where;
    expect(where).toMatchObject({
      authorId: robbi.id,
      parentId: null,
      hiddenAt: null,
    });
  });
});

describe("GET /api/v1/feed?kind=following", () => {
  it("requires a session", async () => {
    const response = await feedV1(getRequest(`${BASE}/feed?kind=following`));
    expect(response.status).toBe(401);
  });

  it("returns only followed authors' public posts", async () => {
    const auth = signInAs(viewer);
    db.follow.findMany.mockResolvedValue([
      { followingId: "user_artist1" },
      { followingId: "user_blocked" },
    ]);
    db.block.findMany.mockResolvedValue([
      { blockerId: viewer.id, blockedId: "user_blocked" },
    ]);
    db.post.findMany.mockResolvedValue([]);

    const response = await feedV1(getRequest(`${BASE}/feed?kind=following`, auth));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toEqual({
      kind: "following",
      items: [],
      nextCursor: null,
      followingAvailable: true,
    });
    const where = db.post.findMany.mock.calls[0]?.[0].where;
    expect(where.authorId).toEqual({ in: ["user_artist1"] });
    expect(where.status).toBe("PUBLISHED");
  });

  it("returns an empty page without querying when you follow no one", async () => {
    const auth = signInAs(viewer);
    db.follow.findMany.mockResolvedValue([]);
    const { data } = await (
      await feedV1(getRequest(`${BASE}/feed?kind=following`, auth))
    ).json();
    expect(data.items).toEqual([]);
    expect(data.kind).toBe("following");
    expect(db.post.findMany).not.toHaveBeenCalled();
  });
});
