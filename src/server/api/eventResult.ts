import { apiError, type ApiErrorCode } from "@/server/api/respond";

/** Failure half of a service result; routes map it with `failureResponse`. */
export type EventFailure = {
  ok: false;
  code: Extract<
    ApiErrorCode,
    | "validation_failed"
    | "not_found"
    | "conflict"
    | "forbidden"
    | "rate_limited"
    | "upstream_unavailable"
  >;
  message: string;
  fields?: Record<string, string>;
  retryAfterSec?: number;
};

export function failureResponse(failure: EventFailure): Response {
  return apiError(failure.code, failure.message, {
    fields: failure.fields,
    retryAfterSec: failure.retryAfterSec,
  });
}

export const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const NOT_FOUND_EVENT: EventFailure = {
  ok: false,
  code: "not_found",
  message: "That night is not taking part in the app yet.",
};
