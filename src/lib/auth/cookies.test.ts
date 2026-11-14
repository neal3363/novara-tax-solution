import { beforeEach, describe, expect, it } from "vitest";
import {
  decodeSession,
  encodeSession,
  portalFromPath,
  sessionToUser,
} from "@/lib/auth/cookies";
import { previewUsers } from "@/lib/synthetic/data";

describe("signed session cookies", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
  });

  it("round-trips a signed preview session payload", async () => {
    const token = await encodeSession(previewUsers.partner);
    expect(token.includes(".")).toBe(true);
    const payload = await decodeSession(token);
    expect(payload?.role).toBe("partner");
    expect(sessionToUser(payload!).organizationId).toBe("org_partner_tx_01");
  });

  it("rejects unsigned or tampered tokens", async () => {
    expect(await decodeSession("not-a-token")).toBeNull();
    const token = await encodeSession(previewUsers.executive);
    const [body] = token.split(".");
    expect(await decodeSession(`${body}.tamperedsignaturevalue`)).toBeNull();
  });

  it("maps portal paths to roles", () => {
    expect(portalFromPath("/app/executive/discovery")).toBe("executive");
    expect(portalFromPath("/app/partner/cases")).toBe("partner");
    expect(portalFromPath("/discovery")).toBeNull();
  });
});
