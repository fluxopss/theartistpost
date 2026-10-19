// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const findUnique = vi.fn();
const toMeDTO = vi.fn();

vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({ user: { findUnique } }) }));
vi.mock("@/server/api/meProfile", () => ({ toMeDTO: (...a: unknown[]) => toMeDTO(...a) }));
vi.mock("@/server/api/topics", () => ({ listTopics: async () => [{ slug: "murals", name: "Murals", kind: "genre" }] }));
vi.mock("@/lib/content", () => ({ content: { getChapters: async () => [{ id: "fl-wpb", name: "West Palm Beach", state: "Florida" }] } }));
vi.mock("@/features/account/EditProfileClient", () => ({ EditProfileClient: () => null }));

import EditProfilePage, { dynamic } from "@/app/settings/profile/page";

beforeEach(() => {
  getSession.mockReset();
  redirect.mockClear();
  findUnique.mockReset();
  toMeDTO.mockReset();
});

describe("/settings/profile", () => {
  it("is always rendered per request", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("sends signed-out visitors to sign in and back", async () => {
    getSession.mockResolvedValue(null);
    await expect(EditProfilePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/join?door=return&next=%2Fsettings%2Fprofile");
  });

  it("loads the signed-in person's profile, topics and chapters", async () => {
    getSession.mockResolvedValue({ id: "u1", email: "Rae@Example.com", name: "Rae", role: "VIEWER" });
    findUnique.mockResolvedValue({ id: "u1", email: "rae@example.com" });
    toMeDTO.mockResolvedValue({ user: { id: "u1" } });
    const el = JSON.stringify(await EditProfilePage());
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "rae@example.com" } }));
    expect(el).toContain('"chapters":[{"id":"fl-wpb","name":"West Palm Beach"}]');
    expect(el).toContain('"slug":"murals"');
  });

  it("explains calmly when the account can't be found", async () => {
    getSession.mockResolvedValue({ id: "u1", email: "rae@example.com", name: "Rae", role: "VIEWER" });
    findUnique.mockResolvedValue(null);
    const el = JSON.stringify(await EditProfilePage());
    expect(el).toContain("sign out and back in");
    expect(toMeDTO).not.toHaveBeenCalled();
  });
});
