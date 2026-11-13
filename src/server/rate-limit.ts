import '@tanstack/react-start/server-only'

/**
 * Small in-memory rate limiter for the public estimate endpoint.
 *
 * This is intentionally basic: it protects a single Worker isolate from a burst
 * of submissions, not the whole edge network. It is not a security boundary and
 * it never stores request bodies or contact details. A production deployment
 * that needs a shared limit should back this with Durable Objects or KV.
 */

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5_000

export type RateLimitOptions = {
  limit: number
  windowMs: number
  now?: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    prune(now)
    return { allowed: true, remaining: Math.max(0, options.limit - 1), retryAfterSeconds: 0 }
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)),
    }
  }

  existing.count += 1
  return { allowed: true, remaining: Math.max(0, options.limit - existing.count), retryAfterSeconds: 0 }
}

/**
 * Best-effort client address. Whop/Cloudflare provide `cf-connecting-ip`; the
 * forwarded header is a fallback for local or proxied runs. Invalid values are
 * ignored rather than trusted as a bucket key.
 */
export function clientAddress(request: Request): string {
  const candidates = [
    request.headers.get('cf-connecting-ip'),
    (request.headers.get('x-forwarded-for') ?? '').split(',')[0],
  ]

  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (value && /^[0-9a-fA-F:.]{3,45}$/.test(value)) return value
  }

  return 'unknown'
}

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }

  // Keep a hard cap so a spoofed header cannot grow memory without bound.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value
    if (!oldest) break
    buckets.delete(oldest)
  }
}

/** Exposed for tests only. */
export function resetRateLimits(): void {
  buckets.clear()
}
