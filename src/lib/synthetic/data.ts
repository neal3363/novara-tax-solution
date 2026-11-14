import type {
  AgentDefinition,
  AuditEvent,
  CaseRecord,
  DocumentVaultItem,
  Opportunity,
  StateCoverage,
  UserSession,
} from "@/lib/types";

/** All preview data is synthetic and labeled. No live source integrations. */
export const SYNTHETIC_BANNER =
  "SYNTHETIC PREVIEW DATA — Not live source integrations. No guaranteed recoveries.";

export const previewUsers: Record<string, UserSession> = {
  executive: {
    id: "usr_exec_001",
    name: "Alexandra Novar",
    email: "executive@novara.preview",
    role: "executive",
    organizationId: "org_novara",
    organizationName: "NOVARA Asset Intelligence",
    territories: ["US"],
    mfaEnabled: true,
    previewMode: true,
  },
  partner: {
    id: "usr_partner_014",
    name: "Marcus Hale",
    email: "partner@novara.preview",
    role: "partner",
    organizationId: "org_partner_tx_01",
    organizationName: "Lone Star Recovery Partners",
    territories: ["TX"],
    mfaEnabled: true,
    previewMode: true,
  },
  attorney: {
    id: "usr_atty_007",
    name: "Priya Raman",
    email: "attorney@novara.preview",
    role: "attorney",
    organizationId: "org_counsel_tx",
    organizationName: "Raman & Cole LLP",
    territories: ["TX", "OK"],
    mfaEnabled: true,
    previewMode: true,
  },
  owner: {
    id: "usr_owner_221",
    name: "Jordan Ellis",
    email: "owner@novara.preview",
    role: "owner",
    organizationId: "org_claimant_221",
    organizationName: "Claimant Workspace",
    territories: [],
    mfaEnabled: true,
    previewMode: true,
  },
};

export const stateCoverage: StateCoverage[] = [
  { code: "TX", name: "Texas", status: "pilot", connectorCount: 6, opportunities: 142, avgDetectionMinutes: 9 },
  { code: "CA", name: "California", status: "queued", connectorCount: 2, opportunities: 38, avgDetectionMinutes: null },
  { code: "FL", name: "Florida", status: "queued", connectorCount: 2, opportunities: 29, avgDetectionMinutes: null },
  { code: "NY", name: "New York", status: "gated", connectorCount: 1, opportunities: 12, avgDetectionMinutes: null },
  { code: "IL", name: "Illinois", status: "queued", connectorCount: 1, opportunities: 18, avgDetectionMinutes: null },
  { code: "OH", name: "Ohio", status: "queued", connectorCount: 1, opportunities: 15, avgDetectionMinutes: null },
  { code: "PA", name: "Pennsylvania", status: "gated", connectorCount: 0, opportunities: 0, avgDetectionMinutes: null },
  { code: "GA", name: "Georgia", status: "queued", connectorCount: 1, opportunities: 11, avgDetectionMinutes: null },
  { code: "NC", name: "North Carolina", status: "queued", connectorCount: 1, opportunities: 9, avgDetectionMinutes: null },
  { code: "MI", name: "Michigan", status: "gated", connectorCount: 0, opportunities: 0, avgDetectionMinutes: null },
  { code: "DC", name: "Washington, D.C.", status: "queued", connectorCount: 1, opportunities: 7, avgDetectionMinutes: null },
];

const allStates = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export const nationalCoverageMap: StateCoverage[] = allStates.map((code) => {
  const known = stateCoverage.find((s) => s.code === code);
  if (known) return known;
  return {
    code,
    name: code,
    status: "gated" as const,
    connectorCount: 0,
    opportunities: 0,
    avgDetectionMinutes: null,
  };
});

