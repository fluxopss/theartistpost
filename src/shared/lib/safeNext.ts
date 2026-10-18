/**
 * Where to send someone after sign-in. Only same-site paths survive, so a
 * crafted `/join?next=` link can never bounce a person to another website.
 */
const MAX_LENGTH = 512;
const BLOCKED_ROUTES = ["/join", "/api"];

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_LENGTH) return null;

  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return null;
  }

  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(path)) return null;

  const route = path.split(/[?#]/)[0] ?? "";
  if (BLOCKED_ROUTES.some((blocked) => route === blocked || route.startsWith(`${blocked}/`))) {
    return null;
  }

  try {
    const probe = new URL(path, "https://same.invalid");
    if (probe.host !== "same.invalid") return null;
  } catch {
    return null;
  }

  return path;
}

/** Sign-in link that brings the person back to `nextPath` afterwards. */
export function joinHref(nextPath: string): string {
  const next = safeNextPath(nextPath);
  return next ? `/join?door=return&next=${encodeURIComponent(next)}` : "/join?door=return";
}
