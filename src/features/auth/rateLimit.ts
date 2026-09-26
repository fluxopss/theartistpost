/** Lightweight in-memory rate limit (resets on process restart). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function hitRateLimit(
  key: string,
  options: { windowMs: number; max: number },
): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }
  if (entry.count >= options.max) return false;
  entry.count += 1;
  return true;
}

/** Test helper — clear buckets between cases. */
export function resetRateLimits(): void {
  buckets.clear();
}
