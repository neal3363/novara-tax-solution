import type { CaseRecord, DocumentVaultItem, UserSession } from "@/lib/types";
import { canReadDocument } from "@/lib/rbac/abac";
import { listVisibleCases } from "@/lib/rbac/policy";

export function canAccessDocument(
  user: UserSession,
  document: DocumentVaultItem,
  cases: CaseRecord[],
): { allowed: boolean; reason: string } {
  if (!document.authorizedOrganizationIds.includes(user.organizationId)) {
    return { allowed: false, reason: "Organization not authorized for document" };
  }

  const visibleCases = listVisibleCases(user, cases);
  const visibleCaseIds = new Set(visibleCases.map((c) => c.id));
  const overlapsMatter = document.caseIds.some((id) => visibleCaseIds.has(id));
  if (!overlapsMatter) {
    return { allowed: false, reason: "Document not authorized for an assigned matter" };
  }

  const sensitivity = canReadDocument(user, document);
  if (!sensitivity.allowed) return sensitivity;

  return { allowed: true, reason: "Matter + organization + sensitivity checks passed" };
}

export function listVisibleDocuments(
  user: UserSession,
  documents: DocumentVaultItem[],
  cases: CaseRecord[],
): DocumentVaultItem[] {
  return documents.filter((doc) => canAccessDocument(user, doc, cases).allowed);
}
