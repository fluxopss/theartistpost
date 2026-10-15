// @vitest-environment node
import { createHash } from "node:crypto";
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
  DELETE as deleteMeV1,
  GET as getMeV1,
  PATCH as patchMeV1,
} from "@/app/api/v1/me/route";
import { POST as avatarV1 } from "@/app/api/v1/me/avatar/route";
import { POST as termsV1 } from "@/app/api/v1/me/terms/route";
import { GET as topicsV1 } from "@/app/api/v1/topics/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import {
  isHandleUniqueViolation,
  isReservedHandle,
  normalizeHandle,
} from "@/server/api/handles";
import {
  artistRow,
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const ME = "http://localhost/api/v1/me";

function topicRows(slugs: string[]) {
  return slugs.map((slug, i) => ({
    id: `t_${slug}`,
    slug,
    name: slug.toUpperCase(),
    kind: "genre",
    sortOrder: i,
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  storeMock.storeUploadedMedia.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("handles", () => {
  it("normalizes and rejects reserved handles", () => {
    expect(normalizeHandle("  Robbie_Art ")).toBe("robbie_art");
    for (const h of [
      "admin",
      "TheArtistPost",
      "tap",
      "support",
      "studioguest",
      "api",
      "settings",
      "me",
      "u",
    ]) {
      expect(isReservedHandle(h)).toBe(true);
    }
    expect(isReservedHandle("robbie")).toBe(false);
  });

  it("recognises a handle unique-constraint failure only", () => {
    expect(
      isHandleUniqueViolation({ code: "P2002", meta: { target: ["handle"] } }),
    ).toBe(true);
    expect(
      isHandleUniqueViolation({
        code: "P2002",
        meta: { target: "User_handle_key" },
      }),
    ).toBe(true);
    expect(
      isHandleUniqueViolation({ code: "P2002", meta: { target: ["email"] } }),
    ).toBe(false);
    expect(isHandleUniqueViolation(new Error("boom"))).toBe(false);
  });
});

describe("GET /api/v1/topics", () => {
  it("returns active topics sorted by sortOrder", async () => {
    db.topic.findMany.mockResolvedValue(topicRows(["music", "dance"]));
    const response = await topicsV1();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([
      { slug: "music", name: "MUSIC", kind: "genre" },
      { slug: "dance", name: "DANCE", kind: "genre" },
    ]);
    expect(db.topic.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  });
});

describe("GET /api/v1/me", () => {
  it("returns the profile fields, topics and counts", async () => {
    const user = userRow({
      bio: "Hi",
      headline: "Painter",
      location: "WPB",
      chapterId: "fl-wpb",
    });
    const auth = signInAs(user);
    db.userTopic.findMany.mockResolvedValue([{ topic: topicRows(["music"])[0] }]);
    db.follow.count.mockResolvedValueOnce(4).mockResolvedValueOnce(7);
    db.notification.count.mockResolvedValue(2);

    const response = await getMeV1(getRequest(ME, auth));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.user).toMatchObject({
      id: user.id,
      handle: user.handle,
      bio: "Hi",
      headline: "Painter",
      location: "WPB",
      chapterId: "fl-wpb",
      suspended: false,
      followerCount: 4,
      followingCount: 7,
      unreadNotifications: 2,
    });
    expect(data.user.termsAcceptedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(data.user.topics).toEqual([
      { slug: "music", name: "MUSIC", kind: "genre" },
    ]);
    expect(data.profile).toBeNull();
  });
});

describe("PATCH /api/v1/me", () => {
  it("stores the handle lowercased", async () => {
    const user = userRow({ handle: null });
    const auth = signInAs(user);
    db.user.findUnique.mockResolvedValueOnce({ ...user, handle: "robbie_art" });

    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { handle: "Robbie_Art" }, auth),
    );
    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: user.id },
      data: { handle: "robbie_art" },
    });
    expect((await response.json()).data.user.handle).toBe("robbie_art");
    expect(db.auditLog.create).toHaveBeenCalled();
  });

  it("rejects a reserved handle with fields.handle", async () => {
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { handle: "admin" }, signInAs(userRow())),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.handle).toBeTruthy();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rejects a malformed handle", async () => {
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { handle: "has spaces!" }, signInAs(userRow())),
    );
    expect(response.status).toBe(400);
  });

  it("returns 409 fields.handle when another artist's profile uses the handle (case-insensitive)", async () => {
    const user = userRow({ handle: null });
    const auth = signInAs(user);
    db.artistProfile.findFirst.mockResolvedValue({
      id: "ap_x",
      handle: "RealPainter",
    });

    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { handle: "realpainter" }, auth),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.fields.handle).toBeTruthy();
    expect(db.artistProfile.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: {
        handle: { equals: "realpainter", mode: "insensitive" },
        userId: { not: user.id },
      },
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("returns 409 fields.handle when another user holds the handle", async () => {
    const user = userRow({ handle: null });
    const auth = signInAs(user);
    db.user.findFirst.mockResolvedValue({ id: "someone" });
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { handle: "taken" }, auth),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.fields.handle).toBeTruthy();
  });

  it("maps a unique-constraint race on handle to 409", async () => {
    const user = userRow({ handle: null });
    const auth = signInAs(user);
    db.user.update.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { handle: "racey" }, auth),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.fields.handle).toBeTruthy();
  });

  it("locks an artist's handle to their ArtistProfile handle", async () => {
    const artist = artistRow("realpainter");
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { handle: "newname" }, signInAs(artist)),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.fields.handle).toBeTruthy();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rejects more than 8 topics", async () => {
    const slugs = Array.from({ length: 9 }, (_, i) => `t${i}`);
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { topicSlugs: slugs }, signInAs(userRow())),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.topicSlugs).toBeTruthy();
  });

  it("rejects an unknown topic slug", async () => {
    db.topic.findMany.mockResolvedValue(topicRows(["music"]));
    const response = await patchMeV1(
      jsonRequest(
        ME,
        "PATCH",
        { topicSlugs: ["music", "nope"] },
        signInAs(userRow()),
      ),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.topicSlugs).toMatch(/nope/);
  });

  it("replaces topics for a valid list", async () => {
    const user = userRow();
    const auth = signInAs(user);
    db.topic.findMany.mockResolvedValue(topicRows(["music", "dance"]));
    db.user.findUnique.mockResolvedValueOnce(user);
    const response = await patchMeV1(
      jsonRequest(
        ME,
        "PATCH",
        { topicSlugs: ["music", "dance", "music"] },
        auth,
      ),
    );
    expect(response.status).toBe(200);
    expect(db.userTopic.deleteMany).toHaveBeenCalledWith({
      where: { userId: user.id },
    });
    expect(db.userTopic.createMany.mock.calls[0]?.[0]).toMatchObject({
      data: [
        { userId: user.id, topicId: "t_music" },
        { userId: user.id, topicId: "t_dance" },
      ],
    });
  });

  it("lets a member (no ArtistProfile) set bio, headline, location", async () => {
    const user = userRow();
    const auth = signInAs(user);
    db.user.findUnique.mockResolvedValueOnce({ ...user, bio: "I paint." });
    const response = await patchMeV1(
      jsonRequest(
        ME,
        "PATCH",
        { bio: "I paint.", headline: "Muralist", location: "WPB" },
        auth,
      ),
    );
    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]?.[0]).toMatchObject({
      data: { bio: "I paint.", headline: "Muralist", location: "WPB" },
    });
    expect(db.artistProfile.update).not.toHaveBeenCalled();
  });

  it("mirrors an artist's bio onto the ArtistProfile", async () => {
    const artist = artistRow("realpainter");
    const auth = signInAs(artist);
    db.user.findUnique.mockResolvedValueOnce(artist);
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { bio: "Oils." }, auth),
    );
    expect(response.status).toBe(200);
    expect(db.artistProfile.update).toHaveBeenCalledWith({
      where: { id: "ap_realpainter" },
      data: { bio: "Oils." },
    });
  });

  it("enforces text limits", async () => {
    for (const body of [
      { bio: "x".repeat(481) },
      { headline: "x".repeat(81) },
      { location: "x".repeat(61) },
    ]) {
      const response = await patchMeV1(
        jsonRequest(ME, "PATCH", body, signInAs(userRow())),
      );
      expect(response.status).toBe(400);
    }
  });

  it("validates chapterId against the content chapters and allows null", async () => {
    const bad = await patchMeV1(
      jsonRequest(ME, "PATCH", { chapterId: "atlantis" }, signInAs(userRow())),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.fields.chapterId).toBeTruthy();

    const user = userRow({ chapterId: "fl-wpb" });
    const auth = signInAs(user);
    db.user.findUnique.mockResolvedValueOnce(user);
    const ok = await patchMeV1(
      jsonRequest(ME, "PATCH", { chapterId: "fl-wpb" }, auth),
    );
    expect(ok.status).toBe(200);

    const cleared = userRow();
    const auth2 = signInAs(cleared);
    db.user.findUnique.mockResolvedValueOnce(cleared);
    const none = await patchMeV1(
      jsonRequest(ME, "PATCH", { chapterId: null }, auth2),
    );
    expect(none.status).toBe(200);
    expect(db.user.update.mock.calls.at(-1)?.[0]).toMatchObject({
      data: { chapterId: null },
    });
  });

  it("requires at least one field", async () => {
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", {}, signInAs(userRow())),
    );
    expect(response.status).toBe(400);
  });

  it("is forbidden for a suspended user", async () => {
    const user = userRow({ suspendedAt: new Date() });
    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { name: "Still Here" }, signInAs(user)),
    );
    expect(response.status).toBe(403);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

