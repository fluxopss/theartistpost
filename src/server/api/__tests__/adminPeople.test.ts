// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

const issueSignInChallenge = vi.fn();
vi.mock("@/features/auth/challenges", async (original) => ({
  ...(await original<typeof import("@/features/auth/challenges")>()),
  issueSignInChallenge: (...args: unknown[]) => issueSignInChallenge(...args),
}));

import { GET as listV1 } from "@/app/api/v1/admin/users/route";
import { GET as detailV1 } from "@/app/api/v1/admin/users/[id]/route";
import { POST as actionV1 } from "@/app/api/v1/admin/users/[id]/actions/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import {
  artistRow,
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
  type UserRow,
} from "./testkit";

const BASE = "http://localhost/api/v1/admin/users";

const admin = userRow({ id: "user_admin", handle: "boss", role: "ADMIN", name: "Boss" });
const member = userRow({ id: "user_member", handle: "vera", name: "Vera Viewer" });

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  nextTarget = undefined;
  issueSignInChallenge.mockReset();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** The account the next action/detail call will look up (queued after the signed-in admin). */
let nextTarget: UserRow | null | undefined;
function target(user: UserRow | null) {
  nextTarget = user;
}

function auth(who: UserRow) {
  const headers = signInAs(who);
  if (nextTarget !== undefined) db.user.findUnique.mockResolvedValueOnce(nextTarget);
  nextTarget = undefined;
  return headers;
}

function act(id: string, body: unknown, who = admin) {
  return actionV1(jsonRequest(`${BASE}/${id}/actions`, "POST", body, auth(who)), {
    params: Promise.resolve({ id }),
  });
}

function auditActions(): string[] {
  return db.auditLog.create.mock.calls.map((c) => c[0].data.action);
}

