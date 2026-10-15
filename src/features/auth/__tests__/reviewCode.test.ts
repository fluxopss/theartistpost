// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  issueSignInChallenge,
  reviewCodeFor,
  verifySignInChallenge,
} from "@/features/auth/challenges";

type Challenge = {
  id: string;
  email: string;
  codeHash: string;
  attempts: number;
  consumedAt: Date | null;
  expiresAt: Date;
};

let challenges: Challenge[];
let audits: Array<Record<string, unknown>>;
const userFindUnique = vi.fn();

/** In-memory stand-in for the three AuthChallenge calls the module makes. */
const db = {
  user: { findUnique: userFindUnique },
  authChallenge: {
    updateMany: vi.fn(async ({ where, data }: { where: { email: string }; data: Partial<Challenge> }) => {
      for (const c of challenges) {
        if (c.email === where.email && !c.consumedAt) Object.assign(c, data);
      }
      return { count: 0 };
    }),
    create: vi.fn(async ({ data }: { data: Omit<Challenge, "id" | "attempts" | "consumedAt"> }) => {
      const c: Challenge = { id: `chal_${challenges.length + 1}`, attempts: 0, consumedAt: null, ...data };
      challenges.push(c);
      return c;
    }),
    findFirst: vi.fn(async ({ where }: { where: { email: string } }) =>
      [...challenges].reverse().find((c) => c.email === where.email && !c.consumedAt) ?? null,
    ),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: { consumedAt?: Date; attempts?: { increment: number } } }) => {
      const c = challenges.find((x) => x.id === where.id)!;
      if (data.consumedAt) c.consumedAt = data.consumedAt;
      if (data.attempts) c.attempts += data.attempts.increment;
      return c;
    }),
  },
  auditLog: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      audits.push(data);
      return data;
    }),
  },
} as unknown as PrismaClient;

const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
const REVIEW = "reviewer@example.com";

function user(role: "VIEWER" | "ARTIST" | "ADMIN" = "VIEWER", email = REVIEW) {
  return { id: `u_${email}`, email, name: "Reviewer", role };
}

