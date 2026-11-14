import type { DocumentVaultItem, Opportunity, UserSession } from "@/lib/types";

export type AccessDecision = {
  allowed: boolean;
  reason: string;
};

export function canAccessTerritory(user: UserSession, state: string): AccessDecision {
  if (user.role === "executive") {
    return { allowed: true, reason: "Executive national scope" };
  }
  if (user.territories.includes("US") || user.territories.includes(state)) {
    return { allowed: true, reason: "Territory match" };
  }
  return { allowed: false, reason: `Territory ${state} not granted to organization` };
}

export function canAccessLockedOpportunity(
  user: UserSession,
  opportunity: Opportunity & { lockedToOrgId?: string },
): AccessDecision {
  if (user.role === "executive") {
    return { allowed: true, reason: "Executive override with audit" };
  }
  if (opportunity.lockedToOrgId && opportunity.lockedToOrgId !== user.organizationId) {
    return { allowed: false, reason: "Opportunity locked to another organization" };
  }
  if (user.role === "partner" && opportunity.assignedPartnerId !== user.organizationId) {
    return { allowed: false, reason: "Partner not exclusively assigned" };
  }
  return { allowed: true, reason: "Assignment/lock checks passed" };
}

export function canReadDocument(
  user: UserSession,
  document: DocumentVaultItem,
): AccessDecision {
  if (document.sensitivity === "privileged" && user.role !== "attorney" && user.role !== "executive") {
    return { allowed: false, reason: "Privileged material restricted to counsel/executive" };
  }
  if (document.sensitivity === "sensitive" && user.role === "partner" && document.ownerId !== user.organizationId) {
    return { allowed: false, reason: "Sensitive document outside partner assignment scope" };
  }
  if (user.role === "owner" && document.ownerId !== user.id) {
    return { allowed: false, reason: "Owner may only access own vault items" };
  }
  return { allowed: true, reason: "Sensitivity and ownership checks passed" };
}

export function canExportOpportunity(user: UserSession, opportunity: Opportunity): AccessDecision {
  if (user.role === "executive") {
    return { allowed: true, reason: "Executive export permitted with watermark" };
  }
  if (user.role === "partner" && opportunity.assignedPartnerId === user.organizationId) {
    return { allowed: true, reason: "Assigned partner export permitted with watermark" };
  }
  return { allowed: false, reason: "Export denied — no assignment or authority" };
}

export function watermarkExportPayload(
  user: UserSession,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...payload,
    _novara_watermark: {
      exportedBy: user.id,
      organizationId: user.organizationId,
      role: user.role,
      exportedAt: new Date().toISOString(),
      notice: "Confidential NOVARA Asset Intelligence export. Circumvention prohibited.",
      synthetic: true,
    },
  };
}
