// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({ user: { findUnique } }) }));

import { communityGate, communityViewer } from "../gate";

const session = { id: "u1", name: "Rae", email: "Rae@Example.com", role: "VIEWER" as const };
beforeEach(() => findUnique.mockReset());

describe("communityGate", () => {
  it("signed out", async () => {
    await expect(communityGate(null)).resolves.toBe("signedOut");
  });
  it("ready with a handle and accepted guidelines", async () => {
    findUnique.mockResolvedValue({ id: "u1", handle: "rae", termsAcceptedAt: new Date(), suspendedAt: null });
    await expect(communityGate(session)).resolves.toBe("ready");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "rae@example.com" } }));
  });
  it("needs a profile without a handle or without guidelines", async () => {
    findUnique.mockResolvedValue({ id: "u1", handle: null, termsAcceptedAt: new Date(), suspendedAt: null });
    await expect(communityGate(session)).resolves.toBe("needsProfile");
    findUnique.mockResolvedValue({ id: "u1", handle: "rae", termsAcceptedAt: null, suspendedAt: null });
    await expect(communityGate(session)).resolves.toBe("needsProfile");
  });
  it("paused when suspended", async () => {
    findUnique.mockResolvedValue({ id: "u1", handle: "rae", termsAcceptedAt: new Date(), suspendedAt: new Date() });
    await expect(communityGate(session)).resolves.toBe("paused");
  });
  it("treats a cookie whose account is gone as signed out", async () => {
    findUnique.mockResolvedValue(null);
    await expect(communityGate(session)).resolves.toBe("signedOut");
  });

  it("communityViewer returns the database handle, not the cookie's", async () => {
    findUnique.mockResolvedValue({ id: "u1", handle: "rae-from-app", termsAcceptedAt: new Date(), suspendedAt: null });
    await expect(communityViewer({ ...session, handle: undefined })).resolves.toEqual({ gate: "ready", handle: "rae-from-app" });
    await expect(communityViewer(null)).resolves.toEqual({ gate: "signedOut", handle: null });
  });
});
