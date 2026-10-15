import type { ZodError } from "zod";

/** First message per field path — the shape `apiError(..., { fields })` expects. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "body";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

const CURSOR_RE = /^[A-Za-z0-9_-]{1,64}$/;
const WHOLE_NUMBER_RE = /^\d+$/;

export type PageParams = { cursor?: string; take: number };

/**
 * Shared `cursor` + `take` parser for the community lists.
 * `take` defaults to `defaultTake`, must be a whole number >= 1, capped at `maxTake`.
 */
export function parsePageParams(
  params: URLSearchParams,
  options: { defaultTake: number; maxTake: number },
):
  | { ok: true; page: PageParams }
  | { ok: false; message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  let take = options.defaultTake;
  const rawTake = params.get("take");
  if (rawTake !== null && rawTake !== "") {
    const n = WHOLE_NUMBER_RE.test(rawTake) ? Number(rawTake) : NaN;
    if (!Number.isSafeInteger(n) || n < 1) {
      fields.take = `take must be a whole number from 1 to ${options.maxTake}.`;
    } else {
      take = Math.min(n, options.maxTake);
    }
  }

  const cursor = params.get("cursor") || undefined;
  if (cursor !== undefined && !CURSOR_RE.test(cursor)) {
    fields.cursor = "cursor must be a nextCursor value from a previous page.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return { ok: true, page: { cursor, take } };
}
