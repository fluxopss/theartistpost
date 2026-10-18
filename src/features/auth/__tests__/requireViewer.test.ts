// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

import { requireViewer } from "@/features/auth/requireViewer";

beforeEach(() => {
  getSession.mockReset();
  redirect.mockClear();
});

describe("requireViewer", () => {
  it("sends a signed-out visitor to sign in and back", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireViewer("/settings/profile")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/join?door=return&next=%2Fsettings%2Fprofile");
  });

  it("returns the signed-in user", async () => {
    const user = { id: "u1", name: "Rae", email: "rae@example.com", role: "VIEWER" };
    getSession.mockResolvedValue(user);
    await expect(requireViewer("/settings/profile")).resolves.toEqual(user);
    expect(redirect).not.toHaveBeenCalled();
  });
});
