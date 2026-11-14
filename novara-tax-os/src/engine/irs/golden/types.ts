/**
 * Golden fixture types — expected values are independently derived from IRS
 * tables/worksheets and must NEVER be copied from computeIrsFederalReturn output.
 */

import type { IrsFilingStatus, IrsReturnInput } from '../types'

export interface GoldenExpected {
  agi: number
  standardDeduction: number
  taxableIncome: number
  incomeTaxBeforeCredits: number
  seTax?: number
  ctcNonrefundable?: number
  actc?: number
  eitc?: number
  cdcc?: number
  qbiDeduction?: number
  ptc?: number
  excessAptcRepayment?: number
  educationNonrefundable?: number
  educationRefundable?: number
  amt?: number
  niit?: number
  scheduleBInterestDividends?: number
  scheduleDNet?: number
  scheduleENet?: number
  suspendedPassiveLoss?: number
  unrecaptured1250Applied?: number
  collectibles28Applied?: number
  refundOrBalanceDue: number
}

export interface GoldenFixture {
  id: string
  taxYear: number
  label: string
  /** Exact IRS source used to derive expected values */
  source: string
  /** Human worksheet steps used to compute expected (independent of engine) */
  derivation: string[]
  input: IrsReturnInput
  expected: GoldenExpected
  /** Optional tolerance for rounding-only differences */
  tolerance?: number
}

export type GoldenCheckField = keyof GoldenExpected

export interface GoldenCheckResult {
  fixtureId: string
  field: string
  expected: number
  actual: number
  pass: boolean
  delta: number
}

export interface GoldenSuiteResult {
  passed: number
  failed: number
  results: GoldenCheckResult[]
  fixtureSummaries: { id: string; label: string; allPass: boolean }[]
}

export const ALL_FILING_STATUSES: IrsFilingStatus[] = ['single', 'mfj', 'mfs', 'hoh', 'qss']
