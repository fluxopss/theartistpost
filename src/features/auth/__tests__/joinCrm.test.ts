import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks: Array<() => unknown> = [];
let afterThrows = false;
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => {
    if (afterThrows) throw new Error("`after` was called outside a request scope.");
    afterCallbacks.push(cb);
  },
}));

vi.mock("@/lib/ghl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ghl")>();
  return { ...actual, sendLeadToGhl: vi.fn() };
});

import { sendLeadToGhl } from "@/lib/ghl";
import {
  deliverJoinToCrm,
  joinLeadPayload,
  scheduleJoinToCrm,
} from "@/features/auth/joinCrm";

const sendLead = vi.mocked(sendLeadToGhl);

describe("joinLeadPayload", () => {
  it("builds a website viewer join", () => {
    expect(
      joinLeadPayload({
        name: "Ana",
        email: " Ana@Mail.COM ",
        role: "viewer",
        platform: "web",
        surface: "website",
      }),
    ).toEqual({
      name: "Ana",
      email: "ana@mail.com",
      intent: "join",
      role: "viewer",
      platform: "web",
      source: "theartistpost-join",
      page: "/join",
    });
  });

  it("builds an app artist join with handle and ios platform", () => {
    const p = joinLeadPayload({
      name: "Leo",
      email: "leo@mail.com",
      role: "artist_pending",
      handle: "LeoPaints",
      platform: "ios",
      surface: "app",
    });
    expect(p).toMatchObject({
      intent: "join",
      role: "artist_pending",
      handle: "leopaints",
      platform: "ios",
      source: "theartistpost-app-join",
      page: "/api/v1/auth/join",
    });
  });

  it("omits platform when the app does not send one", () => {
    const p = joinLeadPayload({
      name: "Mo",
      email: "mo@mail.com",
      role: "viewer",
      surface: "app",
    });
    expect(p).not.toHaveProperty("platform");
    expect(p).not.toHaveProperty("handle");
  });
});

describe("deliverJoinToCrm / scheduleJoinToCrm", () => {
  beforeEach(() => {
    sendLead.mockReset();
    afterCallbacks.length = 0;
    afterThrows = false;
  });

  it("falls back to a detached send outside a request scope, never throwing", async () => {
    afterThrows = true;
    sendLead.mockResolvedValue({ ok: true });
    expect(() =>
      scheduleJoinToCrm({ name: "A", email: "a@mail.com", role: "viewer", surface: "app" }),
    ).not.toThrow();
    await vi.waitFor(() => expect(sendLead).toHaveBeenCalledTimes(1));
  });

  it("never throws when the CRM rejects", async () => {
    sendLead.mockResolvedValue({ ok: false, error: "GHL webhook failed (500)" });
    await expect(
      deliverJoinToCrm({ name: "A", email: "a@mail.com", role: "viewer", surface: "website" }),
    ).resolves.toBeUndefined();
  });

  it("never throws when the CRM call itself throws", async () => {
    sendLead.mockRejectedValue(new Error("boom"));
    await expect(
      deliverJoinToCrm({ name: "A", email: "a@mail.com", role: "viewer", surface: "app" }),
    ).resolves.toBeUndefined();
  });

  it("defers the send until after the response", async () => {
    sendLead.mockResolvedValue({ ok: true });
    scheduleJoinToCrm({ name: "A", email: "a@mail.com", role: "viewer", surface: "website" });
    expect(sendLead).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks[0]();
    expect(sendLead).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "join", email: "a@mail.com" }),
    );
  });
});
