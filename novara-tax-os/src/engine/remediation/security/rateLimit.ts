/**
 * Rate limiting / brute-force protection (staging in-memory).
 */

import { assertRemediationStagingOnly, getRemediationFlags } from '../config'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSec?: number
  locked: boolean
}

interface Bucket {
  count: number
  windowStart: number
  lockedUntil?: number
}

const buckets = new Map<string, Bucket>()

export function resetRateLimitForTests(): void {
  buckets.clear()
}

export function checkRateLimit(input: {
  key: string
  limit: number
  windowMs: number
  lockMs?: number
}): RateLimitResult {
  assertRemediationStagingOnly()
  if (!getRemediationFlags().rateLimitEnabled) {
    return { allowed: true, remaining: input.limit, locked: false }
  }
  const now = Date.now()
  let b = buckets.get(input.key)
  if (!b || now - b.windowStart > input.windowMs) {
    b = { count: 0, windowStart: now }
  }
  if (b.lockedUntil && b.lockedUntil > now) {
    buckets.set(input.key, b)
    return {
      allowed: false,
      remaining: 0,
      locked: true,
      retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000),
    }
  }
  b.count += 1
  if (b.count > input.limit) {
    b.lockedUntil = now + (input.lockMs ?? input.windowMs)
    buckets.set(input.key, b)
    return {
      allowed: false,
      remaining: 0,
      locked: true,
      retryAfterSec: Math.ceil(((b.lockedUntil ?? now) - now) / 1000),
    }
  }
  buckets.set(input.key, b)
  return { allowed: true, remaining: Math.max(0, input.limit - b.count), locked: false }
}

/** Login brute-force defaults: 5 attempts / 15 min then lock 15 min */
export function checkLoginBruteForce(identityKey: string): RateLimitResult {
  return checkRateLimit({
    key: `login:${identityKey}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
    lockMs: 15 * 60 * 1000,
  })
}