beforeEach(() => {
  challenges = [];
  audits = [];
  vi.clearAllMocks();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-review");
  vi.stubEnv("AUTH_CODE_WEBHOOK_URL", "https://hooks.example.test/code");
  vi.stubEnv("APP_REVIEW_EMAILS", "");
  vi.stubEnv("APP_REVIEW_CODE", "");
  vi.stubGlobal("fetch", fetchMock);
  userFindUnique.mockResolvedValue(user());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function enableReview(emails = REVIEW, code = "482913") {
  vi.stubEnv("APP_REVIEW_EMAILS", emails);
  vi.stubEnv("APP_REVIEW_CODE", code);
}

describe("reviewCodeFor", () => {
  it("is null when the env is unset", () => {
    vi.stubEnv("APP_REVIEW_EMAILS", "");
    vi.stubEnv("APP_REVIEW_CODE", "");
    expect(reviewCodeFor(REVIEW)).toBeNull();
  });

  it("returns the code only for an exact (trimmed, lowercased) listed email", () => {
    enableReview(" Reviewer@Example.com , other@example.com ");
    expect(reviewCodeFor("reviewer@example.com")).toBe("482913");
    expect(reviewCodeFor("  REVIEWER@example.com ")).toBe("482913");
    expect(reviewCodeFor("other@example.com")).toBe("482913");
    expect(reviewCodeFor("someone@example.com")).toBeNull();
    expect(reviewCodeFor("reviewer@example.com.evil.test")).toBeNull();
    expect(reviewCodeFor("xreviewer@example.com")).toBeNull();
    expect(reviewCodeFor("")).toBeNull();
  });

  it("is off unless the code is exactly six digits", () => {
    for (const bad of ["12345", "1234567", "abcdef", "12345a", " 482913", ""]) {
      enableReview(REVIEW, bad);
      expect(reviewCodeFor(REVIEW)).toBeNull();
    }
  });

  it("is off when only one of the two variables is set", () => {
    vi.stubEnv("APP_REVIEW_EMAILS", REVIEW);
    vi.stubEnv("APP_REVIEW_CODE", "");
    expect(reviewCodeFor(REVIEW)).toBeNull();
    vi.stubEnv("APP_REVIEW_EMAILS", "");
    vi.stubEnv("APP_REVIEW_CODE", "482913");
    expect(reviewCodeFor(REVIEW)).toBeNull();
  });

  it("reads the env at call time", () => {
    expect(reviewCodeFor(REVIEW)).toBeNull();
    enableReview();
    expect(reviewCodeFor(REVIEW)).toBe("482913");
  });
});

describe("issueSignInChallenge with the review code", () => {
  it("delivers normally when the env is unset", async () => {
    const result = await issueSignInChallenge(db, REVIEW);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("for a listed non-admin skips delivery and accepts exactly that code", async () => {
    enableReview();
    const result = await issueSignInChallenge(db, REVIEW);
    expect(result).toMatchObject({ ok: true, delivered: true });
    expect(result.ok && "debugCode" in result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    expect(await verifySignInChallenge(db, REVIEW, "482913")).toEqual({ ok: true });
  });

  it("works for an ARTIST too, and still invalidates earlier open challenges", async () => {
    enableReview();
    userFindUnique.mockResolvedValue(user("ARTIST"));
    await issueSignInChallenge(db, REVIEW);
    await issueSignInChallenge(db, REVIEW);
    expect(challenges.filter((c) => !c.consumedAt)).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a different 6-digit code does not verify", async () => {
    enableReview();
    await issueSignInChallenge(db, REVIEW);
    const result = await verifySignInChallenge(db, REVIEW, "000000");
    expect(result).toMatchObject({ ok: false, code: "unauthorized" });
  });

  it("delivers normally for an email that is not listed", async () => {
    enableReview();
    userFindUnique.mockResolvedValue(user("VIEWER", "member@example.com"));
    await issueSignInChallenge(db, "member@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // and the review code does not unlock that account
    expect(await verifySignInChallenge(db, "member@example.com", "482913")).toMatchObject({
      ok: false,
    });
  });

  it("stays off for a malformed review code", async () => {
    for (const bad of ["12345", "abcdef"]) {
      fetchMock.mockClear();
      enableReview(REVIEW, bad);
      await issueSignInChallenge(db, REVIEW);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("falls through to normal delivery for a listed ADMIN", async () => {
    enableReview();
    userFindUnique.mockResolvedValue(user("ADMIN"));
    const result = await issueSignInChallenge(db, REVIEW);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await verifySignInChallenge(db, REVIEW, "482913")).toMatchObject({ ok: false });
    expect(audits.map((a) => a.action)).not.toContain("auth.review_code_issued");
  });

  it("locks out after five wrong codes exactly like a delivered code", async () => {
    enableReview();
    await issueSignInChallenge(db, REVIEW);
    for (let i = 0; i < 5; i += 1) {
      expect(await verifySignInChallenge(db, REVIEW, "111111")).toMatchObject({
        ok: false,
        code: "unauthorized",
      });
    }
    // sixth try — even with the right code — is locked out
    expect(await verifySignInChallenge(db, REVIEW, "482913")).toMatchObject({
      ok: false,
      code: "rate",
    });
    // and the locked challenge is gone: the right code no longer works
    expect(await verifySignInChallenge(db, REVIEW, "482913")).toMatchObject({
      ok: false,
      code: "unauthorized",
    });
  });

  it("audits the issue with the email only, never the code", async () => {
    enableReview();
    await issueSignInChallenge(db, REVIEW);
    const audit = audits.find((a) => a.action === "auth.review_code_issued");
    expect(audit).toBeTruthy();
    expect(audit?.meta).toEqual({ email: REVIEW });
    expect(JSON.stringify(audits)).not.toContain("482913");
  });

  it("never stores or logs the plain code", async () => {
    enableReview();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await issueSignInChallenge(db, REVIEW);
    expect(JSON.stringify(challenges)).not.toContain("482913");
    expect(JSON.stringify([info.mock.calls, err.mock.calls])).not.toContain("482913");
    info.mockRestore();
    err.mockRestore();
  });
});
