import { beforeEach, describe, expect, it } from "vitest";
import {
  LOGIN_RATE_LIMIT,
  checkLoginRateLimit,
  registerLoginFailure,
  registerLoginSuccess,
  resetLoginRateLimitStore,
} from "@/lib/auth/rate-limit";

describe("login rate limiting", () => {
  beforeEach(() => {
    resetLoginRateLimitStore();
  });

  it("locks out after repeated failures", () => {
    const key = "1.2.3.4:attacker@example.com";
    for (let i = 0; i < LOGIN_RATE_LIMIT.MAX_ATTEMPTS; i += 1) {
      registerLoginFailure(key);
    }
    const decision = checkLoginRateLimit(key);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("clears the bucket after success", () => {
    const key = "1.2.3.4:user@example.com";
    registerLoginFailure(key);
    registerLoginSuccess(key);
    expect(checkLoginRateLimit(key).allowed).toBe(true);
  });
});
