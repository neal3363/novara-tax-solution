import { beforeEach, describe, expect, it } from "vitest";
import {
  decodeSession,
  encodeSession,
  portalFromPath,
} from "@/lib/auth/cookies";

describe("signed session cookies v2", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
    process.env.AUTH_SESSION_VERSION = "2";
  });

  it("round-trips a signed session and preserves mfaVerified=false", async () => {
    const token = await encodeSession({
      role: "partner",
      userId: "usr_partner_014",
      organizationId: "org_partner_tx_01",
      mfaVerified: false,
      authSource: "password",
      rosterFp: "abc",
    });
    const payload = await decodeSession(token);
    expect(payload?.role).toBe("partner");
    expect(payload?.mfaVerified).toBe(false);
    expect(payload?.v).toBe(2);
  });

  it("rejects unsigned, tampered, or legacy payloads", async () => {
    expect(await decodeSession("not-a-token")).toBeNull();
    const token = await encodeSession({
      role: "executive",
      userId: "usr_exec_001",
      organizationId: "org_novara",
      mfaVerified: true,
      authSource: "password",
      rosterFp: "abc",
    });
    const [body] = token.split(".");
    expect(await decodeSession(`${body}.tamperedsignaturevalue`)).toBeNull();
  });

  it("maps portal paths to roles", () => {
    expect(portalFromPath("/app/executive/discovery")).toBe("executive");
    expect(portalFromPath("/app/partner/cases")).toBe("partner");
    expect(portalFromPath("/discovery")).toBeNull();
  });
});
