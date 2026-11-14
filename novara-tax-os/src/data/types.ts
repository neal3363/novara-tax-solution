export type Role = 'taxpayer' | 'preparer' | 'efin_owner' | 'admin'

/** Product account type — finer than Role for TP vs Office staff */
export type AccountType = 'tc' | 'independent_tp' | 'office_owner' | 'office_preparer' | 'admin'

export type { ProfessionalCredential, EfileProviderAssociation } from '../engine/credentials'

export type ReturnState =
  | 'Lead'
  | 'Client Created'
  | 'Engagement Accepted'
  | 'Intake Started'
  | 'Documents Pending'
  | 'Extraction/Verification'
  | 'Tax Facts Ready'
  | 'Calculation'
  | 'Diagnostics'
  | 'Preparer Review'
  | 'Expert Review'
  | 'Client Review'
  | 'Signature Pending'
  | 'Ready to File'
  | 'Transmitted'
  | 'Accepted'
  | 'Rejected'
  | 'Post-Filing'
  | 'Closed'

export type ReturnType = '1040' | '1040_Schedule_C' | '1065' | '1120-S' | '1120'

export type DocType =
  | 'W-2'
  | '1099-NEC'
  | '1099-INT'
  | '1098'
  | '1098-T'
  | '1098-E'
  | 'Childcare'
  | 'Property Tax'
  | 'ID'
  | 'Bank Statement'
  | 'Prior Return'
  | 'P&L'
  | 'Trial Balance'
  | 'Other'

export interface AuditEvent {
  id: string
  at: string
  actorId: string
  actorRole: Role | 'system'
  action: string
  /** Safe summary — never include full SSN or raw account numbers */
  summary: string
  meta?: Record<string, string | number | boolean>
}

export type EntryPlanStatus = 'draft' | 'awaiting_approval' | 'approved' | 'entering' | 'entered' | 'rejected_item'

export interface UserAccount {
  id: string
  name: string
  email: string
  role: Role
  tenantId: string
  accountType: AccountType
  /** @deprecated Prefer credentials.ptin — kept for display fallbacks */
  ptin?: string
  credentials?: {
    ptin?: import('../engine/credentials').ProfessionalCredential
    efin?: import('../engine/credentials').ProfessionalCredential
    ein?: import('../engine/credentials').ProfessionalCredential
    efileProvider?: import('../engine/credentials').EfileProviderAssociation
    businessName?: string
    businessAddress?: string
  }
}

/** Office staff roster entry (Office accounts only) */
export interface OfficeStaffMember {
  id: string
  tenantId: string
  userId: string
  name: string
  email: string
  kind: 'owner' | 'preparer'
  status: 'active' | 'invited' | 'removed'
  invitedAt: string
  /** Public PTIN hint only — never full credential */
  ptinDisplay?: string
  ptinStatus?: import('../engine/credentials').CredentialStatus
}

export interface DocumentRecord {
  id: string
  name: string
  type: DocType
  taxYear: number
  sizeLabel: string
  uploadedAt: string
  status: 'scanning' | 'classified' | 'extracted' | 'verified' | 'needs_review'
  confidence: number
  ownerId: string
  /** Owning TP or Office tenant — required for vault isolation */
  tenantId: string
  /** Taxpayer/client this file belongs to (may differ from uploader) */
  clientId?: string
  /** Logical storage path scoped to tenant */
  storagePath?: string
  /** Audit-ready vault organization */
  vaultCategory?:
    | 'primary_taxpayer'
    | 'spouse'
    | 'dependents'
    | 'income'
    | 'credits_deductions'
    | 'business'
    | 'filing_authorizations'
    | 'other'
  /** Linked extracted household person id when known */
  personId?: string
  facts: ExtractedFact[]
}

export interface ExtractedFact {
  id: string
  label: string
  value: string
  sourcePage: number
  confidence: number
  verified: boolean
}

export interface TaxReturn {
  id: string
  clientName: string
  clientId: string
  taxYear: number
  returnType: ReturnType
  state: ReturnState
  readiness: number
  refundOrOwe: number
  preparerId?: string
  /** Owning TP or Office tenant — never shared across tenants */
  tenantId: string
  /** Within an office, only these preparers (plus owner) may open the return */
  assignedPreparerIds?: string[]
  isBusiness: boolean
  feeSnapshot: { label: string; amount: number; status: string }[]
  appliedBenefits: AppliedBenefitLine[]
  updatedAt: string
  /** Original vs amended */
  filingMode?: 'original' | 'amended'
  /** IRS notices received for this year */
  hasIrsNotice?: boolean
  /** Document folder key for this year/return */
  documentFolderId?: string
  /** Estimated IRS penalties/interest (never mixed into NOVARA fees) */
  irsPenaltyInterestEstimate?: number
  filingMethod?: 'efile' | 'paper' | 'unavailable'
  refundClaimWarning?: string
}

/** Client order selecting one or more tax years before prep */
export interface MultiYearEngagement {
  id: string
  taxYear: number
  filingMode: 'original' | 'amended'
  kind: 'personal' | 'business' | 'both'
  hasIrsNotice: boolean
  returnIds: string[]
  documentFolderId: string
  status: 'selected' | 'in_progress' | 'ready_to_file' | 'filed'
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  at: string
}

/** Filed-style proposed field mapping before anything is written */
export interface EntryPlanLine {
  id: string
  form: string
  field: string
  proposedValue: string
  sourceDocId: string
  sourceDocName: string
  sourceBox: string
  sourcePage: number
  confidence: number
  status: 'proposed' | 'approved' | 'corrected' | 'removed'
  correctedValue?: string
}

