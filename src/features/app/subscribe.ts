const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSubscribeEmail(raw: unknown) {
  if (typeof raw !== "string") {
    return { ok: false as const, error: "Enter a valid email address." };
  }
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return { ok: false as const, error: "Enter a valid email address." };
  }
  return { ok: true as const, email };
}
