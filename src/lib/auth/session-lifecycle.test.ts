import { describe, expect, it, beforeEach } from "vitest";
import { decodeSession, encodeSession } from "@/lib/auth/cookies";

describe("session lifecycle", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
    process.env.AUTH_SESSION_VERSION = "2";
  });

  it("rejects expired sessions", async () => {
    const token = await encodeSession({
      role: "partner",
      userId: "usr_partner_014",
      organizationId: "org_partner_tx_01",
      mfaVerified: true,
      authSource: "password",
      rosterFp: "fp",
      ttlSeconds: 1,
    });
    // exp is floor(now)+ttl; wait past the inclusive current-second boundary
    await new Promise((r) => setTimeout(r, 2500));
    expect(await decodeSession(token)).toBeNull();
  });

  it("rejects legacy cookie name payloads that are not v2 signed sessions", async () => {
    expect(await decodeSession("legacy-shared-password-token")).toBeNull();
  });
});
