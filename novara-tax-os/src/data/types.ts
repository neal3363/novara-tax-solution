export type Role = 'taxpayer' | 'preparer' | 'efin_owner' | 'admin'

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
  ptin?: string
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
  isBusiness: boolean
  feeSnapshot: { label: string; amount: number; status: string }[]
  updatedAt: string
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
    explanation: string
    missingAnswers: string[]
    missingDocs: string[]
    ruleCitation: string
  }[]
  lastRunAt: string
  /** Plain-language explanation of the latest recalculation */
  lastChangeNote?: string
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
  }[]
  auditEvents: AuditEvent[]
  uploadIssues: {
    kind: 'duplicate' | 'conflict' | 'missing'
    severity: 'high' | 'medium' | 'low'
    title: string
    detail: string
    docIds: string[]
  }[]
}
