// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const listCommunity = vi.fn();
const communityGate = vi.fn();
vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({}) }));
vi.mock("@/server/api/topics", () => ({ listTopics: async () => [{ slug: "murals", name: "Murals", kind: "genre" }] }));
vi.mock("@/server/api/community", async (orig) => ({
  ...(await orig<typeof import("@/server/api/community")>()),
  listCommunity: (...a: unknown[]) => listCommunity(...a),
}));
vi.mock("@/features/community/gate", () => ({ communityGate: (...a: unknown[]) => communityGate(...a) }));
vi.mock("@/features/community/CommunityBoard", () => ({ CommunityBoard: () => null }));

import CommunityPage, { dynamic, metadata } from "@/app/community/page";

const run = (sp: Record<string, string> = {}) => CommunityPage({ searchParams: Promise.resolve(sp) });

beforeEach(() => {
  getSession.mockReset();
  listCommunity.mockReset();
  communityGate.mockReset();
  listCommunity.mockResolvedValue({ ok: true, page: { items: [], nextCursor: null } });
});

describe("/community", () => {
  it("is per-request and unlisted", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("reads the board as the signed-in viewer with the chosen filters", async () => {
    getSession.mockResolvedValue({ id: "u1", role: "ARTIST", handle: "vera" });
    communityGate.mockResolvedValue("ready");
    listCommunity.mockResolvedValue({ ok: true, page: { items: [{ id: "p1" }], nextCursor: null } });
    const el = JSON.stringify(await run({ scope: "following", kind: "ASK", topic: "murals" }));
    expect(listCommunity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scope: "following", kind: "ASK", topic: "murals", page: { take: 20 } }),
      { id: "u1", role: "ARTIST" },
    );
    expect(el).toContain('"gate":"ready"');
    expect(el).toContain('"viewerHandle":"vera"');
  });

  it("signed out asking for Following gets a join prompt, not an error", async () => {
    getSession.mockResolvedValue(null);
    communityGate.mockResolvedValue("signedOut");
    const el = JSON.stringify(await run({ scope: "following" }));
    expect(listCommunity).not.toHaveBeenCalled();
    expect(el).toContain("Sign in to see posts from the people you follow");
  });

  it("ignores junk filters and shows everyone", async () => {
    getSession.mockResolvedValue(null);
    communityGate.mockResolvedValue("signedOut");
    await run({ scope: "evil", kind: "NOPE", topic: "<x>" });
    expect(listCommunity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ scope: "all", kind: undefined, topic: undefined }), null);
  });

  it("an empty Following board suggests seeing everyone", async () => {
    getSession.mockResolvedValue({ id: "u1", role: "VIEWER", handle: "vera" });
    communityGate.mockResolvedValue("ready");
    const el = JSON.stringify(await run({ scope: "following" }));
    expect(el).toContain("No one to hear from yet");
  });
});
