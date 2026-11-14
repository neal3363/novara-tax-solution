import { sql } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RateRow = {
  rate_key: string;
  failure_count: number;
  window_started_at: string | Date;
  locked_until: string | Date | null;
};

function asTime(value: string | Date | null | undefined): number {
  if (!value) return 0;
  return new Date(value).getTime();
}

export async function checkLoginRateLimit(
  key: string,
  now = Date.now(),
): Promise<RateLimitDecision> {
  const rows = await sql<RateRow>(
    "select rate_key, failure_count, window_started_at, locked_until from login_rate_limits where rate_key = $1",
    [key],
  );
  const current = rows[0];
  if (!current) {
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const lockedUntil = asTime(current.locked_until);
  if (lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000),
    };
  }

  const windowStarted = asTime(current.window_started_at);
  if (now - windowStarted > WINDOW_MS) {
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - Number(current.failure_count));
  return {
    allowed: remaining > 0,
    remaining,
    retryAfterSeconds:
      remaining > 0 ? 0 : Math.ceil((windowStarted + WINDOW_MS - now) / 1000),
  };
}

export async function registerLoginFailure(
  key: string,
  now = Date.now(),
): Promise<RateLimitDecision> {
  const rows = await sql<RateRow>(
    "select rate_key, failure_count, window_started_at, locked_until from login_rate_limits where rate_key = $1",
    [key],
  );
  const current = rows[0];
  let count = 0;
  let windowStartedAt = now;
  if (current && now - asTime(current.window_started_at) <= WINDOW_MS) {
    count = Number(current.failure_count);
    windowStartedAt = asTime(current.window_started_at);
  }
  count += 1;
  const lockedUntil =
    count >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS).toISOString() : null;

  await sql(
    `insert into login_rate_limits (rate_key, failure_count, window_started_at, locked_until)
     values ($1, $2, $3::timestamptz, $4::timestamptz)
     on conflict (rate_key) do update set
       failure_count = excluded.failure_count,
       window_started_at = excluded.window_started_at,
       locked_until = excluded.locked_until`,
    [key, count, new Date(windowStartedAt).toISOString(), lockedUntil],
  );

  return checkLoginRateLimit(key, now);
}

export async function registerLoginSuccess(key: string): Promise<void> {
  await sql("delete from login_rate_limits where rate_key = $1", [key]);
}

export async function resetLoginRateLimitStore(): Promise<void> {
  await sql("delete from login_rate_limits");
}

export const LOGIN_RATE_LIMIT = { WINDOW_MS, MAX_ATTEMPTS, LOCKOUT_MS };
