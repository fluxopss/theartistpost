import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const nightRsvpSchema = z.object({
  eventId: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2, "Name is required.").max(80),
  email: z
    .string()
    .trim()
    .max(120)
    .regex(EMAIL_RE, "Enter a valid email address."),
  party: z.number().int().min(1, "Hold at least one seat.").max(6, "Six seats at a time."),
  note: z.string().trim().max(160, "Keep the note under 160 characters.").optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
});

export type NightRsvpInput = z.infer<typeof nightRsvpSchema>;

export function parseNightRsvp(raw: unknown) {
  const result = nightRsvpSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false as const,
      error: first?.message ?? "Check the pass and try again.",
    };
  }
  return { ok: true as const, data: result.data };
}

export function isNightHoneypot(website?: string) {
  return Boolean(website?.trim());
}

/** Memorable door mark. Not a secret — the same guest and night always match. */
export function passCode(eventId: string, email: string): string {
  const raw = `${eventId}:${email.trim().toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const mark = (hash >>> 0).toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `TAP-${mark}`;
}
