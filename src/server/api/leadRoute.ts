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

/** App (/api/v1) lead routes, per IP, per route: 5 submissions every 10 minutes. */
export const LEAD_RATE_LIMIT = { windowMs: 10 * 60_000, max: 5 } as const;

/**
 * Website form routes, per IP, per route. Looser than the app budget because
 * at an in-person night many guests share the venue's one public IP.
 */
export const WEB_LEAD_IP_RATE_LIMIT = { windowMs: 10 * 60_000, max: 40 } as const;

/** Website form routes, per normalized email, per route (whatever the IP). */
export const WEB_LEAD_EMAIL_RATE_LIMIT = { windowMs: 10 * 60_000, max: 5 } as const;

const REASON_CODE: Record<LeadFailureReason, ApiErrorCode> = {
  invalid: "validation_failed",
  not_found: "not_found",
  closed: "conflict",
  undelivered: "upstream_unavailable",
};

const RATE_LIMITED_MESSAGE = "Too many tries. Wait a bit and send it again.";

function webRateLimited(retryAfterMs: number): Response {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return Response.json(
    { ok: false, error: RATE_LIMITED_MESSAGE },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec), "Cache-Control": "no-store" },
    },
  );
}

/**
 * Per-IP budget for the website's own form routes (/api/subscribe,
 * /api/involve, /api/night/rsvp, /api/donate/steward). Separate keys from
 * the v1 routes, so the website and the app never spend each other's budget.
 * Call before reading the body. Returns a 429 in the website's
 * `{ ok: false, error }` shape, or null to go on.
 */
export function limitWebLead(request: Request, route: string): Response | null {
  const limit = checkRateLimit(
    `web:${route}:${clientIp(request)}`,
    WEB_LEAD_IP_RATE_LIMIT,
  );
  return limit.ok ? null : webRateLimited(limit.retryAfterMs);
}

/** The body's `email`, trimmed and lowercased, or null when there is none. */
export function leadEmailKey(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("email" in body)) return null;
  const value = (body as { email: unknown }).email;
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email ? email : null;
}

/**
 * Per-email budget for the website form routes, applied after the body
 * parses: one person cannot flood a form even from many IPs, while a venue
 * full of different guests on one IP is not held back. No email, no check.
 */
export function limitWebLeadEmail(route: string, body: unknown): Response | null {
  const email = leadEmailKey(body);
  if (!email) return null;
  const limit = checkRateLimit(
    `web:${route}:email:${email}`,
    WEB_LEAD_EMAIL_RATE_LIMIT,
  );
  return limit.ok ? null : webRateLimited(limit.retryAfterMs);
}

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
      return apiError("rate_limited", RATE_LIMITED_MESSAGE, {
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
