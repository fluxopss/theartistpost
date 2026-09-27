import { parseSubscribeEmail } from "@/features/app/subscribe";
import { sendLeadToGhl } from "@/lib/ghl";
import {
  platformField,
  type LeadOptions,
  type LeadOutcome,
} from "@/server/api/leads/types";

export const SUBSCRIBE_UNDELIVERED_ERROR =
  "We could not add that just now. Email Robbie and we will put you on the list.";

/** Newsletter sign-up to the CRM. */
export async function submitSubscribe(
  body: unknown,
  options?: LeadOptions,
): Promise<LeadOutcome<{ accepted: true }>> {
  const emailValue =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email: unknown }).email
      : undefined;
  const parsed = parseSubscribeEmail(emailValue);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "invalid",
      error: parsed.error,
      fields: { email: parsed.error },
    };
  }

  const result = await sendLeadToGhl({
    name: parsed.email.split("@")[0] ?? "Subscriber",
    email: parsed.email,
    message: "Newsletter subscribe",
    intent: "subscribe",
    source: "theartistpost-subscribe",
    page: "/",
    ...platformField(options),
  });

  if (!result.ok) {
    return {
      ok: false,
      reason: "undelivered",
      error: SUBSCRIBE_UNDELIVERED_ERROR,
      upstreamError: result.error,
    };
  }

  return { ok: true, data: { accepted: true } };
}
