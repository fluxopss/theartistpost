import { content } from "@/lib/content";
import { sendLeadToGhl } from "@/lib/ghl";
import { nightPhase } from "@/features/night/program";
import {
  isNightHoneypot,
  parseNightRsvp,
  passCode,
} from "@/features/night/rsvp";
import {
  platformField,
  type LeadOptions,
  type LeadOutcome,
} from "@/server/api/leads/types";

export const RSVP_UNDELIVERED_ERROR =
  "Your seat was not sent. Try again in a moment.";

/** Hold a seat for a night: validate, check the night is open, tell the CRM. */
export async function submitNightRsvp(
  body: unknown,
  options?: LeadOptions,
): Promise<LeadOutcome<{ code: string }>> {
  const parsed = parseNightRsvp(body);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "invalid",
      error: parsed.error,
      fields: parsed.fields,
    };
  }

  const { eventId, name, email, party, note, website } = parsed.data;
  const code = passCode(eventId, email);

  if (isNightHoneypot(website)) {
    return { ok: true, data: { code } };
  }

  const event = await content.getEventById(eventId);
  if (!event) {
    return {
      ok: false,
      reason: "not_found",
      error: "That night is not on the board.",
    };
  }

  if (nightPhase(event) === "closed") {
    return {
      ok: false,
      reason: "closed",
      error: "That night has already closed.",
    };
  }

  const result = await sendLeadToGhl({
    name,
    email,
    message: [
      `RSVP: ${event.title}`,
      `When: ${event.start}`,
      `Party of ${party}`,
      `Pass: ${code}`,
      note?.trim() ? `Note: ${note.trim()}` : "",
      `Venue: ${event.venue}`,
    ]
      .filter(Boolean)
      .join("\n"),
    intent: "rsvp",
    source: "theartistpost-night-rsvp",
    page: "/night",
    ...platformField(options),
  });

  if (!result.ok) {
    return {
      ok: false,
      reason: "undelivered",
      error: RSVP_UNDELIVERED_ERROR,
      upstreamError: result.error,
    };
  }

  return { ok: true, data: { code } };
}
