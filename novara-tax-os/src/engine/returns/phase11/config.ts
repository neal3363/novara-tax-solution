/**
 * Phase 11 — State, business & amended returns (isolated staging).
 * STOP before production activation / live e-file / real taxpayer processing.
 */

export const PHASE11_VERSION = 'phase11-returns-2025.1'

export interface Phase11Flags {
  /** Enable isolated state calc modules for staging tests */
  stateModulesEnabled: boolean
  /** Enable isolated business return modules */
  businessModulesEnabled: boolean
  /** Enable isolated amended / 1040-X extensions */
  amendedModulesEnabled: boolean
  /** Isolated AI recognition adapters (do not wire to interview) */
  aiAdaptersEnabled: boolean
  /** HARD LOCK — never process real taxpayer returns from this module */
  processRealTaxpayerReturns: false
  /** HARD LOCK — never enable live IRS filing */
  liveIrsFiling: false
  /** HARD LOCK — never enable business e-file without IRS schema auth */
  liveBusinessEfile: false
  /** HARD LOCK — never claim nationwide state filing */
  nationwideStateFiling: false
  /** HARD LOCK — keep payment/banking live OFF */
  livePayments: false
  liveBankingPartner: false
  /** HARD LOCK — IRS calc cutover OFF */
  activateIrsCalcEngine: false
  /** HARD LOCK — production security enforcement OFF */
  productionSecurityEnforcement: false
  /** HARD LOCK — do not modify taxpayer interview / Maximizer */
  wireAiToInterview: false
  wireToRefundMaximizer: false
}

export const DEFAULT_PHASE11_FLAGS: Phase11Flags = {
  stateModulesEnabled: true,
  businessModulesEnabled: true,
  amendedModulesEnabled: true,
  aiAdaptersEnabled: true,
  processRealTaxpayerReturns: false,
  liveIrsFiling: false,
  liveBusinessEfile: false,
  nationwideStateFiling: false,
  livePayments: false,
  liveBankingPartner: false,
  activateIrsCalcEngine: false,
  productionSecurityEnforcement: false,
  wireAiToInterview: false,
  wireToRefundMaximizer: false,
}

let flags: Phase11Flags = { ...DEFAULT_PHASE11_FLAGS }

export function getPhase11Flags(): Phase11Flags {
  return { ...flags }
}

export function setPhase11FlagsForTests(patch: Partial<Phase11Flags>): Phase11Flags {
  const next = { ...flags, ...patch }
  next.processRealTaxpayerReturns = false
  next.liveIrsFiling = false
  next.liveBusinessEfile = false
  next.nationwideStateFiling = false
  next.livePayments = false
  next.liveBankingPartner = false
  next.activateIrsCalcEngine = false
  next.productionSecurityEnforcement = false
  next.wireAiToInterview = false
  next.wireToRefundMaximizer = false
  flags = next
  return getPhase11Flags()
}

export function resetPhase11Flags(): void {
  flags = { ...DEFAULT_PHASE11_FLAGS }
}

export function assertNoProductionActivation(): void {
  if (flags.processRealTaxpayerReturns) {
    throw new Error('Phase 11 STOP: processRealTaxpayerReturns must remain false')
  }
  if (flags.liveIrsFiling || flags.liveBusinessEfile) {
    throw new Error('Phase 11 STOP: live filing must remain false')
  }
  if (flags.nationwideStateFiling) {
    throw new Error('Phase 11 STOP: nationwideStateFiling must remain false')
  }
  if (flags.wireAiToInterview || flags.wireToRefundMaximizer) {
    throw new Error('Phase 11 STOP: AI adapters must not wire to interview/Maximizer')
  }
}
