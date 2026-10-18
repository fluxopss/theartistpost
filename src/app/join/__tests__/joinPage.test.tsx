// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("@/features/auth/JoinExperience", () => ({ JoinExperience: () => null }));

import JoinPage from "@/app/join/page";

beforeEach(() => {
  getSession.mockReset();
  redirect.mockClear();
});

const run = (params: Record<string, string>) => JoinPage({ searchParams: Promise.resolve(params) });

describe("/join?next=", () => {
  it("sends an already signed-in person straight to a safe next", async () => {
    getSession.mockResolvedValue({ id: "u1" });
    await expect(run({ door: "return", next: "/settings" })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/settings");
  });

  it("ignores an unsafe next even when signed in", async () => {
    getSession.mockResolvedValue({ id: "u1" });
    const el = await run({ door: "return", next: "//evil.com" });
    expect(redirect).not.toHaveBeenCalled();
    expect(JSON.stringify(el)).not.toContain("evil.com");
  });

  it("passes a safe next to the join flow when signed out", async () => {
    getSession.mockResolvedValue(null);
    const el = await run({ door: "return", next: "/u/rae" });
    expect(JSON.stringify(el)).toContain('"nextPath":"/u/rae"');
  });
});
