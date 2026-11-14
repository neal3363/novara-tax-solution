/**
 * Phase 10 payment / banking flags.
 * Live payments and live banking partners remain hard-OFF until separately approved.
 */

export const PHASE10_VERSION = 'phase10-payments-2025.1'

export interface Phase10PaymentFlags {
  /** Enable sandbox Stripe adapter for staging tests */
  sandboxStripeEnabled: boolean
  /** Enable offline banking adapter framework */
  bankingAdapterEnabled: boolean
  /** HARD LOCK — never collect real money from this module */
  livePayments: false
  /** HARD LOCK — never claim a live banking partner without agreement */
  liveBankingPartner: false
  /** HARD LOCK — keep MeF live filing off */
  liveIrsFiling: false
  /** HARD LOCK — keep IRS calc cutover off */
  activateIrsCalcEngine: false
  /** HARD LOCK — production security enforcement off */
  productionSecurityEnforcement: false
}

export const DEFAULT_PHASE10_FLAGS: Phase10PaymentFlags = {
  sandboxStripeEnabled: true,
  bankingAdapterEnabled: true,
  livePayments: false,
  liveBankingPartner: false,
  liveIrsFiling: false,
  activateIrsCalcEngine: false,
  productionSecurityEnforcement: false,
}

let flags: Phase10PaymentFlags = { ...DEFAULT_PHASE10_FLAGS }

export function getPhase10Flags(): Phase10PaymentFlags {
  return { ...flags }
}

export function setPhase10FlagsForTests(patch: Partial<Phase10PaymentFlags>): Phase10PaymentFlags {
  const next = { ...flags, ...patch }
  next.livePayments = false
  next.liveBankingPartner = false
  next.liveIrsFiling = false
  next.activateIrsCalcEngine = false
  next.productionSecurityEnforcement = false
  flags = next
  return getPhase10Flags()
}

export function resetPhase10Flags(): void {
  flags = { ...DEFAULT_PHASE10_FLAGS }
}

export function assertNoLivePayments(): void {
  if (flags.livePayments) {
    throw new Error('Phase 10 STOP: livePayments must remain false')
  }
  if (flags.liveBankingPartner) {
    throw new Error('Phase 10 STOP: liveBankingPartner must remain false')
  }
}
