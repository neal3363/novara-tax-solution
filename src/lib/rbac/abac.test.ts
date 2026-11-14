import { describe, expect, it } from "vitest";
import {
  canAccessTerritory,
  canExportOpportunity,
  canReadDocument,
  watermarkExportPayload,
} from "@/lib/rbac/abac";
import { documents, opportunities, previewUsers } from "@/lib/synthetic/data";

describe("ABAC controls", () => {
  it("allows partners only in granted territories", () => {
    expect(canAccessTerritory(previewUsers.partner, "TX").allowed).toBe(true);
    expect(canAccessTerritory(previewUsers.partner, "CA").allowed).toBe(false);
  });

  it("blocks privileged documents from partners", () => {
    const privileged = documents.find((d) => d.sensitivity === "privileged")!;
    expect(canReadDocument(previewUsers.partner, privileged).allowed).toBe(false);
    expect(canReadDocument(previewUsers.attorney, privileged).allowed).toBe(true);
  });

  it("denies partner export of unassigned opportunities", () => {
    const unassigned = opportunities.find((o) => o.id === "opp_tx_uc_8841")!;
    expect(canExportOpportunity(previewUsers.partner, unassigned).allowed).toBe(false);
  });

  it("watermarks permitted exports", () => {
    const assigned = opportunities.find((o) => o.assignedPartnerId === "org_partner_tx_01")!;
    expect(canExportOpportunity(previewUsers.partner, assigned).allowed).toBe(true);
    const payload = watermarkExportPayload(previewUsers.partner, { id: assigned.id });
    expect(payload._novara_watermark).toBeTruthy();
  });
});
