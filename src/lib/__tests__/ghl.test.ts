import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isTestEmail, sendLeadToGhl, testLeadReason } from "@/lib/ghl";

const WEBHOOK = "https://services.leadconnectorhq.com/hooks/test-hook";

describe("isTestEmail", () => {
  it.each([
    "me@example.com",
    "a@example.net",
    "a@example.org",
    "a@sub.example.com",
    "a@deep.sub.example.net",
    "one-mva0s8r0@tap.test",
    "a@foo.invalid",
    "a@x.example",
    "a@localhost",
    "test+qa1@fluxlab.agency",
    "  ME@EXAMPLE.COM ",
    "Test+Smoke@FluxLab.Agency",
  ])("flags %s", (email) => {
    expect(isTestEmail(email)).toBe(true);
  });

  it.each([
    "jane@gmail.com",
    "a@example.co",
    "a@myexample.com",
    "a@test.com",
    "a@contest.io",
    "a@example.com.au",
    "test@fluxlab.agency",
    "jonathan@fluxlab.agency",
    "test+qa@notfluxlab.agency",
    "a@fluxlab.agency.test.com",
    "",
    "not-an-email",
  ])("does not flag %s", (email) => {
    expect(isTestEmail(email)).toBe(false);
  });
});

describe("testLeadReason", () => {
  const real = { name: "Jane", email: "jane@gmail.com" };

  it("returns null for a real lead", () => {
    expect(testLeadReason(real)).toBeNull();
  });

  it.each([1, "1", true, "true", "yes"])("flags is_test=%s", (value) => {
    expect(testLeadReason({ ...real, is_test: value })).toBe("flag");
  });

  it.each([1, "1", true])("flags flux_internal=%s", (value) => {
    expect(testLeadReason({ ...real, flux_internal: value })).toBe("flag");
  });

  it.each([0, "0", false, "no", ""])("ignores is_test=%s", (value) => {
    expect(testLeadReason({ ...real, is_test: value })).toBeNull();
  });

  it.each(["smoke", "verify", "deploy-smoke", " Smoke "])(
    "flags utm_source=%s",
    (utm_source) => {
      expect(testLeadReason({ ...real, utm_source })).toBe("utm_source");
    },
  );

  it.each(["google", "smoke-test", "instagram"])("ignores utm_source=%s", (utm_source) => {
    expect(testLeadReason({ ...real, utm_source })).toBeNull();
  });
});

describe("sendLeadToGhl", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("GHL_WEBHOOK_URL", WEBHOOK);
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    { name: "TAP smoke", email: "one-mva0s8r0@tap.test" },
    { name: "Doc", email: "me@example.com" },
    { name: "QA", email: "test+qa1@fluxlab.agency" },
    { name: "Flag", email: "jane@gmail.com", is_test: 1 },
    { name: "Internal", email: "jane@gmail.com", flux_internal: "1" },
    { name: "Smoke", email: "jane@gmail.com", utm_source: "deploy-smoke" },
  ])("never calls the webhook for test lead $email", async (lead) => {
    const result = await sendLeadToGhl(lead);
    expect(result).toEqual({ ok: true, skipped: "test" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(
      "[ghl] test lead — webhook skipped",
      expect.objectContaining({ reason: expect.any(String) }),
    );
  });

  it("still posts a real lead to the webhook once", async () => {
    const result = await sendLeadToGhl({
      name: "Jane",
      email: "jane@gmail.com",
      source: "theartistpost-get-involved",
    });
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBHOOK);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({
      email: "jane@gmail.com",
      source: "theartistpost-get-involved",
    });
  });

  it("posts real lookalike domains (example.co, myexample.com, test.com)", async () => {
    for (const email of ["a@example.co", "a@myexample.com", "a@test.com"]) {
      await sendLeadToGhl({ name: "Real", email });
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("still reports webhook failures for real leads", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendLeadToGhl({ name: "Jane", email: "jane@gmail.com" });
    expect(result).toEqual({ ok: false, error: "GHL webhook failed (500)" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
