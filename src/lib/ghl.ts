export const INVOLVE_INTENTS = ["space", "partner", "volunteer"] as const;

export type InvolveIntent = (typeof INVOLVE_INTENTS)[number];

/** Client that submitted the lead — lets the CRM tell native app leads apart. */
export const LEAD_PLATFORMS = ["ios", "android", "web"] as const;

export type LeadPlatform = (typeof LEAD_PLATFORMS)[number];

/** A new account (web /join or app POST /api/v1/auth/join). Returning sign-ins never post. */
export const JOIN_INTENT = "join" as const;

/** Member role at join time; artist studios start pending until Robbie approves them. */
export const JOIN_ROLES = ["viewer", "artist_pending"] as const;

export type JoinRole = (typeof JOIN_ROLES)[number];

/** Give up on the webhook after this long so a stuck CRM never hangs a form. */
export const GHL_TIMEOUT_MS = 8_000;

export type LeadPayload = {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  page?: string;
  intent?: string;
  medium?: string;
  city?: string;
  platform?: LeadPlatform;
  submittedAt?: string;
  is_test?: boolean | number | string;
  flux_internal?: boolean | number | string;
  utm_source?: string;
  /** Join leads only: the member's role at sign-up. */
  role?: JoinRole;
  /** Join leads only: the artist studio handle. */
  handle?: string;
};

/** Reserved documentation domains (RFC 2606); the domain or any subdomain. */
export const TEST_EMAIL_DOMAINS = ["example.com", "example.net", "example.org"] as const;

/** Reserved TLDs (RFC 2606 / 6761): anything under these is QA, e.g. tap.test. */
export const TEST_EMAIL_TLDS = ["test", "invalid", "example", "localhost"] as const;

/** Internal QA mailboxes: test+anything@fluxlab.agency. */
const TEST_PLUS_LOCAL = "test";
const TEST_PLUS_DOMAIN = "fluxlab.agency";

export const TEST_UTM_SOURCES = ["smoke", "verify", "deploy-smoke"] as const;

export function isTestEmail(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1).replace(/\.$/, "");
  if (!domain) return false;
  if (TEST_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return true;
  }
  const tld = domain.split(".").pop() ?? "";
  if ((TEST_EMAIL_TLDS as readonly string[]).includes(tld)) return true;
  return domain === TEST_PLUS_DOMAIN && local.startsWith(`${TEST_PLUS_LOCAL}+`);
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes"].includes(value.trim().toLowerCase());
}

export type TestLeadReason = "email" | "flag" | "utm_source";

/** Why a lead is QA traffic that must never reach the CRM, or null for a real lead. */
export function testLeadReason(payload: LeadPayload): TestLeadReason | null {
  if (isTestEmail(payload.email)) return "email";
  if (isTruthyFlag(payload.is_test) || isTruthyFlag(payload.flux_internal)) {
    return "flag";
  }
  const utm = payload.utm_source?.trim().toLowerCase() ?? "";
  if ((TEST_UTM_SOURCES as readonly string[]).includes(utm)) return "utm_source";
  return null;
}

export function normalizeInvolveIntent(
  value?: string | null,
): InvolveIntent | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return (INVOLVE_INTENTS as readonly string[]).includes(v)
    ? (v as InvolveIntent)
    : undefined;
}

function summarizeLead(payload: LeadPayload) {
  return {
    name: payload.name,
    email: payload.email,
    source: payload.source,
    page: payload.page,
    intent: payload.intent,
    platform: payload.platform,
  };
}

/**
 * POST lead JSON to GoHighLevel inbound webhook (`GHL_WEBHOOK_URL`).
 * Unset env fails closed in production; accepted in development.
 *
 * Donor stewardship (from `/donate` / `/api/v1/donate/steward`) uses
 * `intent: "donor"` and `medium: "one_time" | "monthly"`. Map those in GHL to
 * tags `donor` / `donor.one_time` / `donor.recurring` (or `sustainer`).
 * PayPal IPN → GHL is not wired yet — ops can hand-tag from PayPal exports until then.
 *
 * Test leads (see `testLeadReason`) never hit the webhook: the GHL catch-all
 * workflow has no QA filter, so each one would create a contact, an opp and an SMS.
 */
export async function sendLeadToGhl(
  payload: LeadPayload,
): Promise<{ ok: boolean; error?: string; skipped?: "test" }> {
  const webhookUrl = process.env.GHL_WEBHOOK_URL?.trim();
  const intent = normalizeInvolveIntent(payload.intent);
  const body: LeadPayload = {
    ...payload,
    intent: intent ?? payload.intent,
    submittedAt: payload.submittedAt ?? new Date().toISOString(),
  };

  const testReason = testLeadReason(body);
  if (testReason) {
    console.info("[ghl] test lead — webhook skipped", {
      reason: testReason,
      lead: summarizeLead(body),
    });
    return { ok: true, skipped: "test" };
  }

  if (!webhookUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[ghl] GHL_WEBHOOK_URL missing — accepting lead in development",
        summarizeLead(body),
      );
      return { ok: true };
    }
    console.error(
      "[ghl] GHL_WEBHOOK_URL is not configured — lead not delivered",
      summarizeLead(body),
    );
    return { ok: false, error: "GHL_WEBHOOK_URL is not configured" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GHL_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[ghl] webhook failed", {
        status: response.status,
        detail: detail.slice(0, 500),
        lead: summarizeLead(body),
      });
      return { ok: false, error: `GHL webhook failed (${response.status})` };
    }

    return { ok: true };
  } catch (err) {
    const timedOut =
      typeof err === "object" &&
      err !== null &&
      (err as { name?: unknown }).name === "TimeoutError";
    const message = timedOut
      ? `timed out after ${GHL_TIMEOUT_MS}ms`
      : err instanceof Error
        ? err.message
        : "Network error";
    console.error("[ghl] webhook request error", {
      message,
      lead: summarizeLead(body),
    });
    return { ok: false, error: `GHL webhook error: ${message}` };
  }
}
