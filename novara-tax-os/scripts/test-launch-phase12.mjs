/**
 * Phase 12 launch-readiness & staging E2E tests — synthetic only.
 * STOP before production activation.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-phase12-test')
mkdirSync(tmp, { recursive: true })
const durable = mkdtempSync(join(tmpdir(), 'novara-p12-'))

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRICING } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'
import { cutoverReady } from '../src/engine/irs/cutoverCriteria.ts'
import { mayShowIrsToTaxpayer } from '../src/engine/irs/dualRun.ts'
import { getMefFlags } from '../src/engine/irs/mef/index.ts'
import { getPhase10Flags } from '../src/engine/payments/phase10/index.ts'
import { getPhase11Flags, listPrioritizedStates } from '../src/engine/returns/phase11/index.ts'
import {
  PHASE12_VERSION,
  getPhase12Flags,
  assertNoProductionActivation,
  resetPhase12ForTests,
  assertApprovedPricingIntact,
  runStagingEndToEndWorkflow,
  evaluateFilingReadinessBlocks,
  assertNoSilentVerifiedFiling,
  PHASE12_TAX_GAPS,
  assessSecurityArchitecture,
  buildDeploymentChecklist,
  buildLaunchReadinessReport,
  finalReleaseGate,
  phase12Summary,
} from '../src/engine/launch/phase12/index.ts'
import {
  createSession,
  syntheticPrincipal,
  resetSessionStoreForTests,
} from '../src/engine/security/phase6/index.ts'
import { bootstrapStagingSecurity, resetStagingForTests } from '../src/engine/security/phase7/index.ts'
import * as LaunchApi from '../api/security/launch-phase12.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const DURABLE = ${JSON.stringify(durable)}
resetPhase12ForTests()
resetSessionStoreForTests()
resetStagingForTests(DURABLE)

console.log('=== Preserve pricing & protected surfaces ===')
const pricing = assertApprovedPricingIntact()
assert(pricing.ok && TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC $300/$399 intact')
assert(PRICING.TP.registration === 599 && PRICING.Office.subscriptionLow === 899, 'Office/TP pricing intact')
assert(Boolean(runBenefitOptimization(defaultProfile())), 'Maximizer intact')
assert(cutoverReady() === false, 'IRS cutover still false')
assert(mayShowIrsToTaxpayer() === false, 'IRS not taxpayer-visible')
assert(getMefFlags().liveProductionTransmit === false, 'MeF live transmit false')
assert(getPhase10Flags().livePayments === false, 'livePayments false')
assert(getPhase11Flags().nationwideStateFiling === false, 'nationwideStateFiling false')
assert(getPhase11Flags().liveBusinessEfile === false, 'liveBusinessEfile false')
assert(getPhase12Flags().autoDeclareProductionReady === false, 'autoDeclareProductionReady false')
assert(getPhase12Flags().humanLaunchApprovalRequired === true, 'human approval required')
assertNoProductionActivation()

console.log('=== Staging E2E workflow (steps 1-15) ===')
const e2e = runStagingEndToEndWorkflow({ accountType: 'tc', filingState: 'Texas' })
assert(e2e.ok && e2e.syntheticOnly && e2e.liveIntegrationsDisabled, 'E2E staging ok')
assert(e2e.pricing.personal === 300 && e2e.pricing.business === 399, 'E2E fee breakdown')
assert(e2e.distinctions.validatedFilingOutput === false, 'validated filing output false')
const core = e2e.steps.filter(s => s.step <= 15)
assert(core.length === 15, '15 core workflow steps')
assert(core.every(s => s.status === 'pass' || s.status === 'pass_staging_only'), 'no blocked core steps')
assert(core.some(s => s.step === 8 && s.status === 'pass'), 'Maximizer step pass')
assert(core.some(s => s.step === 11 && s.status === 'pass_staging_only'), 'sandbox payment step')

const e2eBiz = runStagingEndToEndWorkflow({ accountType: 'office', filingState: 'California', isBusiness: true })
assert(e2eBiz.ok, 'E2E business/CA staging ok')

console.log('=== Gap blockers — no silent verified filing ===')
const gaps = evaluateFilingReadinessBlocks({
  hasEnergyCredits: true,
  hasHsaContributions: true,
  hasEducationWithoutFollowup: true,
  hasBusinessEntityReturn: true,
  hasUnsupportedState: true,
  hasCapitalGainsEdge: true,
  hasUnsupportedReturnType: true,
})
assert(gaps.mayMarkFilingReady === false, 'never filing-ready with gaps')
assert(gaps.blocks.length >= 3, 'blocks present for energy/hsa/business/state/unsupported')
assert(gaps.reviews.length >= 1, 'reviews present')
assert(PHASE12_TAX_GAPS.every(g => g.filingReady === false), 'all gap filingReady false')
const silent = assertNoSilentVerifiedFiling(true, ['energy_credit_partial_form_5695_requires_review'])
assert(!silent.ok, 'rejects silent fullyValidated claim')
assert(assertNoSilentVerifiedFiling(false, ['x']).ok, 'allows non-validated with flags')

console.log('=== Federal years & state/business scope ===')
const report = buildLaunchReadinessReport()
assert(report.supportedFederalTaxYears.join(',') === '2022,2023,2024,2025', 'TY 2022-2025')
const stateCodes = listPrioritizedStates().map(s => s.code)
assert(stateCodes.includes('TX') && stateCodes.includes('CA'), 'TX/CA in prioritized states')
assert(report.supportedBusinessForms.some(f => f.includes('1065')), '1065 staging listed')
assert(report.taxCalculationValidation.cutoverReady === false, 'cutover not ready')
assert(report.taxCalculationValidation.status === 'staging_partial', 'calc staging_partial')

console.log('=== Security assessment ===')
const sec = assessSecurityArchitecture()
assert(sec.productionSecurityGo === false, 'security production GO false')
assert(sec.independentAssessmentRequired === true, 'independent assessment required')
assert(sec.findings.some(f => f.id === 'auth-session' && f.status === 'pass_staging'), 'auth staging pass')
assert(sec.findings.some(f => f.id === 'secrets' && f.status === 'blocked_for_production'), 'secrets blocked prod')

console.log('=== Payments & MeF status ===')
assert(report.paymentsBanking.tcPersonal === 300 && report.paymentsBanking.tcBusiness === 399, 'report pricing')
assert(report.paymentsBanking.livePayments === false && report.paymentsBanking.partnerConnected === false, 'payments/banking OFF')
assert(report.mef.liveProductionTransmit === false, 'MeF live false')
assert(report.mef.authorizationStatus === 'not_authorized_for_live', 'MeF not authorized')
assert(report.mef.environment === 'ats_mock' || report.mef.environment === 'development', 'mock/dev MeF env')

console.log('=== Deployment prep ===')
const dep = buildDeploymentChecklist()
assert(dep.stagingDeployReady === true, 'staging deploy ready')
assert(dep.productionConfigReady === false, 'prod config not ready')
assert(dep.acceptRealTaxpayers === false, 'no real taxpayers')
assert(dep.publicDemoAllowedIfSynthetic === true, 'synthetic demo allowed')

console.log('=== Launch readiness GO/NO-GO ===')
assert(report.productionReady === false, 'productionReady false')
assert(report.productionDeploymentReadiness === false, 'prod deploy readiness false')
assert(report.recommendation === 'GO_DEMO_SYNTHETIC_ONLY' || report.recommendation === 'NO-GO', 'demo-only or NO-GO')
assert(report.publicDemoReady === true, 'public demo synthetic ready')
assert(report.criticalHighBlockers.length > 0, 'blockers documented')
assert(report.stepsBeforeRealTaxpayers.length >= 5, 'steps before real taxpayers')
assert(report.outstandingRegulatoryApprovals.length >= 4, 'regulatory approvals listed')

const gate = finalReleaseGate(false)
assert(gate.productionGo === false, 'release gate productionGo false')
const gateHuman = finalReleaseGate(true)
assert(gateHuman.productionGo === false, 'even with humanApproved still productionGo false until blockers clear')

console.log('=== Phase 7 API ===')
bootstrapStagingSecurity({ durableRoot: DURABLE })
const owner = syntheticPrincipal({
  id: 'own-p12', email: 'o@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-p12', officeId: 'off-p12', officeManager: true, mfaEnrolled: false,
})
const sess = createSession({ principal: owner, fingerprintSalt: 'p12', mfaSatisfied: true })
const statusRes = await LaunchApi.GET()
assert(statusRes.status === 200, 'phase12 status API')
const statusBody = await statusRes.json()
assert(statusBody.productionReady === false, 'API productionReady false')

const readyRes = await LaunchApi.POST(new Request('http://local/api/security/launch-phase12', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': sess.sessionId },
  body: JSON.stringify({ op: 'readiness', tenantId: 'ten-p12' }),
}))
assert(readyRes.status === 200, 'API readiness authorized')
const readyBody = await readyRes.json()
assert(readyBody.productionReady === false && readyBody.productionGo !== true, 'API readiness NO production GO')

const deny = await LaunchApi.POST(new Request('http://local/api/security/launch-phase12', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'readiness' }),
}))
assert(deny.status === 401, 'unauthorized denied')

console.log(phase12Summary())
assert(PHASE12_VERSION.includes('phase12'), 'phase12 version')
assertNoProductionActivation()
console.log('=== PHASE12_LAUNCH_OK failed=' + failed + ' recommendation=' + report.recommendation + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env },
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
rmSync(durable, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
