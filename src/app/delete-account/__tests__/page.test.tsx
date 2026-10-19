// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("@/features/account/DeleteAccountForm", () => ({ DeleteAccountForm: () => null }));

import DeleteAccountPage, { dynamic } from "@/app/delete-account/page";

beforeEach(() => getSession.mockReset());

describe("/delete-account", () => {
  it("reads the session per request", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("signed in: offers the delete form right here", async () => {
    getSession.mockResolvedValue({ id: "u1", name: "Rae" });
    const el = JSON.stringify(await DeleteAccountPage());
    expect(el).toContain("Delete it here");
    expect(el).not.toContain("Sign in to delete it yourself");
  });

  it("signed out: sign in and come back here to delete", async () => {
    getSession.mockResolvedValue(null);
    const el = JSON.stringify(await DeleteAccountPage());
    expect(el).toContain('"href":"/join?door=return&next=%2Fdelete-account"');
    expect(el).toContain("Sign in to delete it yourself");
  });
});
