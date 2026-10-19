// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const readSessionFromCookie = vi.fn();
const writeSessionCookie = vi.fn<(user: unknown) => Promise<boolean>>(async () => true);
const findUnique = vi.fn();

vi.mock("@/features/auth/sessionCookie", () => ({
  readSessionFromCookie: () => readSessionFromCookie(),
  writeSessionCookie: (u: unknown) => writeSessionCookie(u),
}));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({ user: { findUnique } }) }));

import { refreshSessionCookieAction } from "../actions";

beforeEach(() => {
  readSessionFromCookie.mockReset();
  writeSessionCookie.mockClear();
  findUnique.mockReset();
});

const dbUser = {
  id: "u1",
  email: "rae@example.com",
  name: "Rae Lin",
  handle: "rae",
  role: "VIEWER",
  image: "/uploads/new.jpg",
  artistProfile: null,
};

describe("refreshSessionCookieAction", () => {
  it("rewrites the cookie from the database so the header shows the new name and photo", async () => {
    readSessionFromCookie.mockResolvedValue({ id: "u1", email: "Rae@Example.com", name: "Old", role: "VIEWER", image: null });
    findUnique.mockResolvedValue(dbUser);
    await expect(refreshSessionCookieAction()).resolves.toEqual({ ok: true });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "rae@example.com" } }));
    expect(writeSessionCookie).toHaveBeenCalledWith(expect.objectContaining({ id: "u1", name: "Rae Lin", image: "/uploads/new.jpg" }));
  });

  it("does nothing when signed out", async () => {
    readSessionFromCookie.mockResolvedValue(null);
    await expect(refreshSessionCookieAction()).resolves.toEqual({ ok: false });
    expect(writeSessionCookie).not.toHaveBeenCalled();
  });

  it("does nothing when the account no longer exists", async () => {
    readSessionFromCookie.mockResolvedValue({ id: "u1", email: "rae@example.com", name: "Rae", role: "VIEWER" });
    findUnique.mockResolvedValue(null);
    await expect(refreshSessionCookieAction()).resolves.toEqual({ ok: false });
    expect(writeSessionCookie).not.toHaveBeenCalled();
  });
});
