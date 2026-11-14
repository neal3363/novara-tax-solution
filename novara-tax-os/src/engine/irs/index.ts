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

export { GOLDEN_FIXTURES } from './golden/fixtures'
export { runAllGoldenFixtures, runGoldenFixture } from './golden/runGolden'
export type {
  GoldenFixture,
  GoldenExpected,
  GoldenCheckResult,
  GoldenSuiteResult,
} from './golden/types'
export { ALL_FILING_STATUSES } from './golden/types'

export {
  DEFAULT_DUAL_RUN_FLAG,
  getDualRunFlag,
  setDualRunFlagForTests,
  resetDualRunFlag,
  runDualComparison,
  mayShowIrsToTaxpayer,
} from './dualRun'
export type { DualRunFlag, DualRunReport, DualRunLineDiff } from './dualRun'

export { CALCULATION_GAPS, formatGapInventory, gapsNeedingApproval, completedPhase4Forms } from './gaps/proposals'
export type { CalculationGap, GapStatus } from './gaps/proposals'
export {
  stubForm8962,
  stubForm8995A,
  stubForm8863,
  stubScheduleB,
  stubScheduleD,
  stubScheduleE,
  stubAmendedRecalc,
  ALL_STUBS,
} from './gaps/stubs'

export { MAXIMIZER_MIGRATION_STEPS, maximizerMigrationSummary } from './maximizerMigrationPlan'
export type { MigrationStep } from './maximizerMigrationPlan'

export { FORM_READINESS, getPhase4Params, applicableFigure } from './phase4Params'
export { computeForm8962 } from './forms/form8962'
export { computeForm8995A } from './forms/form8995A'
export { computeForm8863 } from './forms/form8863'
export { computeScheduleB } from './forms/scheduleB'
export { computeScheduleD } from './forms/scheduleD'
export { computeScheduleE } from './forms/scheduleE'
export { computeForm6251 } from './forms/form6251Amt'
export { computeForm8960 } from './forms/form8960Niit'
export { computeForm1040X } from './forms/form1040x'
export { PHASE4_GOLDEN_FIXTURES } from './golden/phase4Fixtures'