function avatarRequest(file: File, headers: Record<string, string>) {
  const form = new FormData();
  form.set("file", file);
  return new Request("http://localhost/api/v1/me/avatar", {
    method: "POST",
    headers,
    body: form,
  });
}

describe("POST /api/v1/me/avatar", () => {
  it("rejects video uploads before storing anything", async () => {
    const auth = signInAs(userRow());
    const video = new File(
      [new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70])],
      "x.mp4",
      { type: "video/mp4" },
    );
    const response = await avatarV1(avatarRequest(video, auth));
    expect(response.status).toBe(400);
    expect(storeMock.storeUploadedMedia).not.toHaveBeenCalled();
  });

  it("requires a file", async () => {
    const auth = signInAs(userRow());
    const response = await avatarV1(
      new Request("http://localhost/api/v1/me/avatar", {
        method: "POST",
        headers: auth,
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("stores an image and updates User.image and ArtistProfile.avatarUrl", async () => {
    const artist = artistRow("realpainter");
    const auth = signInAs(artist);
    storeMock.storeUploadedMedia.mockResolvedValue({
      ok: true,
      media: {
        url: "/uploads/a.jpg",
        absoluteUrl: "https://x/uploads/a.jpg",
        mediaType: "IMAGE",
        contentType: "image/jpeg",
        bytes: 3,
      },
    });
    const img = new File([new Uint8Array([0xff, 0xd8, 0xff])], "a.jpg", {
      type: "image/jpeg",
    });
    const response = await avatarV1(avatarRequest(img, auth));
    expect(response.status).toBe(200);
    expect((await response.json()).data.avatarUrl).toMatch(
      /\/uploads\/a\.jpg$/,
    );
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: artist.id },
      data: { image: "/uploads/a.jpg" },
    });
    expect(db.artistProfile.update).toHaveBeenCalledWith({
      where: { id: "ap_realpainter" },
      data: { avatarUrl: "/uploads/a.jpg" },
    });
  });

  it("requires sign-in", async () => {
    const img = new File([new Uint8Array([1])], "a.jpg", {
      type: "image/jpeg",
    });
    const response = await avatarV1(avatarRequest(img, {}));
    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/me/terms", () => {
  it("requires { accept: true }", async () => {
    const response = await termsV1(
      jsonRequest(`${ME}/terms`, "POST", { accept: false }, signInAs(userRow())),
    );
    expect(response.status).toBe(400);
  });

  it("records acceptance once and audits it", async () => {
    const user = userRow({ termsAcceptedAt: null });
    const auth = signInAs(user);
    db.user.update.mockResolvedValue({
      ...user,
      termsAcceptedAt: new Date("2026-10-14T12:00:00Z"),
    });
    const response = await termsV1(
      jsonRequest(`${ME}/terms`, "POST", { accept: true }, auth),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.termsAcceptedAt).toBe(
      "2026-10-14T12:00:00.000Z",
    );
    expect(
      db.user.update.mock.calls[0]?.[0].data.termsAcceptedAt,
    ).toBeInstanceOf(Date);
    expect(db.auditLog.create.mock.calls[0]?.[0].data.action).toBe(
      "user.terms_accept",
    );
  });

  it("keeps the original timestamp when already accepted", async () => {
    const user = userRow();
    const response = await termsV1(
      jsonRequest(`${ME}/terms`, "POST", { accept: true }, signInAs(user)),
    );
    expect(response.status).toBe(200);
    expect(db.user.update).not.toHaveBeenCalled();
    expect((await response.json()).data.termsAcceptedAt).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});

describe("DELETE /api/v1/me", () => {
  it("requires { confirm: 'DELETE' }", async () => {
    for (const body of [undefined, {}, { confirm: "delete" }, { confirm: "yes" }]) {
      const response = await deleteMeV1(
        jsonRequest(ME, "DELETE", body, signInAs(userRow())),
      );
      expect(response.status).toBe(400);
    }
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it("deletes once and audits with an email hash, never the email", async () => {
    const user = userRow({ email: "private.person@example.com" });
    const auth = signInAs(user);
    db.communityPost.findMany.mockResolvedValue([{ id: "cp1" }]);
    db.comment.findMany.mockResolvedValue([{ id: "cm1" }]);
    db.post.findMany.mockResolvedValue([{ id: "po1" }]);

    const response = await deleteMeV1(
      jsonRequest(ME, "DELETE", { confirm: "DELETE" }, auth),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ deleted: true });
    expect(db.user.delete).toHaveBeenCalledTimes(1);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: user.id } });

    // dangling reports about the user's content go with the account
    expect(db.report.deleteMany.mock.calls[0]?.[0].where.OR).toEqual(
      expect.arrayContaining([
        { targetType: "USER", targetId: user.id },
        { targetType: "COMMUNITY_POST", targetId: { in: ["cp1"] } },
        { targetType: "COMMENT", targetId: { in: ["cm1"] } },
        { targetType: "POST", targetId: { in: ["po1"] } },
      ]),
    );

    const audit = db.auditLog.create.mock.calls.find(
      (c) => c[0].data.action === "user.delete",
    );
    expect(audit).toBeTruthy();
    expect(JSON.stringify(audit?.[0])).not.toContain(
      "private.person@example.com",
    );
    expect(audit?.[0].data.meta.emailSha256).toBe(
      createHash("sha256").update("private.person@example.com").digest("hex"),
    );
  });

  describe("Supabase identity cleanup", () => {
    const SB = "https://abc.supabase.co";
    const linked = () =>
      userRow({ email: "linked@example.com", supabaseAuthId: "sb-uuid-1" });

    it("deletes the Auth identity after the DB delete, with the right URL and headers", async () => {
      vi.stubEnv("SUPABASE_URL", `${SB}/`);
      vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test_key");
      const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const user = linked();
      const response = await deleteMeV1(
        jsonRequest(ME, "DELETE", { confirm: "DELETE" }, signInAs(user)),
      );
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(`${SB}/auth/v1/admin/users/sb-uuid-1`);
      expect(init.method).toBe("DELETE");
      expect(init.headers).toMatchObject({
        apikey: "sb_secret_test_key",
        Authorization: "Bearer sb_secret_test_key",
      });
      // DB delete committed before the identity call
      expect(db.user.delete.mock.invocationCallOrder[0]).toBeLessThan(
        fetchMock.mock.invocationCallOrder[0]!,
      );
      vi.unstubAllGlobals();
    });

    it("skips with a warning when the env is missing, or the user has no identity", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      vi.stubEnv("SUPABASE_URL", "");
      vi.stubEnv("SUPABASE_SECRET_KEY", "");
      const response = await deleteMeV1(
        jsonRequest(ME, "DELETE", { confirm: "DELETE" }, signInAs(linked())),
      );
      expect(response.status).toBe(200);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
      expect(JSON.stringify(warn.mock.calls)).not.toContain("sb-uuid-1");

      vi.stubEnv("SUPABASE_URL", SB);
      vi.stubEnv("SUPABASE_SECRET_KEY", "k");
      warn.mockClear();
      await deleteMeV1(
        jsonRequest(ME, "DELETE", { confirm: "DELETE" }, signInAs(userRow())),
      );
      expect(fetchMock).not.toHaveBeenCalled();
      warn.mockRestore();
      vi.unstubAllGlobals();
    });

    it("still deletes the account, logs and audits when the identity call fails", async () => {
      vi.stubEnv("SUPABASE_URL", SB);
      vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test_key");
      vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("network down"))));
      const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const response = await deleteMeV1(
        jsonRequest(ME, "DELETE", { confirm: "DELETE" }, signInAs(linked())),
      );
      expect(response.status).toBe(200);
      expect(db.user.delete).toHaveBeenCalledTimes(1);
      const actions = db.auditLog.create.mock.calls.map((c) => c[0].data.action);
      expect(actions).toContain("user.delete");
      expect(actions).toContain("user.delete_identity_failed");
      expect(JSON.stringify(err.mock.calls)).not.toContain("sb_secret_test_key");
      err.mockRestore();
      vi.unstubAllGlobals();
    });

    it("treats a non-2xx identity response as a failure but never blocks deletion", async () => {
      vi.stubEnv("SUPABASE_URL", SB);
      vi.stubEnv("SUPABASE_SECRET_KEY", "k");
      vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
      const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const response = await deleteMeV1(
        jsonRequest(ME, "DELETE", { confirm: "DELETE" }, signInAs(linked())),
      );
      expect(response.status).toBe(200);
      expect(db.auditLog.create.mock.calls.map((c) => c[0].data.action)).toContain(
        "user.delete_identity_failed",
      );
      err.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  it("still works for a suspended user", async () => {
    const user = userRow({ suspendedAt: new Date() });
    const response = await deleteMeV1(
      jsonRequest(ME, "DELETE", { confirm: "DELETE" }, signInAs(user)),
    );
    expect(response.status).toBe(200);
    expect(db.user.delete).toHaveBeenCalledTimes(1);
  });

  it("refuses to delete the last admin", async () => {
    const admin = userRow({ id: "user_admin", role: "ADMIN" });
    db.user.count.mockResolvedValue(0);
    const response = await deleteMeV1(
      jsonRequest(ME, "DELETE", { confirm: "DELETE" }, signInAs(admin)),
    );
    expect(response.status).toBe(409);
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it("requires sign-in", async () => {
    const response = await deleteMeV1(
      jsonRequest(ME, "DELETE", { confirm: "DELETE" }),
    );
    expect(response.status).toBe(401);
  });
});
