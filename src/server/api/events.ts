import type { ContentEvent } from "@/lib/content";

/** YYYY-MM-DD, optionally followed by a time — what Date.parse reads reliably. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export type EventWindow = { from?: number; to?: number };

type WindowResult =
  | { ok: true; window: EventWindow }
  | { ok: false; message: string; fields: Record<string, string> };

function readInstant(raw: string | null): number | null | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  // An unencoded "+" offset arrives as a space; put it back.
  const value = raw.trim().replace(/ (\d{2}:?\d{2})$/, "+$1");
  if (!ISO_DATE_RE.test(value)) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * Optional `from` / `to` ISO 8601 bounds. An event is in the window when it
 * overlaps it: ends at or after `from` and starts at or before `to`.
 */
export function parseEventWindow(params: URLSearchParams): WindowResult {
  const fields: Record<string, string> = {};
  const from = readInstant(params.get("from"));
  const to = readInstant(params.get("to"));
  if (from === null) fields.from = "from must be an ISO 8601 date or date-time.";
  if (to === null) fields.to = "to must be an ISO 8601 date or date-time.";
  if (typeof from === "number" && typeof to === "number" && from > to) {
    fields.to = "to must be on or after from.";
  }
  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Check the date range.", fields };
  }
  return {
    ok: true,
    window: {
      from: from ?? undefined,
      to: to ?? undefined,
    },
  };
}

export function inWindow(event: ContentEvent, window: EventWindow): boolean {
  if (window.from !== undefined && !(Date.parse(event.end) >= window.from)) {
    return false;
  }
  if (window.to !== undefined && !(Date.parse(event.start) <= window.to)) {
    return false;
  }
  return true;
}

/** Event ids are short board keys; anything longer cannot exist. */
export function isPlausibleEventId(id: string): boolean {
  return id.length > 0 && id.length <= 40;
}
