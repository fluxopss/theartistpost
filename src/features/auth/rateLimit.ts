/** Lightweight in-memory rate limit (resets on process restart). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Past this many keys, expired buckets are swept before a new one is added. */
const SWEEP_THRESHOLD = 5_000;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/** Same counting as `hitRateLimit`, plus how long until the window resets. */
export function checkRateLimit(
  key: string,
  options: { windowMs: number; max: number },
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    if (!entry && buckets.size >= SWEEP_THRESHOLD) sweepExpired(now);
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }
  if (entry.count >= options.max) {
    return { ok: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }
  entry.count += 1;
  return { ok: true };
}

export function hitRateLimit(
  key: string,
  options: { windowMs: number; max: number },
): boolean {
  return checkRateLimit(key, options).ok;
}

/** Test helper — clear buckets between cases. */
export function resetRateLimits(): void {
  buckets.clear();
}
