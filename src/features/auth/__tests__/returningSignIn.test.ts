import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  user: { findUnique: vi.fn() },
  authChallenge: {
    updateMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
};

const writeSessionCookie = vi.fn(async () => true);

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => db,
}));

vi.mock("@/features/auth/sessionCookie", () => ({
  writeSessionCookie: (...args: unknown[]) => writeSessionCookie(...(args as [])),
  clearSessionCookie: vi.fn(async () => undefined),
}));

vi.mock("@/features/auth/challenges", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth/challenges")>(
    "@/features/auth/challenges",
  );
  return {
    ...actual,
    deliverAuthCode: vi.fn(async () => ({ delivered: true })),
  };
});

const {
  requestSignInCodeAction,
  verifySignInCodeAction,
} = await import("@/features/auth/actions");
const { returningAuthMode } = await import("@/features/auth/returningSignIn");
const { EXISTING_EMAIL_ERROR } = await import("@/features/auth/register");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SUPABASE_RETURNING_OTP;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  db.user.findUnique.mockResolvedValue(null);
  db.authChallenge.updateMany.mockResolvedValue({ count: 0 });
  db.authChallenge.create.mockResolvedValue({
    id: "chal_1",
    email: "member@example.com",
    expiresAt: new Date(Date.now() + 600_000),
  });
  db.authChallenge.findFirst.mockResolvedValue(null);
  db.authChallenge.update.mockResolvedValue({});
  db.auditLog.create.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.SUPABASE_RETURNING_OTP;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

describe("returningAuthMode", () => {
  it("defaults to hmac so the returning door works before Auth #15", () => {
    expect(returningAuthMode()).toBe("hmac");
  });

  it("stays on hmac when Supabase URL is set without opt-in", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "pk_test";
    expect(returningAuthMode()).toBe("hmac");
  });

  it("selects supabase only with URL + publishable + SUPABASE_RETURNING_OTP=1", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "pk_test";
    process.env.SUPABASE_RETURNING_OTP = "1";
    expect(returningAuthMode()).toBe("supabase");
  });
});

describe("existing-email copy points at the returning door", () => {
  it("no longer says sign-in is coming soon", () => {
    expect(EXISTING_EMAIL_ERROR).toMatch(/returning door/i);
    expect(EXISTING_EMAIL_ERROR).not.toMatch(/coming soon/i);
  });
});

describe("requestSignInCodeAction", () => {
  it("rejects invalid email", async () => {
    const result = await requestSignInCodeAction({ email: "not-an-email" });
    expect(result.ok).toBe(false);
  });

  it("returns a generic sent shape when the email is unknown", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const result = await requestSignInCodeAction({
      email: "unknown@example.com",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sent).toBe(true);
    expect(result.mode).toBe("hmac");
    expect(db.authChallenge.create).not.toHaveBeenCalled();
  });

  it("issues a challenge for an existing member", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user_member",
      email: "member@example.com",
      name: "Member",
      role: "VIEWER",
    });

    const result = await requestSignInCodeAction({
      email: "member@example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sent).toBe(true);
    expect(result.mode).toBe("hmac");
    expect(db.authChallenge.create).toHaveBeenCalled();
  });
});

describe("verifySignInCodeAction", () => {
  it("rejects a bad code shape", async () => {
    const result = await verifySignInCodeAction({
      email: "member@example.com",
      code: "12",
    });
    expect(result.ok).toBe(false);
  });

  it("opens a session cookie when the code matches", async () => {
    const { createHash } = await import("node:crypto");
    const { getAuthSecret } = await import("@/features/auth/secret");
    const secret = getAuthSecret();
    expect(secret).toBeTruthy();
    const email = "member@example.com";
    const code = "123456";
    const codeHash = createHash("sha256")
      .update(`${email}:${code}:${secret}`)
      .digest("hex");

    db.authChallenge.findFirst.mockResolvedValue({
      id: "chal_ok",
      email,
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 600_000),
      consumedAt: null,
    });
    db.user.findUnique.mockResolvedValue({
      id: "user_member",
      email,
      name: "Member",
      role: "VIEWER",
      image: null,
      artistProfile: null,
    });

    const result = await verifySignInCodeAction({ email, code });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.email).toBe(email);
    expect(result.mode).toBe("hmac");
    expect(writeSessionCookie).toHaveBeenCalledTimes(1);
  });
});
