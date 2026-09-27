import { checkRateLimit } from "@/features/auth/rateLimit";
import { LEAD_PLATFORMS, type LeadPlatform } from "@/lib/ghl";
import type {
  LeadFailureReason,
  LeadOptions,
  LeadOutcome,
} from "@/server/api/leads/types";
import {
  apiError,
  apiOk,
  clientIp,
  withApiErrors,
  type ApiErrorCode,
} from "@/server/api/respond";

/** Per IP, per route: 5 submissions every 10 minutes. */
export const LEAD_RATE_LIMIT = { windowMs: 10 * 60_000, max: 5 } as const;

const REASON_CODE: Record<LeadFailureReason, ApiErrorCode> = {
  invalid: "validation_failed",
  not_found: "not_found",
  closed: "conflict",
  undelivered: "upstream_unavailable",
};

type PlatformResult =
  | { ok: true; platform?: LeadPlatform }
  | { ok: false; error: string };

/** Optional `platform` in the body: "ios" | "android" | "web". */
export function readPlatform(body: unknown): PlatformResult {
  if (typeof body !== "object" || body === null || !("platform" in body)) {
    return { ok: true };
  }
  const value = (body as { platform: unknown }).platform;
  if (value === undefined || value === null || value === "") return { ok: true };
  if (
    typeof value === "string" &&
    (LEAD_PLATFORMS as readonly string[]).includes(value)
  ) {
    return { ok: true, platform: value as LeadPlatform };
  }
  return { ok: false, error: `platform must be one of ${LEAD_PLATFORMS.join(", ")}.` };
}

/**
 * POST handler body shared by the v1 lead routes: rate limit, parse JSON,
 * read `platform`, run the shared submit function, wrap in the envelope.
 */
export function handleLeadPost<T>(
  request: Request,
  route: string,
  submit: (body: unknown, options: LeadOptions) => Promise<LeadOutcome<T>>,
): Promise<Response> {
  return withApiErrors(route, async () => {
    const limit = checkRateLimit(
      `api:v1:${route}:${clientIp(request)}`,
      LEAD_RATE_LIMIT,
    );
    if (!limit.ok) {
      return apiError("rate_limited", "Too many tries. Wait a bit and send it again.", {
        retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Send a JSON body.");
    }

    const platform = readPlatform(body);
    if (!platform.ok) {
      return apiError("validation_failed", platform.error, {
        fields: { platform: platform.error },
      });
    }

    const outcome = await submit(body, { platform: platform.platform });
    if (outcome.ok) return apiOk(outcome.data);

    // Delivery failures are already logged by sendLeadToGhl; the client only
    // gets the friendly message, never the raw webhook error.
    return apiError(REASON_CODE[outcome.reason], outcome.error, {
      fields: outcome.fields,
    });
  });
}
