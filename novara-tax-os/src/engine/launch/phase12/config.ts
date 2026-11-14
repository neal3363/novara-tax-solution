/**
 * Phase 12 — Final system integration & launch readiness (staging only).
 * STOP before production activation.
 */

export const PHASE12_VERSION = 'phase12-launch-2025.1'

export interface Phase12Flags {
  /** Enable staging end-to-end integration harness */
  stagingE2eEnabled: boolean
  /** Enable launch-readiness assessment (does not authorize launch) */
  readinessAssessmentEnabled: boolean
  /** HARD LOCK — never process real taxpayer returns */
  processRealTaxpayerReturns: false
  /** HARD LOCK — never enable live IRS filing */
  liveIrsFiling: false
  /** HARD LOCK — never enable live payments */
  livePayments: false
  /** HARD LOCK — never enable live banking */
  liveBankingPartner: false
  /** HARD LOCK — never activate IRS calc cutover */
  activateIrsCalcEngine: false
  /** HARD LOCK — never enable production security enforcement from this module */
  productionSecurityEnforcement: false
  /** HARD LOCK — never claim nationwide state filing */
  nationwideStateFiling: false
  /** HARD LOCK — never enable live business e-file */
  liveBusinessEfile: false
  /** HARD LOCK — never auto-declare production-ready */
  autoDeclareProductionReady: false
  /** HARD LOCK — human launch approval required */
  humanLaunchApprovalRequired: true
}

export const DEFAULT_PHASE12_FLAGS: Phase12Flags = {
  stagingE2eEnabled: true,
  readinessAssessmentEnabled: true,
  processRealTaxpayerReturns: false,
  liveIrsFiling: false,
  livePayments: false,
  liveBankingPartner: false,
  activateIrsCalcEngine: false,
  productionSecurityEnforcement: false,
  nationwideStateFiling: false,
  liveBusinessEfile: false,
  autoDeclareProductionReady: false,
  humanLaunchApprovalRequired: true,
}

let flags: Phase12Flags = { ...DEFAULT_PHASE12_FLAGS }

export function getPhase12Flags(): Phase12Flags {
  return { ...flags }
}

export function setPhase12FlagsForTests(patch: Partial<Phase12Flags>): Phase12Flags {
  const next = { ...flags, ...patch }
  next.processRealTaxpayerReturns = false
  next.liveIrsFiling = false
  next.livePayments = false
  next.liveBankingPartner = false
  next.activateIrsCalcEngine = false
  next.productionSecurityEnforcement = false
  next.nationwideStateFiling = false
  next.liveBusinessEfile = false
  next.autoDeclareProductionReady = false
  next.humanLaunchApprovalRequired = true
  flags = next
  return getPhase12Flags()
}

export function resetPhase12Flags(): void {
  flags = { ...DEFAULT_PHASE12_FLAGS }
}

export function assertNoProductionActivation(): void {
  if (flags.processRealTaxpayerReturns) {
    throw new Error('Phase 12 STOP: processRealTaxpayerReturns must remain false')
  }
  if (flags.liveIrsFiling || flags.livePayments || flags.liveBankingPartner) {
    throw new Error('Phase 12 STOP: live integrations must remain false')
  }
  if (flags.activateIrsCalcEngine || flags.productionSecurityEnforcement) {
    throw new Error('Phase 12 STOP: cutover/enforcement must remain false')
  }
  if (flags.autoDeclareProductionReady) {
    throw new Error('Phase 12 STOP: autoDeclareProductionReady must remain false')
  }
}
