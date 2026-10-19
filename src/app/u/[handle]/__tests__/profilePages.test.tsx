// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getPerson = vi.fn();
const listPersonCommunity = vi.fn();
const listFollowers = vi.fn();
const listFollowing = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({}) }));
vi.mock("@/server/api/people", () => ({
  getPerson: (...a: unknown[]) => getPerson(...a),
  listPersonCommunity: (...a: unknown[]) => listPersonCommunity(...a),
  listFollowers: (...a: unknown[]) => listFollowers(...a),
  listFollowing: (...a: unknown[]) => listFollowing(...a),
}));
vi.mock("@/features/people/FollowButton", () => ({ FollowBar: () => null }));
vi.mock("@/features/community/gate", () => ({ communityGate: async (s: unknown) => (s ? "ready" : "signedOut") }));
vi.mock("@/features/community/CommunityCard", () => ({ CommunityCard: () => null }));

import ProfilePage from "@/app/u/[handle]/page";
import FollowersPage, { dynamic as followersDynamic, metadata as followersMeta } from "@/app/u/[handle]/followers/page";
import FollowingPage from "@/app/u/[handle]/following/page";

const person = {
  id: "user_rae",
  handle: "rae",
  name: "Rae",
  avatarUrl: null,
  headline: null,
  isArtist: false,
  viewerFollows: true,
  bio: null,
  location: null,
  chapter: null,
  topics: [],
  followerCount: 4,
  followingCount: 2,
  communityPostCount: 0,
  followsViewer: true,
  isSelf: false,
  artist: null,
  paymentLinks: [],
  joinedAt: "2026-10-01T00:00:00.000Z",
};
const params = (handle = "rae") => Promise.resolve({ handle });
const fan = { id: "user_fan", handle: "fan", name: "Fan", avatarUrl: null, headline: "Poet", isArtist: true, viewerFollows: false };

beforeEach(() => {
  [getSession, getPerson, listPersonCommunity, listFollowers, listFollowing, notFound].forEach((m) => m.mockClear());
  getSession.mockReset();
  getPerson.mockResolvedValue(person);
  listPersonCommunity.mockResolvedValue({ ok: true, page: { items: [], nextCursor: null } });
});

describe("/u/[handle] knows who is looking", () => {
  it("passes the signed-in viewer to the profile and posts", async () => {
    getSession.mockResolvedValue({ id: "u1", role: "ARTIST", email: "v@example.com", name: "V" });
    const el = JSON.stringify(await ProfilePage({ params: params() }));
    expect(getPerson).toHaveBeenCalledWith(expect.anything(), "rae", "u1");
    expect(listPersonCommunity).toHaveBeenCalledWith(expect.anything(), "rae", { take: 10 }, { id: "u1", role: "ARTIST" });
    expect(el).toContain('"initialFollowing":true');
    expect(el).toContain('"followsViewer":true');
    expect(el).toContain('"signedIn":true');
  });

  it("signed out profiles still render, as a visitor", async () => {
    getSession.mockResolvedValue(null);
    const el = JSON.stringify(await ProfilePage({ params: params() }));
    expect(getPerson).toHaveBeenCalledWith(expect.anything(), "rae", null);
    expect(el).toContain('"signedIn":false');
  });
});

describe("/u/[handle] recent posts", () => {
  it("render as full community cards with the viewer's gate", async () => {
    getSession.mockResolvedValue({ id: "u1", role: "VIEWER", email: "v@example.com", name: "V", handle: "vera" });
    listPersonCommunity.mockResolvedValue({ ok: true, page: { items: [{ id: "p1", kind: "ASK", body: "hi" }], nextCursor: null } });
    const el = JSON.stringify(await ProfilePage({ params: params() }));
    expect(el).toContain('"post":{"id":"p1"');
    expect(el).toContain('"gate":"ready"');
    expect(el).toContain('"href":"/community"');
  });
});

describe("/u/[handle]/followers and /following", () => {
  it("are per-request and unlisted", () => {
    expect(followersDynamic).toBe("force-dynamic");
    expect(followersMeta.robots).toEqual({ index: false, follow: true });
  });

  it("lists followers with links, 30 per page, from the cursor", async () => {
    getSession.mockResolvedValue({ id: "u1", role: "VIEWER" });
    listFollowers.mockResolvedValue({ ok: true, page: { items: [fan], nextCursor: "user_fan" } });
    const el = JSON.stringify(await FollowersPage({ params: params(), searchParams: Promise.resolve({ cursor: "user_x" }) }));
    expect(listFollowers).toHaveBeenCalledWith(expect.anything(), "rae", { take: 30, cursor: "user_x" }, "u1");
    expect(el).toContain('"href":"/u/fan"');
    expect(el).toContain('"href":"/u/rae/followers?cursor=user_fan"');
  });

  it("following uses the following list and has no 'more' link at the end", async () => {
    getSession.mockResolvedValue(null);
    listFollowing.mockResolvedValue({ ok: true, page: { items: [fan], nextCursor: null } });
    const el = JSON.stringify(await FollowingPage({ params: params(), searchParams: Promise.resolve({}) }));
    expect(listFollowing).toHaveBeenCalledWith(expect.anything(), "rae", { take: 30 }, null);
    expect(el).not.toContain("cursor=");
  });

  it("404s for an unknown or blocked person", async () => {
    getSession.mockResolvedValue(null);
    listFollowers.mockResolvedValue({ ok: false, code: "not_found", message: "No one" });
    await expect(FollowersPage({ params: params(), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("ignores an oversized or odd cursor", async () => {
    getSession.mockResolvedValue(null);
    listFollowers.mockResolvedValue({ ok: true, page: { items: [], nextCursor: null } });
    await FollowersPage({ params: params(), searchParams: Promise.resolve({ cursor: "x".repeat(200) }) });
    expect(listFollowers).toHaveBeenCalledWith(expect.anything(), "rae", { take: 30 }, null);
  });
});