export const opportunities: Opportunity[] = [
  {
    id: "opp_tx_uc_8841",
    title: "Harris County — Unclaimed funds cluster",
    state: "TX",
    assetClass: "unclaimed_funds",
    estimatedValue: 428500,
    stage: "FIRST_LOOK",
    confidence: 0.86,
    freshnessMinutes: 11,
    sourceOfficial: true,
    synthetic: true,
  },
  {
    id: "opp_tx_re_2290",
    title: "Travis County — Excess proceeds candidate",
    state: "TX",
    assetClass: "real_estate",
    estimatedValue: 186000,
    stage: "LEGAL_GATE",
    confidence: 0.74,
    freshnessMinutes: 28,
    sourceOfficial: true,
    synthetic: true,
  },
  {
    id: "opp_tx_pr_1102",
    title: "Dallas Probate — Estate asset graph",
    state: "TX",
    assetClass: "probate",
    estimatedValue: 912000,
    stage: "PARTNER",
    firstLookDecision: "PARTNER",
    confidence: 0.81,
    freshnessMinutes: 64,
    sourceOfficial: true,
    assignedPartnerId: "org_partner_tx_01",
    assignedAttorneyId: "org_counsel_tx",
    synthetic: true,
  },
  {
    id: "opp_tx_cf_441",
    title: "Bexar County — Court registry funds",
    state: "TX",
    assetClass: "court_funds",
    estimatedValue: 67500,
    stage: "WATCH",
    firstLookDecision: "WATCH",
    confidence: 0.69,
    freshnessMinutes: 120,
    sourceOfficial: true,
    synthetic: true,
  },
  {
    id: "opp_tx_mn_018",
    title: "Permian — Mineral interest research lead",
    state: "TX",
    assetClass: "mineral",
    estimatedValue: 240000,
    stage: "VERIFY",
    confidence: 0.62,
    freshnessMinutes: 45,
    sourceOfficial: true,
    synthetic: true,
  },
  {
    id: "opp_ok_bk_077",
    title: "Oklahoma — Bankruptcy unclaimed funds",
    state: "OK",
    assetClass: "bankruptcy",
    estimatedValue: 33400,
    stage: "DISCOVER",
    confidence: 0.71,
    freshnessMinutes: 8,
    sourceOfficial: true,
    synthetic: true,
  },
];

export const partnerOpportunities = opportunities.filter(
  (o) => o.assignedPartnerId === "org_partner_tx_01",
);

export const cases: CaseRecord[] = [
  {
    id: "case_tx_1102",
    opportunityId: "opp_tx_pr_1102",
    title: "Dallas Probate — Estate asset graph",
    state: "TX",
    status: "Evidence packet in review",
    milestone: "Attorney conflict check complete",
    updatedAt: "2026-11-13T22:14:00Z",
    partnerVisible: true,
    attorneyVisible: true,
    ownerVisible: false,
    synthetic: true,
  },
  {
    id: "case_owner_221",
    opportunityId: "opp_tx_uc_8841",
    title: "Identity verification — Ellis claim path",
    state: "TX",
    status: "Awaiting document vault upload",
    milestone: "Identity Agent match score 0.91",
    updatedAt: "2026-11-14T04:02:00Z",
    partnerVisible: false,
    attorneyVisible: false,
    ownerVisible: true,
    synthetic: true,
  },
];

export const documents: DocumentVaultItem[] = [
  {
    id: "doc_001",
    name: "Government ID — front (redacted preview)",
    category: "Identity",
    uploadedAt: "2026-11-12T18:20:00Z",
    sensitivity: "sensitive",
    ownerId: "usr_owner_221",
    synthetic: true,
  },
  {
    id: "doc_002",
    name: "Death certificate extract — research copy",
    category: "Estate Evidence",
    uploadedAt: "2026-11-11T15:01:00Z",
    sensitivity: "privileged",
    ownerId: "org_counsel_tx",
    synthetic: true,
  },
  {
    id: "doc_003",
    name: "Claim form draft — TX Comptroller style",
    category: "Claim Prep",
    uploadedAt: "2026-11-13T09:44:00Z",
    sensitivity: "standard",
    ownerId: "org_partner_tx_01",
    synthetic: true,
  },
];

export const agents: AgentDefinition[] = [
  { id: "command", name: "NOVARA Command AI", purpose: "Executive orchestration and opportunity briefing", canDecideLegal: false, status: "active" },
  { id: "guardian", name: "Guardian AI", purpose: "Freshness, health, security, and incident monitoring", canDecideLegal: false, status: "active" },
  { id: "national_sweep", name: "National Sweep Agent", purpose: "Coordinate multi-source discovery sweeps", canDecideLegal: false, status: "monitoring" },
  { id: "identity", name: "Identity Agent", purpose: "Entity resolution and identity match scoring", canDecideLegal: false, status: "active" },
  { id: "property", name: "Property Agent", purpose: "Parcel, lien, and equity intelligence", canDecideLegal: false, status: "active" },
  { id: "estate", name: "Estate Agent", purpose: "Probate and estate graph assembly", canDecideLegal: false, status: "active" },
  { id: "heir", name: "Heir Agent", purpose: "Probable family/claimant graph (non-determinative)", canDecideLegal: false, status: "preview" },
  { id: "unclaimed", name: "Unclaimed Asset Agent", purpose: "State-held asset discovery under rights gates", canDecideLegal: false, status: "active" },
  { id: "bankruptcy", name: "Bankruptcy Agent", purpose: "Bankruptcy unclaimed-fund workflows", canDecideLegal: false, status: "preview" },
  { id: "court", name: "Court Funds Agent", purpose: "Court registries and excess proceeds", canDecideLegal: false, status: "preview" },
  { id: "federal", name: "Federal Agent", purpose: "Approved federal program discovery", canDecideLegal: false, status: "preview" },
  { id: "mineral", name: "Mineral/Royalty Agent", purpose: "Mineral and royalty interest research", canDecideLegal: false, status: "preview" },
  { id: "business", name: "Business Agent", purpose: "Historical entities and successors", canDecideLegal: false, status: "preview" },
  { id: "compliance", name: "Compliance Agent", purpose: "Applies approved legal rules; cannot create law", canDecideLegal: false, status: "active" },
  { id: "valuation", name: "Valuation Agent", purpose: "Asset and equity estimates", canDecideLegal: false, status: "active" },
  { id: "strategy", name: "Strategy Agent", purpose: "KEEP / PARTNER / RELEASE / WATCH / REJECT recommendations", canDecideLegal: false, status: "active" },
  { id: "allocation", name: "Allocation Agent", purpose: "Partner eligibility and exclusive routing", canDecideLegal: false, status: "active" },
  { id: "deadline", name: "Deadline Agent", purpose: "Statutory and workflow deadline tracking", canDecideLegal: false, status: "active" },
  { id: "fraud", name: "Fraud/Risk Agent", purpose: "Claimant, document, and payment anomalies", canDecideLegal: false, status: "active" },
  { id: "qc", name: "Quality-Control Agent", purpose: "Independent QC and contradiction checks", canDecideLegal: false, status: "monitoring" },
  { id: "report", name: "Report Agent", purpose: "Evidence-linked report generation", canDecideLegal: false, status: "preview" },
  { id: "source_roi", name: "Source ROI Agent", purpose: "Connector cost/quality analytics", canDecideLegal: false, status: "preview" },
  { id: "collision", name: "Collision AI", purpose: "Deal collision and anti-circumvention detection", canDecideLegal: false, status: "active" },
];

