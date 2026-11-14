/**
 * Isolated IRS federal calculation package (TY2022–2025).
 * Do not import into benefitOptimizer / UI until migration is approved.
 */

export { IRS_SOURCES, sourcesForYear } from './sources'
export { TABLES_2022 } from './tables2022'
export { TABLES_2023 } from './tables2023'
export { TABLES_2024 } from './tables2024'
export { TABLES_2025 } from './tables2025'
export {
  computeIrsFederalReturn,
  getYearTables,
  supportedIrsTaxYears,
  taxFromBrackets,
  mapFilingStatus,
} from './federalReturn'
export type {
  IrsFilingStatus,
  IrsReturnInput,
  IrsReturnResult,
  IrsDependentInput,
  YearTaxTables,
  TaxBracket,
} from './types'

export {
  compareDemoToIrs,
  sampleProfilesForComparison,
  runDemoIrsComparisonReport,
  profileToIrsInput,
} from './compareDemo'
export type { DemoIrsComparison } from './compareDemo'
