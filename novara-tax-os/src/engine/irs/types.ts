/**
 * Isolated IRS-based federal return types.
 * Not connected to benefitOptimizer / UI until migration approval.
 */

export type IrsFilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss'

export interface TaxBracket {
  /** Inclusive upper bound of taxable income for this rate band */
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
  /** Form 8995-A inputs — when present, complex QBI path is used */
  qbiW2Wages?: number
  qbiUbia?: number
  qbiIsSstb?: boolean
  qbiReitPtp?: number
  itemizedDeductions?: {
    mortgageInterest?: number
    stateLocalTaxes?: number
    charitable?: number
    medical?: number
  }
  childcareExpenses?: number
  dependents?: IrsDependentInput[]
  /** Marketplace coverage — triggers Form 8962 when premiums/SLCSP provided */
  marketplaceCoverage?: boolean
  annualPremium?: number
  /** SLCSP benchmark (annual); preferred over treating premium as SLCSP */
  annualSlcsp?: number
  aptcReceived?: number
  householdIncomeForPtc?: number
  householdSize?: number
  /** Monthly 1095-A style rows for Form 8962 */
  marketplaceMonths?: { enrollmentPremium: number; slcsp: number; months?: number }[]
  investmentIncome?: number
  educatorExpenses?: number
  studentLoanInterest?: number
  businessMiles?: number
  /** Schedule B */
  taxableInterest?: number
  taxExemptInterest?: number
  ordinaryDividends?: number
  qualifiedDividends?: number
  foreignAccounts?: boolean
  /** Schedule D */
  shortTermCapitalGainLoss?: number
  longTermCapitalGainLoss?: number
  shortTermCapitalLossCarryover?: number
  longTermCapitalLossCarryover?: number
  /** Schedule E */
  rentalIncome?: number
  rentalExpenses?: number
  rentalActivelyParticipating?: boolean
  royaltyIncome?: number
  k1OrdinaryIncome?: number
  /** Form 8863 */
  educationStudents?: {
    creditType: 'aotc' | 'llc'
    qualifiedExpenses: number
    eligible: boolean
  }[]
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
  /** Form 6251 AMT */
  amt: number
  /** Form 8960 NIIT */
  niit: number
  totalTaxBeforeCredits: number
  nonrefundableCredits: number
  refundableCredits: number
  ctc: number
  actc: number
  odc: number
  eitc: number
  cdcc: number
  ptc: number
  /** Excess APTC additional tax (Form 8962) */
  excessAptcRepayment: number
  educationNonrefundable: number
  educationRefundable: number
  scheduleBInterestDividends: number
  scheduleDNet: number
  scheduleENet: number
  taxAfterCredits: number
  totalPayments: number
  refundOrBalanceDue: number
  notes: string[]
  limitations: string[]
  formReadiness: Record<string, string>
}
