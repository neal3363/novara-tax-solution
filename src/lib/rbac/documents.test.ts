import { describe, expect, it } from "vitest";
import { canAccessDocument, listVisibleDocuments } from "@/lib/rbac/documents";
import { cases, documents, previewUsers } from "@/lib/synthetic/data";

describe("document authorization", () => {
  it("blocks attorney from owner government-ID document", () => {
    const ownerDoc = documents.find((d) => d.id === "doc_001")!;
    expect(canAccessDocument(previewUsers.attorney, ownerDoc, cases).allowed).toBe(false);
  });

  it("allows attorney only assigned-matter evidence", () => {
    const visible = listVisibleDocuments(previewUsers.attorney, documents, cases);
    expect(visible.some((d) => d.id === "doc_001")).toBe(false);
    expect(visible.some((d) => d.id === "doc_002")).toBe(true);
  });

  it("keeps partners from privileged counsel-only materials outside authorization", () => {
    const privileged = documents.find((d) => d.id === "doc_002")!;
    // Partner org is not in authorizedOrganizationIds for death certificate
    expect(canAccessDocument(previewUsers.partner, privileged, cases).allowed).toBe(false);
  });
});
