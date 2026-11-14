import { describe, expect, it } from "vitest";
import { canExportOpportunity } from "@/lib/rbac/abac";
import { canAccessDocument, listVisibleDocuments } from "@/lib/rbac/documents";
import {
  assertNoCrossPartnerLeak,
  canViewMasterDiscoveryPool,
} from "@/lib/rbac/policy";
import { cases, documents, opportunities, previewUsers } from "@/lib/synthetic/data";

describe("server-side partner / matter / document / export permissions", () => {
  it("partners cannot see master discovery or foreign opportunities", () => {
    expect(canViewMasterDiscoveryPool(previewUsers.partner)).toBe(false);
    expect(canViewMasterDiscoveryPool(previewUsers.executive)).toBe(true);
    const foreign = opportunities.find((o) => o.id === "opp_tx_uc_8841")!;
    expect(assertNoCrossPartnerLeak(previewUsers.partner, foreign)).toBe(false);
  });

  it("documents are limited to authorized orgs / matters", () => {
    const attorneyDocs = listVisibleDocuments(previewUsers.attorney, documents, cases);
    expect(attorneyDocs.length).toBeGreaterThan(0);
    expect(
      attorneyDocs.every((d) => d.authorizedOrganizationIds.includes("org_counsel_tx")),
    ).toBe(true);
    expect(canAccessDocument(previewUsers.partner, documents[0]!, cases).allowed).toBe(false);
  });

  it("export permission follows ABAC", () => {
    const assigned = opportunities.find((o) => o.assignedPartnerId === "org_partner_tx_01");
    const unassigned = opportunities.find((o) => !o.assignedPartnerId) ?? opportunities[0]!;
    if (assigned) {
      expect(canExportOpportunity(previewUsers.partner, assigned).allowed).toBe(true);
    }
    expect(canExportOpportunity(previewUsers.partner, unassigned).allowed).toBe(false);
    expect(canExportOpportunity(previewUsers.owner, unassigned).allowed).toBe(false);
  });
});
