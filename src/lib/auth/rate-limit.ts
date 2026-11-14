type Bucket = {
  count: number;
  windowStartedAt: number;
  lockedUntil: number;
};

const globalStore = globalThis as typeof globalThis & {
  __novaraLoginRateLimit?: Map<string, Bucket>;
};

function store(): Map<string, Bucket> {
  if (!globalStore.__novaraLoginRateLimit) {
    globalStore.__novaraLoginRateLimit = new Map();
  }
  return globalStore.__novaraLoginRateLimit;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkLoginRateLimit(key: string, now = Date.now()): RateLimitDecision {
  const buckets = store();
  const current = buckets.get(key);

  if (current?.lockedUntil && current.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.lockedUntil - now) / 1000),
    };
  }

  if (!current || now - current.windowStartedAt > WINDOW_MS) {
    buckets.set(key, { count: 0, windowStartedAt: now, lockedUntil: 0 });
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - current.count);
  return {
    allowed: remaining > 0,
    remaining,
    retryAfterSeconds: remaining > 0 ? 0 : Math.ceil((current.windowStartedAt + WINDOW_MS - now) / 1000),
  };
}

export function registerLoginFailure(key: string, now = Date.now()): RateLimitDecision {
  const buckets = store();
  const current = buckets.get(key) ?? { count: 0, windowStartedAt: now, lockedUntil: 0 };
  if (now - current.windowStartedAt > WINDOW_MS) {
    current.count = 0;
    current.windowStartedAt = now;
    current.lockedUntil = 0;
  }
  current.count += 1;
  if (current.count >= MAX_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_MS;
  }
  buckets.set(key, current);
  return checkLoginRateLimit(key, now);
}

export function registerLoginSuccess(key: string): void {
  store().delete(key);
}

export function resetLoginRateLimitStore(): void {
  store().clear();
}

export const LOGIN_RATE_LIMIT = { WINDOW_MS, MAX_ATTEMPTS, LOCKOUT_MS };