export interface PreEntryNote {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  detail: string
}

export interface AppliedBenefitLine {
  id: string
  ruleId: string
  name: string
  form: string
  field: string
  amount: number
  status: string
  docStatus: string
  citation: string
}

export interface BenefitApplicationEvent {
  ruleId: string
  name: string
  amount: number
  previousRefund: number
  updatedRefund: number
  form: string
  field: string
  at: string
}

export interface BenefitSnapshot {
  taxYear: number
  ruleVersion: string
  baseRefund: number
  projectedRefund: number
  verifiedSavings: number
  potentialSavings: number
  auditComplete: boolean
  blockers: string[]
  comparisonNotes: string[]
  findings: {
    ruleId: string
    name: string
    shortName: string
    category: string
    status: string
    estimatedSavings: number
    affectingRefund?: number
    explanation: string
    missingAnswers: string[]
    missingDocs: string[]
    docStatus?: string
    form?: string
    field?: string
    ruleCitation: string
  }[]
  formLines: AppliedBenefitLine[]
  lastRunAt: string
  /** Plain-language explanation of the latest recalculation */
  lastChangeNote?: string
  lastApplications?: BenefitApplicationEvent[]
  dependentInfoComplete?: boolean
  refundIncomplete?: boolean
  refundIncompleteReason?: string
}

export interface AppState {
  currentUser: UserAccount | null
  documents: DocumentRecord[]
  returns: TaxReturn[]
  messages: Message[]
  prepStep: number
  questions: { id: string; prompt: string; answer?: string }[]
  vaultFilter: string
  entryPlan: EntryPlanLine[]
  entryPlanStatus: EntryPlanStatus
  preEntryNotes: PreEntryNote[]
  activeReturnId: string | null
  binderTab: 'docs' | 'forms' | 'notes'
  /** Working return profile for benefit engine + preparer return editor */
  taxProfile: import('../engine/benefitOptimizer').TaxpayerProfile
  benefitReport: BenefitSnapshot | null
  benefitReviewSigned: boolean
  /** Conversational AI Smart Tax Interview inside Prepare workflow */
  interviewChat: { id: string; role: 'assistant' | 'user' | 'system'; text: string; at: string }[]
  /** Confirmed questionnaire answers for visible history + edits */
  interviewAnswers: {
    id: string
    mapsTo: string
    prompt: string
    answer: string | number
    at: string
    /** Stable question id (same as mapsTo for engine keys) */
    questionId?: string
    tenantId?: string
    clientId?: string
    taxYear?: number
    returnId?: string | null
    benefitRuleId?: string
  }[]
  /** Jump target for question overview — next unanswered resume */
  interviewFocusMapsTo?: string | null
  auditEvents: AuditEvent[]
  uploadIssues: {
    kind: 'duplicate' | 'conflict' | 'missing'
    severity: 'high' | 'medium' | 'low'
    title: string
    detail: string
    docIds: string[]
  }[]
  /** Active billing tier for this session (TC / TP / Office) */
  accountTier?: 'TC' | 'TP' | 'Office'
  /**
   * Active Office subscription plan id (fees.ts OfficePlanId).
   * Preserved for existing agreements — catalog changes do not auto-migrate.
   */
  officePlanId?: string
  registrationPayments?: {
    id: string
    label: string
    amount: number
    tier: 'TC' | 'TP' | 'Office'
    at: string
    mode: 'test' | 'live'
  }[]
  /** Office staff rosters keyed by tenant — TP accounts never receive entries */
  officeStaff: OfficeStaffMember[]
  /** Document-first household identification workflow */
  householdIntake: import('../engine/documentIntakeEngine').HouseholdIntakeState
  /** Multi-year engagements in the active client order */
  multiYearEngagements: MultiYearEngagement[]
  /** Active tax year for prepare / vault focus */
  activeTaxYear: number
  /** Secure client upload invitations (TP / Office) */
  uploadInvites: import('../engine/secureUploadInvite').UploadInvite[]
  /** Client/preparer notification log (sandbox messaging) */
  clientNotifications: import('../engine/clientNotifications').ClientNotification[]
  /** Last pre-filing QA report */
  lastQaReport: import('../engine/qaEngine').QaReport | null
  /** Deterministic calculation audit trail */
  calcAuditTrail: import('../engine/calcAuditTrail').CalcAuditTrail | null
  /** Filing authorization captured after review */
  filingAuthorized: boolean
  /** Separate consents, signatures, and locked return version */
  filingAuth: import('../engine/filingAuthorizations').FilingAuthState | null
  /** Mandatory refund delivery selection (sanitized — no full account numbers) */
  refundDelivery: import('../engine/refundDelivery').RefundDeliverySelection | null
  /** Bank-product application status — offline until provider is live */
  bankProductApplication: import('../engine/bankProducts').BankProductApplication | null
  /** Sandbox refund settlement: virtual bank → fee split → client payout → email */
  refundSettlementCase: import('../engine/payments/phase10/refundSettlementPipeline').RefundSettlementCase | null
  /** Last sandbox transactional email id from settlement (deposit notice) */
  lastSettlementEmailId: string | null
  /** Additive office onboarding wizard draft */
  officeOnboarding: import('../engine/officeOnboarding').OfficeOnboardingDraft | null
  /** Engagement letters + §7216 consent lifecycle (additive) */
  engagementConsent: import('../engine/engagementConsent').EngagementConsentState | null
}
