import { describe, expect, it } from "vitest";
import {
  assertNoCrossPartnerLeak,
  canAccessPortal,
  canMakeFirstLookDecision,
  canViewMasterDiscoveryPool,
  listVisibleOpportunities,
  aiMayFinalizeLegalDetermination,
} from "@/lib/rbac/policy";
import { opportunities, previewUsers } from "@/lib/synthetic/data";

describe("portal isolation", () => {
  it("allows each role only its own portal", () => {
    expect(canAccessPortal(previewUsers.partner, "partner")).toBe(true);
    expect(canAccessPortal(previewUsers.partner, "executive")).toBe(false);
    expect(canAccessPortal(previewUsers.attorney, "attorney")).toBe(true);
    expect(canAccessPortal(previewUsers.owner, "executive")).toBe(false);
  });

  it("prevents partners from viewing the master discovery pool", () => {
    expect(canViewMasterDiscoveryPool(previewUsers.executive)).toBe(true);
    expect(canViewMasterDiscoveryPool(previewUsers.partner)).toBe(false);
  });

  it("returns only assigned opportunities to partners", () => {
    const visible = listVisibleOpportunities(previewUsers.partner);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((o) => o.assignedPartnerId === previewUsers.partner.organizationId)).toBe(
      true,
    );
    expect(visible.some((o) => o.stage === "FIRST_LOOK")).toBe(false);
  });

  it("blocks cross-partner opportunity reads", () => {
    const foreign = opportunities.find((o) => o.id === "opp_tx_uc_8841")!;
    expect(assertNoCrossPartnerLeak(previewUsers.partner, foreign)).toBe(false);
  });

  it("restricts First Look decisions to executives", () => {
    expect(canMakeFirstLookDecision(previewUsers.executive)).toBe(true);
    expect(canMakeFirstLookDecision(previewUsers.partner)).toBe(false);
  });

  it("never allows AI to finalize legal determinations", () => {
    expect(aiMayFinalizeLegalDetermination()).toBe(false);
  });
});
