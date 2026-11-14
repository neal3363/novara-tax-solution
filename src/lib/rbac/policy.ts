import type { CaseRecord, Opportunity, PortalRole, UserSession } from "@/lib/types";
import { opportunities, partnerOpportunities } from "@/lib/synthetic/data";
import { canAccessLockedOpportunity, canAccessTerritory } from "@/lib/rbac/abac";

/**
 * Server-side style authorization policy for preview.
 * Enforces role + organization + territory + lock isolation.
 * Partners never see master pool.
 */
export function canAccessPortal(user: UserSession, portal: PortalRole): boolean {
  return user.role === portal;
}

export function listVisibleOpportunities(user: UserSession): Opportunity[] {
  const base = (() => {
    switch (user.role) {
      case "executive":
        return opportunities;
      case "partner":
        return partnerOpportunities.filter(
          (o) => o.assignedPartnerId === user.organizationId,
        );
      case "attorney":
        return opportunities.filter(
          (o) => o.assignedAttorneyId === user.organizationId,
        );
      case "owner":
        return [];
      default:
        return [];
    }
  })();

  return base.filter((opportunity) => {
    const territory = canAccessTerritory(user, opportunity.state);
    const lock = canAccessLockedOpportunity(user, opportunity);
    return territory.allowed && lock.allowed;
  });
}

export function listVisibleCases(user: UserSession, cases: CaseRecord[]): CaseRecord[] {
  switch (user.role) {
    case "executive":
      return cases;
    case "partner":
      return cases.filter((c) => c.partnerVisible);
    case "attorney":
      return cases.filter((c) => c.attorneyVisible);
    case "owner":
      return cases.filter((c) => c.ownerVisible);
    default:
      return [];
  }
}

export function assertNoCrossPartnerLeak(
  viewer: UserSession,
  opportunity: Opportunity,
): boolean {
  if (viewer.role !== "partner") return true;
  return opportunity.assignedPartnerId === viewer.organizationId;
}

export function canViewMasterDiscoveryPool(user: UserSession): boolean {
  return user.role === "executive";
}

export function canMakeFirstLookDecision(user: UserSession): boolean {
  return user.role === "executive";
}

export function aiMayFinalizeLegalDetermination(): false {
  return false;
}
