// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getCommunityThread = vi.fn();
const listReactors = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({}) }));
vi.mock("@/server/api/community", async (orig) => ({
  ...(await orig<typeof import("@/server/api/community")>()),
  getCommunityThread: (...a: unknown[]) => getCommunityThread(...a),
  listReactors: (...a: unknown[]) => listReactors(...a),
}));
vi.mock("@/features/community/gate", () => ({ communityGate: async () => "ready" }));
vi.mock("@/features/community/ThreadView", () => ({ ThreadView: () => null }));

import ThreadPage, { dynamic } from "@/app/community/[id]/page";
import ReactorsPage from "@/app/community/[id]/reactions/page";

const params = (id: string) => Promise.resolve({ id });
beforeEach(() => {
  [getSession, getCommunityThread, listReactors, notFound].forEach((m) => m.mockClear());
  getSession.mockResolvedValue({ id: "u1", role: "VIEWER", handle: "vera" });
});

describe("/community/[id]", () => {
  it("reads the thread as the viewer", async () => {
    expect(dynamic).toBe("force-dynamic");
    getCommunityThread.mockResolvedValue({ ok: true, post: { id: "p1", kind: "ASK" }, replies: [] });
    const el = JSON.stringify(await ThreadPage({ params: params("p1") }));
    expect(getCommunityThread).toHaveBeenCalledWith(expect.anything(), "p1", { id: "u1", role: "VIEWER" });
    expect(el).toContain('"gate":"ready"');
  });

  it("a gone post shows a calm message, not a crash", async () => {
    getCommunityThread.mockResolvedValue({ ok: false, code: "not_found", message: "gone" });
    const el = JSON.stringify(await ThreadPage({ params: params("p9") }));
    expect(el).toContain("That post is gone");
  });

  it("an impossible id never hits the database", async () => {
    const el = JSON.stringify(await ThreadPage({ params: params("../../etc") }));
    expect(getCommunityThread).not.toHaveBeenCalled();
    expect(el).toContain("That post is gone");
  });
});

describe("/community/[id]/reactions", () => {
  it("lists who reacted, filtered by reaction", async () => {
    listReactors.mockResolvedValue({
      ok: true,
      page: { items: [{ reaction: "LOVE", createdAt: "2026-10-18T00:00:00Z", person: { id: "u2", handle: "fan", name: "Fan", avatarUrl: null, headline: null, isArtist: false, viewerFollows: false } }], nextCursor: null },
    });
    const el = JSON.stringify(await ReactorsPage({ params: params("p1"), searchParams: Promise.resolve({ reaction: "LOVE" }) }));
    expect(listReactors).toHaveBeenCalledWith(expect.anything(), "p1", { take: 30 }, "LOVE", { id: "u1", role: "VIEWER" });
    expect(el).toContain('"href":"/u/fan"');
  });

  it("404s when the post is gone", async () => {
    listReactors.mockResolvedValue({ ok: false, code: "not_found", message: "gone" });
    await expect(ReactorsPage({ params: params("p1"), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
