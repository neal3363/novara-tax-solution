import { beforeEach, describe, expect, it } from "vitest";
import {
  LOGIN_RATE_LIMIT,
  checkLoginRateLimit,
  registerLoginFailure,
  registerLoginSuccess,
  resetLoginRateLimitStore,
} from "@/lib/auth/rate-limit";

describe("durable login rate limiting", () => {
  beforeEach(async () => {
    await resetLoginRateLimitStore();
  });

  it("locks out after repeated failures", async () => {
    const key = "1.2.3.4:attacker@example.com";
    for (let i = 0; i < LOGIN_RATE_LIMIT.MAX_ATTEMPTS; i += 1) {
      await registerLoginFailure(key);
    }
    const decision = await checkLoginRateLimit(key);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("clears the bucket after success", async () => {
    const key = "1.2.3.4:user@example.com";
    await registerLoginFailure(key);
    await registerLoginSuccess(key);
    expect((await checkLoginRateLimit(key)).allowed).toBe(true);
  });
});
