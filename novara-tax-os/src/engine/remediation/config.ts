/**
 * Production readiness remediation flags.
 * All live / enforcement switches remain hard-OFF until human approval.
 */

export const REMEDIATION_VERSION = 'remediation-2025.1'

export interface RemediationFlags {
  passwordResetEnabled: boolean
  rateLimitEnabled: boolean
  csrfProtectionEnabled: boolean
  xssSanitizeEnabled: boolean
  backupRestoreSimulationEnabled: boolean
  /** HARD LOCKS */
  productionEnforcement: false
  liveIrsFiling: false
  livePayments: false
  liveBankingPartner: false
  activateIrsCalcEngine: false
  processRealTaxpayerReturns: false
}

export const DEFAULT_REMEDIATION_FLAGS: RemediationFlags = {
  passwordResetEnabled: true,
  rateLimitEnabled: true,
  csrfProtectionEnabled: true,
  xssSanitizeEnabled: true,
  backupRestoreSimulationEnabled: true,
  productionEnforcement: false,
  liveIrsFiling: false,
  livePayments: false,
  liveBankingPartner: false,
  activateIrsCalcEngine: false,
  processRealTaxpayerReturns: false,
}

let flags: RemediationFlags = { ...DEFAULT_REMEDIATION_FLAGS }

export function getRemediationFlags(): RemediationFlags {
  return { ...flags }
}

export function setRemediationFlagsForTests(patch: Partial<RemediationFlags>): RemediationFlags {
  const next = { ...flags, ...patch }
  next.productionEnforcement = false
  next.liveIrsFiling = false
  next.livePayments = false
  next.liveBankingPartner = false
  next.activateIrsCalcEngine = false
  next.processRealTaxpayerReturns = false
  flags = next
  return getRemediationFlags()
}

export function resetRemediationFlags(): void {
  flags = { ...DEFAULT_REMEDIATION_FLAGS }
}

export function assertRemediationStagingOnly(): void {
  if (flags.productionEnforcement || flags.processRealTaxpayerReturns) {
    throw new Error('Remediation STOP: production/real-taxpayer processing must remain false')
  }
  if (flags.liveIrsFiling || flags.livePayments || flags.liveBankingPartner) {
    throw new Error('Remediation STOP: live integrations must remain false')
  }
}
