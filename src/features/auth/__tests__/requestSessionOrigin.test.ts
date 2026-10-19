// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieUser = { id: "u1", name: "Rae", email: "rae@example.com", role: "VIEWER" as const };

vi.mock("@/features/auth/sessionCookie", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/sessionCookie")>();
  return { ...actual, readSessionFromCookie: vi.fn(async () => cookieUser) };
});

import { encodeSessionToken } from "@/features/auth/sessionCookie";
import { resolveRequestAuth } from "@/features/auth/requestSession";

const SECRET = "test-auth-secret-for-origin";

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", SECRET);
  vi.stubEnv("CANONICAL_HOST", "theartistpost.org");
  vi.stubEnv("LEGACY_HOSTS", "theartistpost.fluxlab.agency");
});
afterEach(() => vi.unstubAllEnvs());

const req = (method: string, headers: Record<string, string>) =>
  new Request("https://theartistpost.org/api/v1/me", { method, headers: { host: "theartistpost.org", ...headers } });

describe("resolveRequestAuth and cookie writes", () => {
  it("refuses a cookie PATCH from a foreign origin", async () => {
    const auth = await resolveRequestAuth(req("PATCH", { origin: "https://evil.example" }));
    expect(auth.kind).toBe("none");
  });

  it("accepts a cookie PATCH from the site itself", async () => {
    const auth = await resolveRequestAuth(req("PATCH", { origin: "https://theartistpost.org" }));
    expect(auth).toEqual({ kind: "hmac", session: cookieUser });
  });

  it("still serves cookie GETs without an Origin", async () => {
    const auth = await resolveRequestAuth(req("GET", {}));
    expect(auth.kind).toBe("hmac");
  });

  it("never applies the check to Bearer (app) requests", async () => {
    const token = encodeSessionToken(cookieUser, SECRET, 3600);
    const auth = await resolveRequestAuth(req("PATCH", { authorization: `Bearer ${token}` }));
    expect(auth.kind).toBe("hmac");
  });
});