export const auditEvents: AuditEvent[] = [
  {
    id: "aud_1",
    at: "2026-11-14T12:01:00Z",
    actor: "usr_partner_014",
    action: "attempt_read_master_pool",
    resource: "opportunities:master",
    outcome: "denied",
  },
  {
    id: "aud_2",
    at: "2026-11-14T11:44:00Z",
    actor: "usr_exec_001",
    action: "first_look_decision",
    resource: "opp_tx_pr_1102",
    outcome: "allowed",
  },
  {
    id: "aud_3",
    at: "2026-11-14T10:12:00Z",
    actor: "usr_atty_007",
    action: "open_evidence_packet",
    resource: "case_tx_1102",
    outcome: "allowed",
  },
];

export const businessModel = {
  maxExternalPartners: 100,
  seatsPerState: 2,
  targetMonthlySubscriptionUsd: 10000,
  novaraShareTarget: 0.6,
  partnerShareTarget: 0.4,
  note: "60/40 is a business target only where a transaction-specific legal model permits it.",
};

export const recoveryMetrics = {
  pipelineValue: 1867400,
  firstLookPending: 2,
  assignedExclusive: 1,
  watchActive: 1,
  avgDetectionMinutes: 9,
  partnerSeatsFilled: 14,
  partnerSeatsMax: 100,
  synthetic: true as const,
};

export const competitorGaps = [
  {
    id: 1,
    name: "Intelligence Enrichment Engine",
    status: "preview" as const,
    influence: "Tracers",
  },
  {
    id: 2,
    name: "Secure Claimant Document Vault",
    status: "preview" as const,
    influence: "Claimiflo",
  },
  {
    id: 3,
    name: "AI Claim Preparation Assistant",
    status: "preview" as const,
    influence: "Claimiflo",
  },
  {
    id: 4,
    name: "Bulk Case Operations",
    status: "preview" as const,
    influence: "Claimiflo / Tracers",
  },
  {
    id: 5,
    name: "Recovery Performance Dashboard",
    status: "preview" as const,
    influence: "Claimiflo",
  },
  {
    id: 6,
    name: "Forensic Genealogy Workspace",
    status: "preview" as const,
    influence: "HeirSearch",
  },
  {
    id: 7,
    name: "International Heir Research Routing",
    status: "scaffold" as const,
    influence: "HeirSearch",
  },
  {
    id: 8,
    name: "Court-Ready Evidence Generator",
    status: "preview" as const,
    influence: "HeirSearch",
  },
  {
    id: 9,
    name: "Expert Researcher and Attorney Network",
    status: "preview" as const,
    influence: "HeirSearch",
  },
  {
    id: 10,
    name: "Data Provider Comparison Engine",
    status: "scaffold" as const,
    influence: "Tracers",
  },
];

export const workflowStages = [
  "DISCOVER",
  "CONNECT",
  "VERIFY",
  "VALUE",
  "LEGAL_GATE",
  "FIRST_LOOK",
  "KEEP / PARTNER / RELEASE / WATCH / REJECT",
  "EXCLUSIVE ASSIGNMENT",
  "EXECUTE",
  "CLOSE",
  "ACCOUNT",
] as const;
