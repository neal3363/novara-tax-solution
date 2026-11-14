export {
  REMEDIATION_VERSION,
  DEFAULT_REMEDIATION_FLAGS,
  getRemediationFlags,
  setRemediationFlagsForTests,
  resetRemediationFlags,
  assertRemediationStagingOnly,
} from './config'
export type { RemediationFlags } from './config'

export * from './security/index'

export {
  buildMefReadinessChecklist,
  mefReadinessSummary,
  MEF_EXTERNAL_CERTIFICATION_STEPS,
} from './mefReadiness'
export type { MefReadinessItem } from './mefReadiness'

export {
  buildPaymentsReadinessChecklist,
  paymentsReadinessSummary,
  PAYMENTS_EXTERNAL_ACTIVATION_STEPS,
} from './paymentsReadiness'
export type { PaymentsReadinessItem } from './paymentsReadiness'

export { buildRecoveryChecklist } from './recoveryReadiness'
export type { RecoveryItem } from './recoveryReadiness'

export { assertDemoSafetyLocks, publicDemoStatusPayload } from './publicDemoSafety'

import { REMEDIATION_VERSION, getRemediationFlags, resetRemediationFlags, assertRemediationStagingOnly } from './config'
import { resetSecurityRemediationForTests } from './security/index'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../../data/fees'

export function resetRemediationForTests(): void {
  resetRemediationFlags()
  resetSecurityRemediationForTests()
}

export function assertApprovedPricingIntact(): { ok: boolean; tcPersonal: number; tcBusiness: number } {
  const ok = TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399
  return { ok, tcPersonal: TC_PERSONAL_FEE, tcBusiness: TC_BUSINESS_FEE }
}

export function remediationSummary(): string {
  const f = getRemediationFlags()
  assertRemediationStagingOnly()
  const p = assertApprovedPricingIntact()
  return [
    'NOVARA production-readiness remediation (staging)',
    `version=${REMEDIATION_VERSION}`,
    `passwordResetEnabled=${f.passwordResetEnabled}`,
    `rateLimitEnabled=${f.rateLimitEnabled}`,
    `productionEnforcement=${f.productionEnforcement}`,
    `liveIrsFiling=${f.liveIrsFiling}`,
    `livePayments=${f.livePayments}`,
    `tcPersonal=${p.tcPersonal}`,
    `tcBusiness=${p.tcBusiness}`,
    'STOP before production enforcement / live integrations.',
  ].join('\n')
}
