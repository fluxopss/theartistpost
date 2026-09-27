import type { LeadPlatform } from "@/lib/ghl";

/**
 * Why a lead form did not go through. Each route turns this into its own
 * response shape: the website routes keep their original JSON, /api/v1 maps
 * it onto the envelope error codes.
 */
export type LeadFailureReason = "invalid" | "not_found" | "closed" | "undelivered";

export type LeadOutcome<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: LeadFailureReason;
      /** Safe to show the person who filled the form. */
      error: string;
      fields?: Record<string, string>;
      /** Raw delivery error from the CRM webhook, for logs and legacy routes. */
      upstreamError?: string;
    };

export type LeadOptions = {
  /** Which client sent the lead. Omitted by the website routes. */
  platform?: LeadPlatform;
};

/** Only add `platform` to the CRM payload when a client actually sent one. */
export function platformField(options?: LeadOptions) {
  return options?.platform ? { platform: options.platform } : {};
}
