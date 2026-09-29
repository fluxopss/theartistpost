import { parseSubscribeEmail } from "@/features/app/subscribe";
import { sendLeadToGhl } from "@/lib/ghl";
import {
  platformField,
  type LeadOptions,
  type LeadOutcome,
} from "@/server/api/leads/types";

export const DONOR_CADENCES = ["one_time", "monthly"] as const;

export type DonorCadence = (typeof DONOR_CADENCES)[number];

export const DONOR_UNDELIVERED_ERROR =
  "We could not save that just now. Email Robbie and we will catch you.";

function readCadence(body: unknown): DonorCadence {
  if (typeof body !== "object" || body === null || !("cadence" in body)) {
    return "one_time";
  }
  const value = (body as { cadence: unknown }).cadence;
  if (
    typeof value === "string" &&
    (DONOR_CADENCES as readonly string[]).includes(value)
  ) {
    return value as DonorCadence;
  }
  return "one_time";
}

/**
 * Soft donor stewardship handoff to GHL (tag path).
 * Does not process payments — PayPal/Venmo remain the money rails.
 *
 * Suggested GHL tags from `intent` + `medium`:
 * - intent `donor` + medium `one_time` → donor / donor.one_time
 * - intent `donor` + medium `monthly` → donor / donor.recurring / sustainer
 */
export async function submitDonorSteward(
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

  const cadence = readCadence(body);
  const result = await sendLeadToGhl({
    name: parsed.email.split("@")[0] ?? "Donor",
    email: parsed.email,
    message:
      cadence === "monthly"
        ? "Donor stewardship — monthly / sustainer"
        : "Donor stewardship — one-time gift",
    intent: "donor",
    medium: cadence,
    source: "theartistpost-donate",
    page: "/donate",
    ...platformField(options),
  });

  if (!result.ok) {
    return {
      ok: false,
      reason: "undelivered",
      error: DONOR_UNDELIVERED_ERROR,
      upstreamError: result.error,
    };
  }

  return { ok: true, data: { accepted: true } };
}
