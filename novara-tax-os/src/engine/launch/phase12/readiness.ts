/**
 * Launch-readiness assessment — evidence-based GO / NO-GO.
 * Never auto-declares production-ready.
 */

import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRICING } from '../../../data/fees'
import { cutoverReady } from '../../irs/cutoverCriteria'
import { mayShowIrsToTaxpayer } from '../../irs/dualRun'
import { supportedIrsTaxYears } from '../../irs/federalReturn'
import { getMefFlags, activeMefEnvironment } from '../../irs/mef/config'
import { getPhase9Flags } from '../../irs/phase9/config'
import { getPhase10Flags } from '../../payments/phase10/config'
import { bankingPartnerConnectionStatus } from '../../payments/phase10/bankingAdapter'
import { getPhase11Flags, listPrioritizedStates } from '../../returns/phase11'
import { getPhase6Flags } from '../../security/phase6/config'
import { getPhase7Flags } from '../../security/phase7/config'
import { PHASE12_TAX_GAPS } from './gapBlockers'
import { assessSecurityArchitecture } from './securityAssessment'
import { buildDeploymentChecklist } from './deploymentChecklist'
import { runStagingEndToEndWorkflow } from './workflow'
import { PHASE12_VERSION, getPhase12Flags, assertNoProductionActivation } from './config'

export type GoNoGo = 'GO' | 'NO-GO' | 'GO_DEMO_SYNTHETIC_ONLY'

export interface LaunchReadinessReport {
  version: string
  asOf: string
  recommendation: GoNoGo
  productionReady: false
  publicDemoReady: boolean
  featuresWorkingE2E: string[]
  featuresStagingOnly: string[]
  supportedFederalTaxYears: number[]
  supportedStates: { code: string; status: string }[]
  supportedBusinessForms: string[]
  taxCalculationValidation: {
    cutoverReady: boolean
    mayShowIrsToTaxpayer: boolean
    gapsBlockingFiling: number
    status: 'staging_partial'
  }
  security: ReturnType<typeof assessSecurityArchitecture>
  paymentsBanking: {
    tcPersonal: number
    tcBusiness: number
    livePayments: false
    liveBankingPartner: false
    partnerConnected: boolean
  }
  mef: {
    environment: string
    liveProductionTransmit: false
    officialIrsAtsEnabled: boolean
    authorizationStatus: 'not_authorized_for_live'
  }
  outstandingRegulatoryApprovals: string[]
  failedOrIncompleteTests: string[]
  criticalHighBlockers: string[]
  productionDeploymentReadiness: false
  publicDemoReadiness: true | false
  stepsBeforeRealTaxpayers: string[]
  e2e: ReturnType<typeof runStagingEndToEndWorkflow>
  deployment: ReturnType<typeof buildDeploymentChecklist>
  evidence: string[]
}

