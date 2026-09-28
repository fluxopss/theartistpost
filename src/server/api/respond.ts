/**
 * v1 JSON envelope. Every /api/v1 response is one of:
 *   { ok: true, data }
 *   { ok: false, error: { code, message, fields?, retryAfterSec? } }
 */

export const API_ERROR_STATUS = {
  validation_failed: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  upstream_unavailable: 502,
  service_paused: 503,
  internal: 500,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  fields?: Record<string, string>;
  retryAfterSec?: number;
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: ApiError };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** Cache policies used by the read endpoints. */
export const CACHE = {
  none: "no-store",
  minute: "public, max-age=60",
  fiveMinutes: "public, max-age=300",
  content: "public, max-age=300, stale-while-revalidate=86400",
} as const;

export function apiOk<T>(
  data: T,
  options?: { status?: number; cache?: string },
): Response {
  const body: ApiSuccess<T> = { ok: true, data };
  return Response.json(body, {
    status: options?.status ?? 200,
    headers: { "Cache-Control": options?.cache ?? CACHE.none },
  });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  extra?: { fields?: Record<string, string>; retryAfterSec?: number },
): Response {
  const error: ApiError = { code, message };
  if (extra?.fields && Object.keys(extra.fields).length > 0) {
    error.fields = extra.fields;
  }
  if (extra?.retryAfterSec !== undefined) {
    error.retryAfterSec = extra.retryAfterSec;
  }
  const headers = new Headers({ "Cache-Control": CACHE.none });
  if (error.retryAfterSec !== undefined) {
    headers.set("Retry-After", String(error.retryAfterSec));
  }
  const body: ApiFailure = { ok: false, error };
  return Response.json(body, { status: API_ERROR_STATUS[code], headers });
}

/** Caller IP: first x-forwarded-for hop, else x-real-ip, else "unknown". */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Wrap a handler so an unexpected throw becomes an `internal` envelope
 * instead of Next's HTML error page.
 */
export async function withApiErrors(
  label: string,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    console.error(`[api/v1] ${label}`, error);
    return apiError("internal", "Something went wrong. Try again in a moment.");
  }
}
