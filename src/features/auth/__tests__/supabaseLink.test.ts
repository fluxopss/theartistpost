import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const db = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    artistProfile: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  return { db };
});

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => state.db,
}));

vi.mock("@/features/auth/supabaseJwt", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/supabaseJwt")>(
    "@/features/auth/supabaseJwt",
  );
  return {
    ...actual,
    verifySupabaseAccessToken: vi.fn(),
  };
});

vi.mock("@/features/auth/sessionCookie", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/sessionCookie")>(
    "@/features/auth/sessionCookie",
  );
  return {
    ...actual,
    writeSessionCookie: vi.fn(async () => true),
  };
});

import { POST as linkV1 } from "@/app/api/v1/auth/link/route";
import { linkSupabaseUser } from "@/features/auth/linkSupabaseUser";
import {
  looksLikeJwt,
  resetSupabaseJwksCacheForTests,
  verifySupabaseAccessToken,
} from "@/features/auth/supabaseJwt";
import { resetRateLimits } from "@/features/auth/rateLimit";

const db = state.db;
const verifyMock = vi.mocked(verifySupabaseAccessToken);

function jsonRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("looksLikeJwt", () => {
  it("accepts three-segment compact JWTs and rejects house HMAC", () => {
    expect(looksLikeJwt("aaa.bbb.ccc")).toBe(true);
    expect(looksLikeJwt("payload.sig")).toBe(false);
  });
});

describe("verifySupabaseAccessToken (env skip)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetSupabaseJwksCacheForTests();
  });

  it("returns null when JWKS URL and SUPABASE_URL are unset (HMAC-only)", async () => {
    vi.stubEnv("SUPABASE_JWKS_URL", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    resetSupabaseJwksCacheForTests();

    // ImportActual path — call the real verifier, not the route mock.
    const actual = await vi.importActual<
      typeof import("@/features/auth/supabaseJwt")
    >("@/features/auth/supabaseJwt");
    const result = await actual.verifySupabaseAccessToken(
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig",
    );
    expect(result).toBeNull();
  });
});

describe("linkSupabaseUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    db.user.findUnique.mockResolvedValue(null);
    db.artistProfile.findUnique.mockResolvedValue(null);
    db.auditLog.create.mockResolvedValue({});
  });

  it("creates a member door linked to supabaseAuthId", async () => {
    db.user.create.mockResolvedValue({
      id: "user_1",
      email: "member@example.com",
      name: "Member",
      image: null,
      role: "VIEWER",
      supabaseAuthId: "sb_sub_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      artistProfile: null,
    });

    const result = await linkSupabaseUser(
      db as never,
      {
        supabaseAuthId: "sb_sub_1",
        email: "member@example.com",
        name: null,
      },
      {
        door: "member",
        name: "Member",
        email: "member@example.com",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(true);
    expect(result.authUser.email).toBe("member@example.com");
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supabaseAuthId: "sb_sub_1",
          role: "VIEWER",
        }),
      }),
    );
  });

  it("return door fails when no house user exists", async () => {
    const result = await linkSupabaseUser(
      db as never,
      {
        supabaseAuthId: "sb_sub_missing",
        email: "ghost@example.com",
        name: null,
      },
      { door: "return" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("not_found");
  });

  it("backfills supabaseAuthId on email match", async () => {
    db.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "user_old",
        email: "old@example.com",
        name: "Old",
        image: null,
        role: "VIEWER",
        supabaseAuthId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artistProfile: null,
      });
    db.user.update.mockResolvedValue({
      id: "user_old",
      email: "old@example.com",
      name: "Old",
      image: null,
      role: "VIEWER",
      supabaseAuthId: "sb_sub_2",
      createdAt: new Date(),
      updatedAt: new Date(),
      artistProfile: null,
    });

    const result = await linkSupabaseUser(
      db as never,
      {
        supabaseAuthId: "sb_sub_2",
        email: "old@example.com",
        name: null,
      },
      { door: "return" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(false);
    expect(db.user.update).toHaveBeenCalled();
  });
});

describe("POST /api/v1/auth/link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-link");
    verifyMock.mockResolvedValue({
      supabaseAuthId: "sb_sub_route",
      email: "route@example.com",
      name: null,
    });
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: "user_route",
      email: "route@example.com",
      name: "Route",
      image: null,
      role: "VIEWER",
      supabaseAuthId: "sb_sub_route",
      createdAt: new Date(),
      updatedAt: new Date(),
      artistProfile: null,
    });
    db.auditLog.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects missing Bearer JWT", async () => {
    const response = await linkV1(
      jsonRequest("http://localhost/api/v1/auth/link", { door: "return" }),
    );
    expect(response.status).toBe(401);
  });

  it("links a new member when JWT verifies", async () => {
    const response = await linkV1(
      jsonRequest(
        "http://localhost/api/v1/auth/link",
        {
          door: "member",
          name: "Route",
          email: "route@example.com",
        },
        { Authorization: "Bearer aaa.bbb.ccc" },
      ),
    );
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.user.email).toBe("route@example.com");
    expect(typeof json.data.token).toBe("string");
  });
});
