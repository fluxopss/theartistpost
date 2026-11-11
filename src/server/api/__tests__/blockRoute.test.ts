// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { DELETE, GET, POST } from "@/app/api/v1/signup-blocks/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import {
  artistRow,
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const URL = "http://localhost/api/v1/signup-blocks";
const key = { day: "2026-11-13", index: 0 };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T14:00:00Z"));
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("/api/v1/signup-blocks access", () => {
  it("needs a signed-in session", async () => {
    expect((await GET(getRequest(URL))).status).toBe(401);
    expect((await POST(jsonRequest(URL, "POST", key))).status).toBe(401);
    expect((await DELETE(jsonRequest(URL, "DELETE", key))).status).toBe(401);
  });

  it("keeps plain members out with a friendly message", async () => {
    const headers = signInAs(userRow({ id: "user_fan" }));
    const res = await POST(jsonRequest(URL, "POST", key, headers));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/approved artists/);
    expect(db.blockBooking.create).not.toHaveBeenCalled();
  });

  it("keeps artists who are not approved yet out", async () => {
    const headers = signInAs(artistRow("pending", {}, false));
    expect((await GET(getRequest(URL, headers))).status).toBe(403);
  });

  it("keeps suspended artists out", async () => {
    const headers = signInAs(artistRow("paused", { suspendedAt: new Date() }));
    expect((await POST(jsonRequest(URL, "POST", key, headers))).status).toBe(403);
  });

  it("lets an approved artist book through the API", async () => {
    const headers = signInAs(artistRow("ada"));
    db.blockBooking.findUnique.mockResolvedValue(null);
    db.blockBooking.count.mockResolvedValue(0);
    const res = await POST(jsonRequest(URL, "POST", key, headers));
    expect(res.status).toBe(201);
    expect(db.blockBooking.create).toHaveBeenCalledTimes(1);
  });

  it("answers 409 when the per-day cap is hit", async () => {
    const headers = signInAs(artistRow("ada"));
    db.blockBooking.findUnique.mockResolvedValue(null);
    // slot is empty, but she already holds one block today
    db.blockBooking.count.mockImplementation(async ({ where }) =>
      where.userId && where.day ? 1 : 0,
    );
    const res = await POST(jsonRequest(URL, "POST", key, headers));
    expect(res.status).toBe(409);
    expect(db.blockBooking.create).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body", async () => {
    const headers = signInAs(artistRow("ada"));
    const res = await POST(new Request(URL, { method: "POST", headers, body: "nope" }));
    expect(res.status).toBe(400);
  });
});
