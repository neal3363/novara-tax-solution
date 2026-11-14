/**
 * Phase 12 — Final system integration, security, compliance & launch readiness.
 * STOP before production activation.
 */

export {
  PHASE12_VERSION,
  DEFAULT_PHASE12_FLAGS,
  getPhase12Flags,
  setPhase12FlagsForTests,
  resetPhase12Flags,
  assertNoProductionActivation,
} from './config'
export type { Phase12Flags } from './config'

export {
  PHASE12_TAX_GAPS,
  evaluateFilingReadinessBlocks,
  assertNoSilentVerifiedFiling,
} from './gapBlockers'
export type { TaxAccuracyGap, FilingBlockDecision, SituationFlags } from './gapBlockers'

export { runStagingEndToEndWorkflow } from './workflow'
export type { StagingE2EResult, WorkflowStepResult, WorkflowStepStatus } from './workflow'

export { assessSecurityArchitecture } from './securityAssessment'
export type { SecurityAssessmentResult, SecurityFinding } from './securityAssessment'

export { buildDeploymentChecklist } from './deploymentChecklist'
export type { DeploymentPrepResult, DeploymentChecklistItem } from './deploymentChecklist'

export { buildLaunchReadinessReport, finalReleaseGate } from './readiness'
export type { LaunchReadinessReport, GoNoGo } from './readiness'

import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRICING } from '../../../data/fees'
import {
  PHASE12_VERSION,
  getPhase12Flags,
  resetPhase12Flags,
  assertNoProductionActivation,
} from './config'
import { resetStripeSandboxForTests } from '../../payments/phase10/stripeSandbox'
import { resetPhase10ForTests } from '../../payments/phase10'
import { resetPhase11ForTests } from '../../returns/phase11'

export function assertApprovedPricingIntact(): {
  ok: boolean
  tcPersonal: number
  tcBusiness: number
} {
  const ok =
    TC_PERSONAL_FEE === 300 &&
    TC_BUSINESS_FEE === 399 &&
    PRICING.TP.registration === 0 &&
    PRICING.TP.personalReturn === 89 &&
    PRICING.Office.plans.personal.annual === 899 &&
    PRICING.Office.plans.business.annual === 1499
  return { ok, tcPersonal: TC_PERSONAL_FEE, tcBusiness: TC_BUSINESS_FEE }
}

export function resetPhase12ForTests(): void {
  resetPhase12Flags()
  resetPhase10ForTests()
  resetPhase11ForTests()
  resetStripeSandboxForTests()
}

export function phase12Summary(): string {
  const f = getPhase12Flags()
  const pricing = assertApprovedPricingIntact()
  assertNoProductionActivation()
  return [
    'NOVARA Phase 12 launch readiness (staging integration only)',
    `version=${PHASE12_VERSION}`,
    `stagingE2eEnabled=${f.stagingE2eEnabled}`,
    `productionReady=false`,
    `liveIrsFiling=${f.liveIrsFiling}`,
    `livePayments=${f.livePayments}`,
    `humanLaunchApprovalRequired=${f.humanLaunchApprovalRequired}`,
    `tcPersonal=${pricing.tcPersonal}`,
    `tcBusiness=${pricing.tcBusiness}`,
    'STOP before production activation.',
  ].join('\n')
}
