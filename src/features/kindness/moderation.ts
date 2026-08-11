import { KINDNESS_MAX_BODY } from "./types";

const BLOCKLIST = ["http://", "https://", "viagra", "crypto giveaway"];

/** Lightweight client moderation stub — replace with server review later. */
export function moderateKindnessBody(body: string): {
  ok: boolean;
  error?: string;
  cleaned: string;
} {
  const cleaned = body.trim().slice(0, KINDNESS_MAX_BODY);
  const lower = cleaned.toLowerCase();
  if (!cleaned) {
    return { ok: false, error: "Write a few kind words first.", cleaned };
  }
  if (BLOCKLIST.some((w) => lower.includes(w))) {
    return {
      ok: false,
      error: "That note needs a gentler rewrite — no links or spam, please.",
      cleaned,
    };
  }
  return { ok: true, cleaned };
}
