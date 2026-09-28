import { describe, expect, it, vi } from "vitest";
import {
  API_ERROR_STATUS,
  apiError,
  apiOk,
  CACHE,
  clientIp,
  withApiErrors,
  type ApiErrorCode,
} from "@/server/api/respond";

describe("v1 envelope", () => {
  it("wraps success as { ok: true, data } and is uncached by default", async () => {
    const response = apiOk({ hello: "house" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, data: { hello: "house" } });
  });

  it("carries a cache policy when asked", () => {
    const response = apiOk([], { cache: CACHE.content });
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, stale-while-revalidate=86400",
    );
  });

  it.each([
    ["validation_failed", 400],
    ["unauthorized", 401],
    ["forbidden", 403],
    ["not_found", 404],
    ["conflict", 409],
    ["rate_limited", 429],
    ["upstream_unavailable", 502],
    ["service_paused", 503],
    ["internal", 500],
  ] as const)("maps %s to HTTP %i", async (code, status) => {
    const response = apiError(code, "Nope.");
    expect(response.status).toBe(status);
    expect(API_ERROR_STATUS[code as ApiErrorCode]).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: { code, message: "Nope." },
    });
  });

  it("includes fields only when there are some", async () => {
    const empty = await apiError("validation_failed", "Bad", { fields: {} }).json();
    expect(empty.error).not.toHaveProperty("fields");

    const withFields = await apiError("validation_failed", "Bad", {
      fields: { email: "Enter a valid email address." },
    }).json();
    expect(withFields.error.fields).toEqual({
      email: "Enter a valid email address.",
    });
  });

  it("sends retryAfterSec in the body and Retry-After header", async () => {
    const response = apiError("rate_limited", "Slow down", { retryAfterSec: 42 });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    const body = await response.json();
    expect(body.error.retryAfterSec).toBe(42);
  });

  it("turns an unexpected throw into an internal envelope", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await withApiErrors("test", async () => {
      throw new Error("boom");
    });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain("boom");
    quiet.mockRestore();
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost/api/v1/subscribe", { headers });

  it("uses the first x-forwarded-for hop", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
