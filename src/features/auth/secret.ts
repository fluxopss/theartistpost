/**
 * Session HMAC secret. Prefer AUTH_SECRET, fall back to NEXTAUTH_SECRET.
 * Production writes fail closed when neither is set.
 * Development may use a local-only fallback so /join works without secrets.
 */

const DEV_FALLBACK = "tap-dev-auth-secret-not-for-production";

export function getAuthSecret(): string | null {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return null;
  return DEV_FALLBACK;
}

export function hasAuthSecret(): boolean {
  return Boolean(
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
  );
}

export function authSecretRequiredError(): string {
  return "Registration is closed until AUTH_SECRET is configured.";
}
