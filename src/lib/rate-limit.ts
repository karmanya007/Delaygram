/**
 * In-memory rate limiter for single-instance / development use.
 *
 * Production upgrade path: replace the body of `checkRateLimit` with
 * `@upstash/ratelimit` backed by a Redis instance — the call-site signature
 * is identical.
 */

const requestMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): { allowed: boolean } {
  const now = Date.now();
  const entry = requestMap.get(key);

  if (!entry || entry.resetAt < now) {
    requestMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false };
  }

  entry.count++;
  return { allowed: true };
}
