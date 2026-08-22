export const INVOLVE_INTENTS = ["space", "partner", "volunteer"] as const;

export type InvolveIntent = (typeof INVOLVE_INTENTS)[number];

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
  submittedAt?: string;
};

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
  };
}

/**
 * POST lead JSON to GoHighLevel inbound webhook (`GHL_WEBHOOK_URL`).
 * Unset env fails closed in production; accepted in development.
 */
export async function sendLeadToGhl(
  payload: LeadPayload,
): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.GHL_WEBHOOK_URL?.trim();
  const intent = normalizeInvolveIntent(payload.intent);
  const body: LeadPayload = {
    ...payload,
    intent: intent ?? payload.intent,
    submittedAt: payload.submittedAt ?? new Date().toISOString(),
  };

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
    const message = err instanceof Error ? err.message : "Network error";
    console.error("[ghl] webhook request error", {
      message,
      lead: summarizeLead(body),
    });
    return { ok: false, error: `GHL webhook error: ${message}` };
  }
}
