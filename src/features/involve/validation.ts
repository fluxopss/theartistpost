import { z } from "zod";
import { INVOLVE_INTENTS } from "@/lib/ghl";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const involveInquirySchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  email: z
    .string()
    .trim()
    .max(120)
    .regex(EMAIL_RE, "Enter a valid email address."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  intent: z.enum(INVOLVE_INTENTS),
  medium: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(8, "Tell us a little about how you want to show up.")
    .max(800, "Keep it under 800 characters."),
  /** Honeypot — bots fill this; humans leave it empty. */
  website: z.string().max(200).optional().or(z.literal("")),
});

export type InvolveInquiryInput = z.infer<typeof involveInquirySchema>;

export function parseInvolveInquiry(raw: unknown) {
  const result = involveInquirySchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false as const,
      error: first?.message ?? "Check the form and try again.",
    };
  }
  return { ok: true as const, data: result.data };
}

export function isInvolveHoneypot(website?: string) {
  return Boolean(website?.trim());
}
