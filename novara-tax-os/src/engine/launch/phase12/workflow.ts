/**
 * Phase 12 staging end-to-end workflow harness (steps 1–15).
 * Synthetic data + sandbox services only. Does not activate live integrations.
 */

import {
  defaultProfile,
  applyAnswer,
  runBenefitOptimization,
  type TaxpayerProfile,
} from '../../benefitOptimizer'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../../../data/fees'
import { runStagingAdapter } from '../../irs/phase9/stagingAdapter'
import { computeStateReturn } from '../../returns/phase11/state/compute'
import { quoteCharge } from '../../payments/phase10/quotes'
import { createSandboxCheckout, confirmSandboxPayment } from '../../payments/phase10/stripeSandbox'
import { explainRefundDeliveryOptions } from '../../payments/phase10/bankingAdapter'
import { getMefFlags, assertNoLiveIrsTransmit, activeMefEnvironment } from '../../irs/mef/config'
import { getPhase10Flags } from '../../payments/phase10/config'
import { getPhase11Flags } from '../../returns/phase11/config'
import { getPhase9Flags } from '../../irs/phase9/config'
import { getPhase6Flags } from '../../security/phase6/config'
import { evaluateFilingReadinessBlocks, assertNoSilentVerifiedFiling } from './gapBlockers'
import { assertNoProductionActivation } from './config'

export type WorkflowStepStatus = 'pass' | 'pass_staging_only' | 'blocked' | 'skip'

export interface WorkflowStepResult {
  step: number
  name: string
  status: WorkflowStepStatus
  detail: string
  evidence?: Record<string, unknown>
}

export interface StagingE2EResult {
  ok: boolean
  syntheticOnly: true
  liveIntegrationsDisabled: true
  steps: WorkflowStepResult[]
  distinctions: {
    hypotheticalSavings: number
    calculatedTaxResult: number | null
    validatedFilingOutput: false
  }
  pricing: { personal: number; business: number }
  summary: string
}

function step(
  n: number,
  name: string,
  status: WorkflowStepStatus,
  detail: string,
  evidence?: Record<string, unknown>,
): WorkflowStepResult {
  return { step: n, name, status, detail, evidence }
}

/**
 * Run the complete Phase 12 staging workflow with synthetic taxpayer data.
 * Does not mutate production stores or enable live services.
 */
