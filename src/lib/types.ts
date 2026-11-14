export type PortalRole = "executive" | "partner" | "attorney" | "owner";

export type OpportunityStage =
  | "DISCOVER"
  | "CONNECT"
  | "VERIFY"
  | "VALUE"
  | "LEGAL_GATE"
  | "FIRST_LOOK"
  | "KEEP"
  | "PARTNER"
  | "RELEASE"
  | "WATCH"
  | "REJECT"
  | "ASSIGNED"
  | "EXECUTE"
  | "CLOSE"
  | "ACCOUNT";

export type FirstLookDecision = "KEEP" | "PARTNER" | "RELEASE" | "WATCH" | "REJECT";

export type AssetClass =
  | "unclaimed_funds"
  | "real_estate"
  | "probate"
  | "bankruptcy"
  | "court_funds"
  | "mineral"
  | "business";

export type SourcePermissionClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: PortalRole;
  organizationId: string;
  organizationName: string;
  territories: string[];
  mfaEnabled: boolean;
  previewMode: true;
}

export interface Opportunity {
  id: string;
  title: string;
  state: string;
  assetClass: AssetClass;
  estimatedValue: number;
  stage: OpportunityStage;
  firstLookDecision?: FirstLookDecision;
  confidence: number;
  freshnessMinutes: number;
  sourceOfficial: boolean;
  assignedPartnerId?: string;
  assignedAttorneyId?: string;
  synthetic: true;
}

export interface StateCoverage {
  code: string;
  name: string;
  status: "live" | "pilot" | "queued" | "gated";
  connectorCount: number;
  opportunities: number;
  avgDetectionMinutes: number | null;
}

export interface AgentDefinition {
  id: string;
  name: string;
  purpose: string;
  canDecideLegal: false;
  status: "active" | "monitoring" | "preview";
}

export interface CaseRecord {
  id: string;
  opportunityId: string;
  title: string;
  state: string;
  status: string;
  milestone: string;
  updatedAt: string;
  partnerVisible: boolean;
  attorneyVisible: boolean;
  ownerVisible: boolean;
  synthetic: true;
}

export interface DocumentVaultItem {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  sensitivity: "standard" | "sensitive" | "privileged";
  ownerId: string;
  /** Matters this document is explicitly authorized for. */
  caseIds: string[];
  /** Organizations explicitly authorized to view/download. */
  authorizedOrganizationIds: string[];
  synthetic: true;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  resource: string;
  outcome: "allowed" | "denied";
}
