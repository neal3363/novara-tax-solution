/**
 * Phase 9 staging IRS ↔ Maximizer integration flags.
 * Production cutover and taxpayer-visible IRS results remain hard-OFF.
 */

export const PHASE9_VERSION = 'phase9-staging-2025.1'

export interface Phase9StagingFlags {
  /** Enable staging adapter / dual-run for synthetic profiles */
  stagingIntegrationEnabled: boolean
  /** HARD LOCK — never show IRS engine numbers in taxpayer UI */
  showIrsInProductionUi: false
  /** HARD LOCK — never activate production cutover from this module */
  activateCutover: false
  /** HARD LOCK — results stay internal/staging */
  taxpayerVisible: false
  /** Keep demo benefitOptimizer available for rollback */
  demoEngineAvailable: true
  /** Live IRS filing remains disabled (Phase 8) */
  liveIrsFiling: false
  /** Production security enforcement remains disabled (Phase 7) */
  productionSecurityEnforcement: false
}

export const DEFAULT_PHASE9_FLAGS: Phase9StagingFlags = {
  stagingIntegrationEnabled: true,
  showIrsInProductionUi: false,
  activateCutover: false,
  taxpayerVisible: false,
  demoEngineAvailable: true,
  liveIrsFiling: false,
  productionSecurityEnforcement: false,
}

let flags: Phase9StagingFlags = { ...DEFAULT_PHASE9_FLAGS }

export function getPhase9Flags(): Phase9StagingFlags {
  return { ...flags }
}

export function setPhase9FlagsForTests(patch: Partial<Phase9StagingFlags>): Phase9StagingFlags {
  const next = { ...flags, ...patch }
  next.showIrsInProductionUi = false
  next.activateCutover = false
  next.taxpayerVisible = false
  next.demoEngineAvailable = true
  next.liveIrsFiling = false
  next.productionSecurityEnforcement = false
  flags = next
  return getPhase9Flags()
}

export function resetPhase9Flags(): void {
  flags = { ...DEFAULT_PHASE9_FLAGS }
}

export function assertNoProductionCutover(): void {
  if (flags.activateCutover) {
    throw new Error('Phase 9 STOP: activateCutover must remain false')
  }
  if (flags.showIrsInProductionUi || flags.taxpayerVisible) {
    throw new Error('Phase 9 STOP: IRS results must not be taxpayer-visible')
  }
}
