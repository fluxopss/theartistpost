import { sendLeadToGhl } from "@/lib/ghl";
import {
  isInvolveHoneypot,
  parseInvolveInquiry,
} from "@/features/involve/validation";
import {
  platformField,
  type LeadOptions,
  type LeadOutcome,
} from "@/server/api/leads/types";

export const INVOLVE_UNDELIVERED_ERROR =
  "We could not send that just now. Call or email Robbie and we will catch you.";

/** Get Involved inquiry (space, partner, volunteer) to the CRM. */
export async function submitInvolveInquiry(
  body: unknown,
  options?: LeadOptions,
): Promise<LeadOutcome<{ accepted: true }>> {
  const parsed = parseInvolveInquiry(body);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "invalid",
      error: parsed.error,
      fields: parsed.fields,
    };
  }

  if (isInvolveHoneypot(parsed.data.website)) {
    return { ok: true, data: { accepted: true } };
  }

  const { name, email, phone, intent, medium, city, message } = parsed.data;
  const result = await sendLeadToGhl({
    name,
    email,
    phone: phone || undefined,
    message,
    intent,
    medium: medium || undefined,
    city: city || undefined,
    source: "theartistpost-get-involved",
    page: "/get-involved",
    ...platformField(options),
  });

  if (!result.ok) {
    return {
      ok: false,
      reason: "undelivered",
      error: INVOLVE_UNDELIVERED_ERROR,
      upstreamError: result.error,
    };
  }

  return { ok: true, data: { accepted: true } };
}
