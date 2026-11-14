import { describe, expect, it } from "vitest";
import {
  decodeSession,
  encodeSession,
  portalFromPath,
  sessionToUser,
} from "@/lib/auth/cookies";
import { previewUsers } from "@/lib/synthetic/data";

describe("session cookies", () => {
  it("round-trips a preview session payload", () => {
    const token = encodeSession(previewUsers.partner);
    const payload = decodeSession(token);
    expect(payload?.role).toBe("partner");
    expect(sessionToUser(payload!).organizationId).toBe("org_partner_tx_01");
  });

  it("maps portal paths to roles", () => {
    expect(portalFromPath("/app/executive/discovery")).toBe("executive");
    expect(portalFromPath("/app/partner/cases")).toBe("partner");
    expect(portalFromPath("/discovery")).toBeNull();
  });

  it("rejects tampered tokens", () => {
    expect(decodeSession("not-a-token")).toBeNull();
  });
});