describe("permissions: every admin people endpoint is ADMIN only", () => {
  const nonAdmins = [
    ["a member", member],
    ["an artist", artistRow("painter")],
  ] as const;

  it("401s without a session", async () => {
    expect((await listV1(getRequest(BASE))).status).toBe(401);
    expect(
      (
        await detailV1(getRequest(`${BASE}/user_member`), {
          params: Promise.resolve({ id: "user_member" }),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await actionV1(
          jsonRequest(`${BASE}/user_member/actions`, "POST", { action: "suspend", reason: "spam" }),
          { params: Promise.resolve({ id: "user_member" }) },
        )
      ).status,
    ).toBe(401);
  });

  for (const [label, who] of nonAdmins) {
    it(`403s ${label} on list, detail and actions, with no writes`, async () => {
      expect((await listV1(getRequest(BASE, signInAs(who)))).status).toBe(403);
      expect(
        (
          await detailV1(getRequest(`${BASE}/user_x`, signInAs(who)), {
            params: Promise.resolve({ id: "user_x" }),
          })
        ).status,
      ).toBe(403);
      expect(
        (await act("user_x", { action: "set_role", role: "ADMIN", reason: "let me in" }, who)).status,
      ).toBe(403);
      expect(db.user.update).not.toHaveBeenCalled();
      expect(db.artistProfile.update).not.toHaveBeenCalled();
      expect(db.auditLog.create).not.toHaveBeenCalled();
    });
  }

  it("never caches admin responses", async () => {
    db.user.findMany.mockResolvedValue([]);
    const response = await listV1(getRequest(BASE, signInAs(admin)));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("GET /admin/users: search and filters", () => {
  it("searches name, @handle and email server-side (leading @ stripped)", async () => {
    db.user.findMany.mockResolvedValue([]);
    const response = await listV1(getRequest(`${BASE}?q=%40Vera`, signInAs(admin)));
    expect(response.status).toBe(200);
    const where = db.user.findMany.mock.calls[0]?.[0].where;
    const text = JSON.stringify(where);
    expect(text).toContain('"name":{"contains":"Vera","mode":"insensitive"}');
    expect(text).toContain('"email":{"contains":"Vera","mode":"insensitive"}');
    expect(text).toContain('"handle":{"contains":"Vera","mode":"insensitive"}');
  });

  it("filters by role, status and pending artist together", async () => {
    db.user.findMany.mockResolvedValue([]);
    await listV1(
      getRequest(`${BASE}?role=ARTIST&status=suspended&pendingArtist=1`, signInAs(admin)),
    );
    const text = JSON.stringify(db.user.findMany.mock.calls[0]?.[0].where);
    expect(text).toContain('"role":"ARTIST"');
    expect(text).toContain('"suspendedAt":{"not":null}');
    expect(text).toContain('"artistProfile":{"is":{"approved":false}}');
  });

  it("active means not suspended", async () => {
    db.user.findMany.mockResolvedValue([]);
    await listV1(getRequest(`${BASE}?status=active`, signInAs(admin)));
    expect(JSON.stringify(db.user.findMany.mock.calls[0]?.[0].where)).toContain(
      '"suspendedAt":null',
    );
  });

  it("rejects unknown role/status and an oversized search", async () => {
    for (const query of ["role=OWNER", "status=banned", `q=${"x".repeat(81)}`]) {
      const response = await listV1(getRequest(`${BASE}?${query}`, signInAs(admin)));
      expect(response.status).toBe(400);
    }
  });

  it("returns name, handle, avatar, role, joined date, suspended flag and a cursor", async () => {
    const a = artistRow("painter", { id: "user_a", image: "/uploads/a.png" });
    const b = userRow({ id: "user_b", suspendedAt: new Date("2026-02-01T00:00:00Z") });
    const c = userRow({ id: "user_c" });
    db.user.findMany.mockResolvedValue([a, b, c]);
    const { data } = await (await listV1(getRequest(`${BASE}?take=2`, signInAs(admin)))).json();
    expect(db.user.findMany.mock.calls[0]?.[0].take).toBe(3);
    expect(data.items).toHaveLength(2);
    expect(data.nextCursor).toBe("user_b");
    expect(data.items[0]).toMatchObject({
      id: "user_a",
      handle: "painter",
      role: "ARTIST",
      suspended: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(data.items[0].avatarUrl).toMatch(/^https?:\/\/.+\/uploads\/a\.png$/);
    expect(data.items[1].suspended).toBe(true);
  });
});

describe("GET /admin/users/[id]: member detail", () => {
  it("returns profile, counts, recent activity and audit history", async () => {
    target(
      userRow({
        id: "user_member",
        suspendedAt: new Date("2026-03-01T00:00:00Z"),
        bio: "I draw.",
      }),
    );
    db.post.count.mockResolvedValue(2);
    db.comment.count.mockResolvedValue(3);
    db.communityPost.count.mockResolvedValue(4);
    db.follow.count.mockImplementation(async ({ where }) => (where.followerId ? 5 : 6));
    db.report.count.mockImplementation(async ({ where }) => (where.reporterId ? 7 : 8));
    db.post.findMany.mockResolvedValue([
      { id: "p1", title: "Blue study", createdAt: new Date("2026-01-03T00:00:00Z") },
    ]);
    db.comment.findMany.mockResolvedValue([
      { id: "c1", body: "Lovely", createdAt: new Date("2026-01-05T00:00:00Z") },
    ]);
    db.communityPost.findMany.mockResolvedValue([
      { id: "cp1", body: "Hello house", createdAt: new Date("2026-01-04T00:00:00Z") },
    ]);
    db.auditLog.findMany.mockResolvedValue([
      {
        id: "a1",
        actorId: "user_admin",
        action: "user.suspend",
        targetType: "User",
        targetId: "user_member",
        meta: { reason: "Repeated spam" },
        createdAt: new Date("2026-03-01T00:00:00Z"),
      },
    ]);
    db.user.findMany.mockResolvedValue([admin]);

    const response = await detailV1(getRequest(`${BASE}/user_member`, auth(admin)), {
      params: Promise.resolve({ id: "user_member" }),
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.user).toMatchObject({
      id: "user_member",
      email: "user_member@example.com",
      role: "VIEWER",
      bio: "I draw.",
      suspendedAt: "2026-03-01T00:00:00.000Z",
    });
    expect(data.user.suspension).toMatchObject({ reason: "Repeated spam", by: "Boss" });
    expect(data.counts).toEqual({
      posts: 2,
      comments: 3,
      communityPosts: 4,
      following: 5,
      followers: 6,
      reportsFiled: 7,
      reportsReceived: 8,
    });
    expect(data.recentActivity.map((a: { id: string }) => a.id)).toEqual(["c1", "cp1", "p1"]);
    expect(data.audit[0]).toMatchObject({
      action: "user.suspend",
      reason: "Repeated spam",
      actor: { name: "Boss" },
    });
  });

  it("keeps the person's own sign-in and block noise out of the history", async () => {
    target(userRow({ id: "user_member" }));
    db.auditLog.findMany.mockResolvedValue([]);
    const response = await detailV1(getRequest(`${BASE}/user_member`, auth(admin)), {
      params: Promise.resolve({ id: "user_member" }),
    });
    expect(response.status).toBe(200);
    const where = db.auditLog.findMany.mock.calls[0]?.[0].where;
    expect(where.NOT).toEqual(
      expect.arrayContaining([
        { action: { startsWith: "auth." } },
        { action: { startsWith: "block." } },
      ]),
    );
  });

  it("404s a missing account", async () => {
    target(null);
    const response = await detailV1(getRequest(`${BASE}/user_gone`, auth(admin)), {
      params: Promise.resolve({ id: "user_gone" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("POST /admin/users/[id]/actions: validation", () => {
  it("requires a real reason for every action", async () => {
    for (const body of [
      { action: "suspend" },
      { action: "suspend", reason: "   " },
      { action: "suspend", reason: "no" },
      { action: "unsuspend", reason: "x".repeat(201) },
    ]) {
      expect((await act("user_member", body)).status).toBe(400);
    }
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects unknown actions and set_role without a valid role", async () => {
    expect((await act("user_member", { action: "delete", reason: "bye bye" })).status).toBe(400);
    expect((await act("user_member", { action: "set_role", reason: "promote" })).status).toBe(400);
    expect(
      (await act("user_member", { action: "set_role", role: "OWNER", reason: "promote" })).status,
    ).toBe(400);
  });

  it("404s a missing account and refuses reserved seed identities", async () => {
    target(null);
    expect((await act("user_gone", { action: "suspend", reason: "spam run" })).status).toBe(404);

    const seed = userRow({ id: "user_seed", email: "luna@theartistpost.org" });
    target(seed);
    expect((await act("user_seed", { action: "suspend", reason: "spam run" })).status).toBe(403);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("actions: set_role", () => {
  it("promotes with a reason and audits who, what and why", async () => {
    const artist = artistRow("painter", { id: "user_painter", role: "VIEWER" });
    target(artist);
    const response = await act("user_painter", {
      action: "set_role",
      role: "ARTIST",
      reason: "Verified with Robbie",
    });
    expect(response.status).toBe(200);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_painter" },
      data: { role: "ARTIST" },
    });
    const entry = db.auditLog.create.mock.calls[0]?.[0].data;
    expect(entry).toMatchObject({
      actorId: "user_admin",
      action: "user.role_change",
      targetType: "User",
      targetId: "user_painter",
    });
    expect(entry.meta).toMatchObject({
      from: "VIEWER",
      to: "ARTIST",
      reason: "Verified with Robbie",
    });
  });

  it("will not remove your own admin role", async () => {
    target(admin);
    const response = await act("user_admin", {
      action: "set_role",
      role: "VIEWER",
      reason: "stepping down",
    });
    expect(response.status).toBe(409);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("will not demote the last active admin", async () => {
    const other = userRow({ id: "user_other", role: "ADMIN" });
    target(other);
    db.user.count.mockResolvedValue(0);
    const response = await act("user_other", {
      action: "set_role",
      role: "VIEWER",
      reason: "cleanup",
    });
    expect(response.status).toBe(409);
    expect(db.user.count.mock.calls[0]?.[0].where).toEqual({
      role: "ADMIN",
      suspendedAt: null,
      id: { not: "user_other" },
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("allows demoting an admin when another active admin remains", async () => {
    const other = userRow({ id: "user_other", role: "ADMIN" });
    target(other);
    db.user.count.mockResolvedValue(1);
    expect(
      (await act("user_other", { action: "set_role", role: "VIEWER", reason: "cleanup" })).status,
    ).toBe(200);
    expect(db.user.update).toHaveBeenCalled();
  });

  it("only makes someone an artist when a studio profile exists", async () => {
    target(member);
    const response = await act("user_member", {
      action: "set_role",
      role: "ARTIST",
      reason: "they asked",
    });
    expect(response.status).toBe(409);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("conflicts when the role is already that role (no silent no-op audit)", async () => {
    target(member);
    const response = await act("user_member", {
      action: "set_role",
      role: "VIEWER",
      reason: "double check",
    });
    expect(response.status).toBe(409);
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("actions: artist approval", () => {
  it("approves a pending artist, promotes the role and audits the reason", async () => {
    const pending = artistRow("pending", { id: "user_pending", role: "VIEWER" }, false);
    target(pending);
    const response = await act("user_pending", {
      action: "approve_artist",
      reason: "Portfolio looks real",
    });
    expect(response.status).toBe(200);
    expect(db.artistProfile.update).toHaveBeenCalledWith({
      where: { id: "ap_pending" },
      data: { approved: true },
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_pending" },
      data: { role: "ARTIST" },
    });
    const entry = db.auditLog.create.mock.calls.find(
      (c) => c[0].data.action === "artist.approve",
    )?.[0].data;
    expect(entry.actorId).toBe("user_admin");
    expect(entry.meta.reason).toBe("Portfolio looks real");
  });

  it("revokes an approved artist and audits it", async () => {
    target(artistRow("painter", { id: "user_painter" }));
    const response = await act("user_painter", {
      action: "revoke_artist",
      reason: "Not their own work",
    });
    expect(response.status).toBe(200);
    expect(db.artistProfile.update).toHaveBeenCalledWith({
      where: { id: "ap_painter" },
      data: { approved: false },
    });
    expect(auditActions()).toContain("artist.revoke");
  });

  it("409s without an artist profile, and when already in that state", async () => {
    target(member);
    expect(
      (await act("user_member", { action: "approve_artist", reason: "sure sure" })).status,
    ).toBe(409);

    target(artistRow("painter", { id: "user_painter" }));
    expect(
      (await act("user_painter", { action: "approve_artist", reason: "again please" })).status,
    ).toBe(409);
    expect(db.artistProfile.update).not.toHaveBeenCalled();
  });
});

describe("actions: suspend / unsuspend", () => {
  it("suspends with a reason and audits it", async () => {
    target(member);
    const response = await act("user_member", { action: "suspend", reason: "Harassing members" });
    expect(response.status).toBe(200);
    const update = db.user.update.mock.calls[0]?.[0];
    expect(update.where).toEqual({ id: "user_member" });
    expect(update.data.suspendedAt).toBeInstanceOf(Date);
    const entry = db.auditLog.create.mock.calls[0]?.[0].data;
    expect(entry).toMatchObject({
      actorId: "user_admin",
      action: "user.suspend",
      targetId: "user_member",
    });
    expect(entry.meta.reason).toBe("Harassing members");
  });

  it("will not suspend yourself", async () => {
    target(admin);
    const response = await act("user_admin", { action: "suspend", reason: "testing it" });
    expect(response.status).toBe(409);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("will not suspend another admin (demote first)", async () => {
    target(userRow({ id: "user_other", role: "ADMIN" }));
    const response = await act("user_other", { action: "suspend", reason: "testing it" });
    expect(response.status).toBe(409);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("409s when already suspended / not suspended", async () => {
    target(userRow({ id: "user_s", suspendedAt: new Date() }));
    expect((await act("user_s", { action: "suspend", reason: "second time" })).status).toBe(409);
    target(member);
    expect((await act("user_member", { action: "unsuspend", reason: "mistake" })).status).toBe(409);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("unsuspends and audits", async () => {
    target(userRow({ id: "user_s", suspendedAt: new Date() }));
    const response = await act("user_s", { action: "unsuspend", reason: "Apologised, all good" });
    expect(response.status).toBe(200);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_s" },
      data: { suspendedAt: null },
    });
    expect(auditActions()).toContain("user.unsuspend");
  });
});

describe("actions: send_sign_in_help", () => {
  it("emails a code through the existing auth path and never returns it", async () => {
    issueSignInChallenge.mockResolvedValue({
      ok: true,
      challengeId: "ch_1",
      expiresAt: "2026-01-01T00:10:00.000Z",
      delivered: true,
      debugCode: "123456",
    });
    target(member);
    const response = await act("user_member", {
      action: "send_sign_in_help",
      reason: "Locked out, asked Robbie",
    });
    expect(response.status).toBe(200);
    expect(issueSignInChallenge).toHaveBeenCalledWith(
      expect.anything(),
      "user_member@example.com",
    );
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain("123456");
    expect(text).not.toContain("debugCode");
    const entry = db.auditLog.create.mock.calls.find(
      (c) => c[0].data.action === "user.sign_in_help",
    )?.[0].data;
    expect(entry).toMatchObject({ actorId: "user_admin", targetId: "user_member" });
    expect(entry.meta.reason).toBe("Locked out, asked Robbie");
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("reports a delivery failure instead of pretending it sent", async () => {
    issueSignInChallenge.mockResolvedValue({
      ok: false,
      error: "Code delivery failed.",
      code: "unavailable",
    });
    target(member);
    const response = await act("user_member", {
      action: "send_sign_in_help",
      reason: "Locked out",
    });
    expect(response.status).toBe(502);
    expect(auditActions()).not.toContain("user.sign_in_help");
  });

  it("rate limits repeats to the same person", async () => {
    issueSignInChallenge.mockResolvedValue({
      ok: true,
      challengeId: "c",
      expiresAt: "x",
      delivered: true,
    });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      target(member);
      statuses.push(
        (await act("user_member", { action: "send_sign_in_help", reason: "Locked out" })).status,
      );
    }
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses).toContain(429);
  });
});