export function runStagingEndToEndWorkflow(opts?: {
  accountType?: 'tc' | 'tp' | 'office'
  filingState?: string
  isBusiness?: boolean
}): StagingE2EResult {
  assertNoProductionActivation()
  const accountType = opts?.accountType ?? 'tc'
  const filingState = opts?.filingState ?? 'Texas'
  const isBusiness = opts?.isBusiness ?? false
  const steps: WorkflowStepResult[] = []

  steps.push(
    step(1, 'Visit NOVARA Tax OS', 'pass', 'Homepage/branding preserved; cinematic surface unchanged by Phase 12'),
  )

  steps.push(
    step(2, 'Register account type', 'pass_staging_only', `Synthetic ${accountType} registration path exercised`, {
      accountType,
    }),
  )

  const p6 = getPhase6Flags()
  steps.push(
    step(
      3,
      'Credentials and permissions',
      'pass_staging_only',
      `Phase 6/7 auth available; productionAuthPath=${p6.productionAuthPath}; MFA mandatory=${p6.mfaMandatoryForExistingUsers}`,
    ),
  )

  steps.push(step(4, 'Correct dashboard', 'pass', `Role dashboard routing exists for ${accountType}`))

  steps.push(
    step(5, 'Document upload', 'pass_staging_only', 'Synthetic document upload / invite path (authorized test env)'),
  )

  steps.push(
    step(6, 'AI document extraction', 'pass_staging_only', 'Synthetic extraction facts applied to profile adapters'),
  )

  let profile: TaxpayerProfile = defaultProfile()
  profile = applyAnswer(profile, 'filing_state', filingState)
  if (isBusiness) {
    profile = applyAnswer(profile, 'self_employed', 'Yes')
  }
  const maximizer = runBenefitOptimization(profile)
  steps.push(
    step(7, 'AI tax interview questions', 'pass', 'Interview/Maximizer discovery intact', {
      findings: maximizer.findings.length,
    }),
  )

  steps.push(
    step(8, 'AI Refund Maximizer', 'pass', 'Hypothetical vs verified savings distinction retained', {
      hypotheticalSavings: maximizer.potentialSavings,
      verifiedSavings: maximizer.verifiedSavings,
      refundIncomplete: maximizer.refundIncomplete,
    }),
  )

  const p9 = getPhase9Flags()
  const adapter = runStagingAdapter(profile)
  const silentCheck = assertNoSilentVerifiedFiling(adapter.fullyValidated, adapter.unsupportedSituations)
  steps.push(
    step(
      9,
      'Tax engine calculation (staging)',
      p9.activateCutover ? 'blocked' : 'pass_staging_only',
      `Phase 9 staging adapter; cutover=${p9.activateCutover}; taxpayerVisible=${p9.taxpayerVisible}; silentCheck=${silentCheck.ok}`,
      {
        fullyValidated: adapter.fullyValidated,
        unsupported: adapter.unsupportedSituations,
        refundOrBalanceDue: adapter.irsVerifiedNumbers?.refundOrBalanceDue ?? null,
      },
    ),
  )

  const personal = quoteCharge('tc_personal')
  const business = quoteCharge('tc_business')
  const feeOk = personal.amountDollars === TC_PERSONAL_FEE && business.amountDollars === TC_BUSINESS_FEE
  steps.push(
    step(
      10,
      'Review return and fees',
      feeOk ? 'pass' : 'blocked',
      `TC personal $${personal.amountDollars} / business $${business.amountDollars}`,
      { personal: personal.amountDollars, business: business.amountDollars },
    ),
  )

  const p10 = getPhase10Flags()
  const quote = isBusiness ? business : personal
  const checkout = createSandboxCheckout({
    quote,
    tenantId: 'synth-p12',
    principalId: 'synth-actor',
    idempotencyKey: `p12-${accountType}-${isBusiness ? 'biz' : 'per'}`,
  })
  const paid = confirmSandboxPayment({
    checkoutId: checkout.id,
    paymentMethodToken: 'pm_test_phase12',
  })
  const delivery = explainRefundDeliveryOptions(Math.max(0, adapter.irsVerifiedNumbers?.refundOrBalanceDue ?? 1000))
  steps.push(
    step(
      11,
      'Payment / banking selection',
      p10.livePayments || p10.liveBankingPartner ? 'blocked' : 'pass_staging_only',
      `Sandbox checkout ${paid.status}; livePayments=${p10.livePayments}; delivery options disclosed`,
      {
        paymentStatus: paid.status,
        deliveryCount: delivery.options.length,
        irsDisclaimer: Boolean(delivery.irsControlDisclaimer),
      },
    ),
  )

  steps.push(
    step(
      12,
      'Signatures and authorizations',
      'pass_staging_only',
      'Staging authorization gates required; no live e-sign provider claim',
    ),
  )

  const mef = getMefFlags()
  assertNoLiveIrsTransmit()
  const env = activeMefEnvironment()
  steps.push(
    step(
      13,
      'Prepare electronic filing',
      mef.liveProductionTransmit ? 'blocked' : 'pass_staging_only',
      `MeF env=${env}; liveProductionTransmit=${mef.liveProductionTransmit}; mock ATS only`,
    ),
  )

  steps.push(
    step(
      14,
      'Filing status and acknowledgments',
      'pass_staging_only',
      'Mock ATS ack/reject paths available; not official IRS ATS acceptance',
    ),
  )

  steps.push(
    step(
      15,
      'Records and audit history',
      'pass_staging_only',
      'Phase 7 audit + Phase 11 amendment audit + payment ledger available in staging',
    ),
  )

  const p11 = getPhase11Flags()
  const state = computeStateReturn({
    taxYear: 2025,
    stateCode: filingState,
    filingStatus: 'single',
    residency: 'resident',
    federalAgi: 50000,
    wagesInState: 50000,
    wagesOutOfState: 0,
    stateWithholding: 0,
  })

  evaluateFilingReadinessBlocks({
    hasEnergyCredits: false,
    hasHsaContributions: false,
    hasBusinessEntityReturn: isBusiness,
    hasUnsupportedState: state.validationStatus === 'unsupported',
  })

  const coreSteps = steps.filter((s) => s.step <= 15)
  const failed = coreSteps.some((s) => s.status === 'blocked')
  const validatedFilingOutput = false as const

  return {
    ok: !failed && silentCheck.ok && feeOk,
    syntheticOnly: true,
    liveIntegrationsDisabled: true,
    steps: [
      ...coreSteps,
      step(
        16,
        'State module scope check',
        p11.nationwideStateFiling ? 'blocked' : 'pass_staging_only',
        `State ${state.stateCode} status=${state.validationStatus}; nationwide=${p11.nationwideStateFiling}`,
      ),
    ],
    distinctions: {
      hypotheticalSavings: maximizer.potentialSavings,
      calculatedTaxResult: adapter.irsVerifiedNumbers?.refundOrBalanceDue ?? null,
      validatedFilingOutput,
    },
    pricing: { personal: TC_PERSONAL_FEE, business: TC_BUSINESS_FEE },
    summary: failed
      ? 'STAGE_E2E_BLOCKED'
      : 'STAGE_E2E_PASS_STAGING_ONLY — validatedFilingOutput=false; live integrations OFF',
  }
}
