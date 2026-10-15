import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: { createTransport: (...args: unknown[]) => createTransport(...(args as [])) },
}));

const { smtpConfig, renderSignInEmail } = await import("@/features/auth/authEmail");
const { deliverAuthCode } = await import("@/features/auth/challenges");

const SMTP_ENV = {
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "465",
  SMTP_USER: "hello@example.test",
  SMTP_PASS: "not-a-real-password",
  AUTH_EMAIL_FROM: "The Artist Post <hello@example.test>",
};

function stubSmtp(overrides: Partial<typeof SMTP_ENV> = {}) {
  for (const [key, value] of Object.entries({ ...SMTP_ENV, ...overrides })) {
    vi.stubEnv(key, value);
  }
}

beforeEach(() => {
  sendMail.mockReset();
  createTransport.mockClear();
  vi.stubEnv("AUTH_CODE_WEBHOOK_URL", "");
  for (const key of Object.keys(SMTP_ENV)) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("smtpConfig", () => {
  it("is null unless host, user, password and from are all set", () => {
    expect(smtpConfig()).toBeNull();
    stubSmtp({ SMTP_PASS: "" });
    expect(smtpConfig()).toBeNull();
  });

  it("defaults to implicit TLS on 465 and uses STARTTLS on 587", () => {
    stubSmtp({ SMTP_PORT: "" });
    expect(smtpConfig()).toMatchObject({ host: "smtp.example.test", port: 465, secure: true });
    stubSmtp({ SMTP_PORT: "587" });
    expect(smtpConfig()).toMatchObject({ port: 587, secure: false });
  });
});

describe("renderSignInEmail", () => {
  it("puts the code in the subject-free body and states the expiry", () => {
    const email = renderSignInEmail("482913");
    expect(email.subject).toBe("Your Artist Post sign-in code");
    expect(email.subject).not.toContain("482913");
    expect(email.text).toContain("482913");
    expect(email.text).toContain("10 minutes");
    expect(email.html).toContain("482913");
  });
});

describe("deliverAuthCode over SMTP", () => {
  it("sends the code to the member when SMTP is configured", async () => {
    stubSmtp();
    sendMail.mockResolvedValue({ messageId: "m1" });

    const result = await deliverAuthCode({ email: "member@example.test", code: "482913", purpose: "SIGN_IN" });

    expect(result).toEqual({ delivered: true });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.test",
        port: 465,
        secure: true,
        auth: { user: "hello@example.test", pass: "not-a-real-password" },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "member@example.test",
        from: "The Artist Post <hello@example.test>",
        subject: "Your Artist Post sign-in code",
      }),
    );
  });

  it("routes replies to The Artist Post's published contact, never a Flux inbox", async () => {
    stubSmtp();
    sendMail.mockResolvedValue({ messageId: "m2" });

    await deliverAuthCode({ email: "member@example.test", code: "482913", purpose: "SIGN_IN" });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: "Robbie@theartistpost.org" }),
    );
  });

  it("lets AUTH_EMAIL_REPLY_TO override the reply-to address", async () => {
    stubSmtp();
    vi.stubEnv("AUTH_EMAIL_REPLY_TO", "hello@theartistpost.org");
    sendMail.mockResolvedValue({ messageId: "m3" });

    await deliverAuthCode({ email: "member@example.test", code: "482913", purpose: "SIGN_IN" });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: "hello@theartistpost.org" }),
    );
  });

  it("reports failure without throwing or logging the code when SMTP rejects", async () => {
    stubSmtp();
    sendMail.mockRejectedValue(new Error("535 auth failed"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deliverAuthCode({ email: "member@example.test", code: "482913", purpose: "SIGN_IN" });

    expect(result.delivered).toBe(false);
    for (const call of errorLog.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("482913");
    }
    errorLog.mockRestore();
  });

  it("prefers the webhook when both are configured", async () => {
    stubSmtp();
    vi.stubEnv("AUTH_CODE_WEBHOOK_URL", "https://hooks.example.test/code");
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverAuthCode({ email: "member@example.test", code: "482913", purpose: "SIGN_IN" });

    expect(result).toEqual({ delivered: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("explains how to configure delivery in production when nothing is set", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = await deliverAuthCode({ email: "member@example.test", code: "482913", purpose: "SIGN_IN" });

    expect(result.delivered).toBe(false);
    expect(result.error).toContain("SMTP");
  });
});