export function buildLaunchReadinessReport(): LaunchReadinessReport {
  assertNoProductionActivation()
  const f = getPhase12Flags()
  const p6 = getPhase6Flags()
  const p7 = getPhase7Flags()
  const p9 = getPhase9Flags()
  const p10 = getPhase10Flags()
  const p11 = getPhase11Flags()
  const mef = getMefFlags()
  const bank = bankingPartnerConnectionStatus()
  const security = assessSecurityArchitecture()
  const deployment = buildDeploymentChecklist()
  const e2e = runStagingEndToEndWorkflow({ accountType: 'tc', filingState: 'Texas' })
  const states = listPrioritizedStates()

  const featuresWorkingE2E = [
    'Homepage / branding / navigation (preserved)',
    'Account role dashboards (TC / TP / Office)',
    'Document upload + AI interview + Refund Maximizer (product path)',
    'Approved pricing quotes ($300 / $399)',
    'Staging security session/authz APIs',
    'Sandbox payment checkout (tokenized)',
    'Refund delivery preference disclosure',
    'Mock MeF prepare / ack / reject paths',
    'Phase 11 state/business/amended staging modules',
  ]

  const featuresStagingOnly = [
    'IRS calc engine dual-run / staging adapter (cutover OFF)',
    'Phase 6/7 security (production enforcement OFF)',
    'Phase 8 MeF (mock ATS only)',
    'Phase 10 payments/banking (live OFF)',
    'Phase 11 CA/NY/IL state calcs; 1065/1120-S/1120; 1040-X',
    'Durable audit/vault (staging)',
  ]

  const outstandingRegulatoryApprovals = [
    'IRS MeF / EFIN production authorization and official ATS acceptance',
    'State e-file authorizations (CA/NY/IL and any additional states)',
    'Payment processor production credentials + PCI scope review',
    'Banking partner agreement + tested live connectivity',
    'Independent security assessment of production infrastructure',
    'Human launch approval (required by Phase 12 gate)',
  ]

  const criticalHighBlockers = [
    ...security.findings
      .filter((x) => (x.severity === 'critical' || x.severity === 'high') && x.status !== 'pass_staging')
      .map((x) => `${x.severity.toUpperCase()}: ${x.area} — ${x.detail}`),
    'IRS engine cutover not approved (cutoverReady=false)',
    'Live IRS filing disabled',
    'Live payments/banking disabled',
    'Nationwide state filing not claimed / incomplete',
    'Business e-file disabled',
    ...PHASE12_TAX_GAPS.filter((g) => g.severity === 'critical' || g.severity === 'high').map(
      (g) => `${g.severity.toUpperCase()} GAP: ${g.title}`,
    ),
  ]

  const failedOrIncompleteTests: string[] = []
  if (!e2e.ok) failedOrIncompleteTests.push('staging_e2e_workflow')
  if (security.criticalOpen > 0) failedOrIncompleteTests.push('security_critical_open')
  // Production restore / secrets are incomplete by design
  failedOrIncompleteTests.push('production_backup_restore_drill (missing)')
  failedOrIncompleteTests.push('production_secrets_provisioning (missing)')
  failedOrIncompleteTests.push('official_irs_ats_acceptance (not run)')
  failedOrIncompleteTests.push('independent_security_assessment (required)')

  const stepsBeforeRealTaxpayers = [
    'Complete independent golden validation for all filing-ready forms',
    'Resolve critical/high security findings on production infrastructure',
    'Provision and rotate production secrets (payments, MeF, KMS)',
    'Obtain IRS MeF authorization; pass official ATS (not mock)',
    'Obtain state filing authorizations for each marketed state',
    'Enable live payments only after processor + compliance approval',
    'Enable banking products only after partner agreement + tested integration',
    'Run production backup/restore drill and monitoring soak',
    'Explicit human GO approval for accepting real taxpayer information',
    'Keep public demo on synthetic data until the above are complete',
  ]

  const publicDemoReady =
    deployment.publicDemoAllowedIfSynthetic &&
    e2e.ok &&
    !p10.livePayments &&
    !mef.liveProductionTransmit &&
    f.processRealTaxpayerReturns === false

  // Final recommendation: production is NO-GO; synthetic public demo may be GO separately
  const recommendation: GoNoGo = publicDemoReady ? 'GO_DEMO_SYNTHETIC_ONLY' : 'NO-GO'

  return {
    version: PHASE12_VERSION,
    asOf: new Date().toISOString(),
    recommendation,
    productionReady: false,
    publicDemoReady,
    featuresWorkingE2E,
    featuresStagingOnly,
    supportedFederalTaxYears: [...supportedIrsTaxYears()],
    supportedStates: states.map((s) => ({ code: s.code, status: s.validationStatus })),
    supportedBusinessForms: ['Form 1065 (staging)', 'Form 1120-S (staging)', 'Form 1120 (staging)', 'Form 1040-X (staging)'],
    taxCalculationValidation: {
      cutoverReady: cutoverReady(),
      mayShowIrsToTaxpayer: mayShowIrsToTaxpayer(),
      gapsBlockingFiling: PHASE12_TAX_GAPS.filter((g) => g.action === 'block_filing').length,
      status: 'staging_partial',
    },
    security,
    paymentsBanking: {
      tcPersonal: TC_PERSONAL_FEE,
      tcBusiness: TC_BUSINESS_FEE,
      livePayments: false,
      liveBankingPartner: false,
      partnerConnected: bank.partnerConnected,
    },
    mef: {
      environment: activeMefEnvironment(),
      liveProductionTransmit: false,
      officialIrsAtsEnabled: mef.officialIrsAtsEnabled,
      authorizationStatus: 'not_authorized_for_live',
    },
    outstandingRegulatoryApprovals,
    failedOrIncompleteTests,
    criticalHighBlockers,
    productionDeploymentReadiness: false,
    publicDemoReadiness: publicDemoReady,
    stepsBeforeRealTaxpayers,
    e2e,
    deployment,
    evidence: [
      `pricing TC ${TC_PERSONAL_FEE}/${TC_BUSINESS_FEE}; Office ${PRICING.Office.subscriptionLow}-${PRICING.Office.subscriptionHigh}; TP reg ${PRICING.TP.registration}`,
      `phase6.productionAuthPath=${p6.productionAuthPath}`,
      `phase7.productionEnforcement=${p7.productionEnforcement}`,
      `phase9.activateCutover=${p9.activateCutover}`,
      `phase10.livePayments=${p10.livePayments}`,
      `phase11.nationwideStateFiling=${p11.nationwideStateFiling}`,
      `phase11.liveBusinessEfile=${p11.liveBusinessEfile}`,
      `mef.env=${activeMefEnvironment()}`,
      `e2e.ok=${e2e.ok}`,
      `security.productionSecurityGo=false`,
      `recommendation=${recommendation}`,
      'STOP before production activation',
    ],
  }
}

export function finalReleaseGate(humanApproved = false): {
  productionGo: false
  demoGo: boolean
  reasons: string[]
} {
  const report = buildLaunchReadinessReport()
  const reasons = [
    'autoDeclareProductionReady=false',
    `humanApproved=${humanApproved}`,
    `productionReady=${report.productionReady}`,
    ...report.criticalHighBlockers.slice(0, 8),
  ]
  if (!humanApproved) {
    reasons.unshift('Human launch approval required and not granted')
  }
  return {
    productionGo: false,
    demoGo: report.publicDemoReady && !humanApproved ? report.publicDemoReady : report.publicDemoReady,
    reasons,
  }
}
