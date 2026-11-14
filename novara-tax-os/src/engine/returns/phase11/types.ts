/** Shared Phase 11 types — isolated staging only. */

export type StateCode =
  | 'TX'
  | 'FL'
  | 'CA'
  | 'NY'
  | 'IL'
  | 'OTHER'
  | string

export type ResidencyStatus = 'resident' | 'nonresident' | 'part_year'

export type StateValidationStatus =
  | 'validated_no_income_tax'
  | 'staging_validated'
  | 'unsupported'

export interface StateBracket {
  upTo: number
  rate: number
}

export interface StateYearTables {
  taxYear: number
  stateCode: StateCode
  stateName: string
  hasPersonalIncomeTax: boolean
  standardDeduction: { single: number; mfj: number; mfs: number; hoh: number }
  brackets: { single: StateBracket[]; mfj: StateBracket[] }
  personalExemption?: number
  credits?: { id: string; label: string; maxAmount: number }[]
  sources: string[]
  validationStatus: StateValidationStatus
  notes: string[]
}

export type FilingStatusLite = 'single' | 'mfj' | 'mfs' | 'hoh'

export interface StateReturnInput {
  taxYear: number
  stateCode: StateCode
  filingStatus: FilingStatusLite
  residency: ResidencyStatus
  /** Months resident in state (part-year) */
  monthsResident?: number
  federalAgi: number
  wagesInState: number
  wagesOutOfState: number
  otherIncomeInState?: number
  stateWithholding: number
  itemizedOrStandard?: 'standard' | 'itemized'
  itemizedDeductions?: number
  claimedCredits?: { id: string; amount: number }[]
}

export interface StateReturnResult {
  stateCode: StateCode
  taxYear: number
  validationStatus: StateValidationStatus
  residency: ResidencyStatus
  allocatedStateIncome: number
  taxableIncome: number
  taxBeforeCredits: number
  credits: number
  taxAfterCredits: number
  withholding: number
  refundOrBalanceDue: number
  multiStateAllocation?: {
    inStateRatio: number
    inStateIncome: number
    outOfStateIncome: number
  }
  unsupportedReasons: string[]
  notes: string[]
  sources: string[]
  productionReady: false
  nationwideClaim: false
}

export interface BusinessPartner {
  id: string
  name: string
  ownershipPercent: number
  isGeneralPartner?: boolean
}

export interface BusinessShareholder {
  id: string
  name: string
  ownershipPercent: number
  stockBasis?: number
}

export interface BusinessReturnInput {
  taxYear: number
  entityName: string
  einSynthetic: string
  grossReceipts: number
  costOfGoodsSold?: number
  ordinaryExpenses: number
  depreciationExpense?: number
  section179Expense?: number
  businessCredits?: number
  estimatedPayments?: number
  partners?: BusinessPartner[]
  shareholders?: BusinessShareholder[]
  /** C-corp only */
  taxableIncomeOverride?: number
}

export interface ScheduleK1Line {
  box: string
  label: string
  amount: number
}

export interface ScheduleK1 {
  form: 'Schedule K-1 (Form 1065)' | 'Schedule K-1 (Form 1120-S)'
  partnerOrShareholderId: string
  name: string
  ownershipPercent: number
  ordinaryBusinessIncome: number
  lines: ScheduleK1Line[]
  productionReady: false
}

export interface BusinessReturnResult {
  form: 'Form 1065' | 'Form 1120-S' | 'Form 1120'
  taxYear: number
  ordinaryBusinessIncome: number
  taxableIncome?: number
  entityTax?: number
  estimatedTax?: number
  refundOrBalanceDue?: number
  depreciationAllowed: number
  businessCreditsApplied: number
  k1s: ScheduleK1[]
  schedules: string[]
  notes: string[]
  sources: string[]
  productionReady: false
  liveEfile: false
}

export interface AmendedAuthorization {
  taxpayerAuthorized: boolean
  authorizedAt?: string
  authorizedByPrincipalId?: string
  method?: 'esign' | 'wet_signature' | 'verbal_recorded' | 'staging_synthetic'
}

export interface AmendedAuditEntry {
  id: string
  at: string
  actorId: string
  action: string
  detail: Record<string, unknown>
}
