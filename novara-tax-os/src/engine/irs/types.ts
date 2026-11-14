/**
 * Isolated IRS-based federal return types.
 * Not connected to benefitOptimizer / UI until migration approval.
 */

export type IrsFilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss'

export interface TaxBracket {
  /** Inclusive lower bound of taxable income for this rate */
  upTo: number
  rate: number
}

export interface YearTaxTables {
  taxYear: number
  standardDeduction: Record<IrsFilingStatus, number>
  brackets: Record<IrsFilingStatus, TaxBracket[]>
  /** Social Security wage base for SE/FICA themes */
  ssWageBase: number
  ctcPerChild: number
  actcMaxPerChild: number
  odcPerDependent: number
  /** EITC max credit by qualifying children 0–3+ */
  eitcMaxCredit: [number, number, number, number]
  /** EITC earned-income amount where credit is fully phased in (approx table anchors) */
  eitcEarnedIncomeAmount: [number, number, number, number]
  /** EITC phaseout begin (thresholds vary by FS — MFJ often higher; simplified dual track) */
  eitcPhaseoutBegin: { notMfj: [number, number, number, number]; mfj: [number, number, number, number] }
  eitcPhaseoutRate: [number, number, number, number]
  eitcInvestmentIncomeLimit: number
  cdccExpenseLimitOne: number
  cdccExpenseLimitTwoPlus: number
  /** AGI thresholds for CDCC rate steps (35% down to 20%) — Form 2441 */
  cdccAgiRateSteps: { agiBelow: number; rate: number }[]
  qbiDeductionRate: number
  qbiThreshold: Record<'singleLike' | 'mfj', number>
  studentLoanMax: number
  saltCap: number
  mileageRate: number
  hsaLimitSelfOnly: number
  educatorExpenseMax: number
}

export interface IrsDependentInput {
  qualifiesCtc: boolean
  qualifiesOdc: boolean
  qualifiesEitcChild: boolean
  qualifiesCdcc: boolean
}

export interface IrsReturnInput {
  taxYear: number
  filingStatus: IrsFilingStatus
  wages: number
  withholding: number
  selfEmploymentNetProfit: number
  /** Qualified business income after SE adjustments (simplified) */
  qbiAmount?: number
  itemizedDeductions?: {
    mortgageInterest?: number
    stateLocalTaxes?: number
    charitable?: number
    medical?: number
    /** Medical AGI floor applied inside calculator */
  }
  childcareExpenses?: number
  dependents?: IrsDependentInput[]
  /** Marketplace coverage — triggers simplified PTC estimate when APTC/premiums provided */
  marketplaceCoverage?: boolean
  annualPremium?: number
  aptcReceived?: number
  householdIncomeForPtc?: number
  investmentIncome?: number
  educatorExpenses?: number
  studentLoanInterest?: number
  businessMiles?: number
}

export interface IrsReturnResult {
  engine: 'irs-isolated'
  taxYear: number
  filingStatus: IrsFilingStatus
  sources: string[]
  agi: number
  standardDeduction: number
  itemizedDeduction: number
  deductionTaken: number
  usedItemized: boolean
  qbiDeduction: number
  taxableIncome: number
  incomeTaxBeforeCredits: number
  seTax: number
  totalTaxBeforeCredits: number
  nonrefundableCredits: number
  refundableCredits: number
  ctc: number
  actc: number
  odc: number
  eitc: number
  cdcc: number
  ptc: number
  taxAfterCredits: number
  totalPayments: number
  refundOrBalanceDue: number
  notes: string[]
  limitations: string[]
}
