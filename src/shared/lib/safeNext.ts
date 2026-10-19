/**
 * Where to send someone after sign-in. Only same-site paths survive, so a
 * crafted `/join?next=` link can never bounce a person to another website.
 *
 * Next.js has already decoded `searchParams`, so the value is not decoded
 * again (that would corrupt `?q=a%26b`). The result is re-serialized by URL,
 * which percent-encodes anything that can't go in a Location header.
 */
const MAX_LENGTH = 512;
const BLOCKED_ROUTES = ["/join", "/api"];

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;

  const route = raw.split(/[?#]/)[0] ?? "";
  // Encoded slashes/backslashes in the path only exist to confuse a parser.
  if (/%2f|%5c/i.test(route)) return null;

  let probe: URL;
  try {
    probe = new URL(raw, "https://same.invalid");
  } catch {
    return null;
  }
  if (probe.host !== "same.invalid") return null;
  if (BLOCKED_ROUTES.some((blocked) => probe.pathname === blocked || probe.pathname.startsWith(`${blocked}/`))) {
    return null;
  }

  return `${probe.pathname}${probe.search}${probe.hash}`;
}

/** Sign-in link that brings the person back to `nextPath` afterwards. */
export function joinHref(nextPath: string): string {
  const next = safeNextPath(nextPath);
  return next ? `/join?door=return&next=${encodeURIComponent(next)}` : "/join?door=return";
}
