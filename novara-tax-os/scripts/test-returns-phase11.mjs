/**
 * Phase 11 state / business / amended golden + regression tests — synthetic only.
 * STOP before production activation.
 */
process.env.NOVARA_STAGING_SECURITY_API = "1"
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-phase11-test')
mkdirSync(tmp, { recursive: true })
const durable = mkdtempSync(join(tmpdir(), 'novara-p11-'))

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRICING } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'
import { cutoverReady } from '../src/engine/irs/cutoverCriteria.ts'
import { getMefFlags } from '../src/engine/irs/mef/index.ts'
import { getPhase10Flags } from '../src/engine/payments/phase10/index.ts'
import {
  PHASE11_VERSION,
  getPhase11Flags,
  assertNoProductionActivation,
  resetPhase11ForTests,
  assertApprovedPricingIntact,
  computeStateReturn,
  detectUnsupportedState,
  listPrioritizedStates,
  computeForm1065,
  computeForm1120S,
  computeForm1120,
  computeDepreciation,
  prepareAmendedReturn,
  listAmendmentAudit,
  getPreservedOriginal,
  recognizeInterviewNeeds,
  aiAdapterWiredToInterview,
  phase11Summary,
} from '../src/engine/returns/phase11/index.ts'
import {
  createSession,
  syntheticPrincipal,
  resetSessionStoreForTests,
} from '../src/engine/security/phase6/index.ts'
import { bootstrapStagingSecurity, resetStagingForTests } from '../src/engine/security/phase7/index.ts'
process.env.NOVARA_STAGING_SECURITY_API = '1'
import * as ReturnsApi from '../../staging-security-api/security/returns-phase11.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const DURABLE = ${JSON.stringify(durable)}
resetPhase11ForTests()
resetSessionStoreForTests()
resetStagingForTests(DURABLE)

console.log('=== Preserve pricing & protected surfaces ===')
const pricing = assertApprovedPricingIntact()
assert(pricing.ok && TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC $300/$399 intact')
assert(PRICING.TP.registration === 0 && PRICING.Office.plans.personal.annual === 899 && PRICING.Office.plans.business.annual === 1499, 'Office/TP pricing intact')
assert(Boolean(runBenefitOptimization(defaultProfile())), 'Maximizer intact')
assert(cutoverReady() === false, 'IRS cutover still false')
assert(getMefFlags().liveProductionTransmit === false, 'MeF live transmit false')
assert(getPhase10Flags().livePayments === false, 'livePayments false')
assert(getPhase11Flags().nationwideStateFiling === false, 'nationwideStateFiling false')
assert(getPhase11Flags().liveBusinessEfile === false, 'liveBusinessEfile false')
assert(getPhase11Flags().wireAiToInterview === false, 'wireAiToInterview false')
assert(aiAdapterWiredToInterview() === false, 'AI adapter not wired')
assertNoProductionActivation()

console.log('=== States prioritized & validated ===')
const states = listPrioritizedStates()
assert(states.map(s => s.code).join(',') === 'TX,FL,CA,NY,IL', 'prioritized TX FL CA NY IL')
assert(states.find(s => s.code === 'TX')?.validationStatus === 'validated_no_income_tax', 'TX validated no PIT')
assert(states.find(s => s.code === 'CA')?.validationStatus === 'staging_validated', 'CA staging_validated')

console.log('=== State golden tests ===')
const tx = computeStateReturn({
  taxYear: 2025, stateCode: 'TX', filingStatus: 'single', residency: 'resident',
  federalAgi: 80000, wagesInState: 80000, wagesOutOfState: 0, stateWithholding: 0,
})
assert(tx.validationStatus === 'validated_no_income_tax' && tx.taxAfterCredits === 0, 'state-tx-resident-no-pit')
assert(tx.productionReady === false && tx.nationwideClaim === false, 'TX not production/nationwide')

const fl = computeStateReturn({
  taxYear: 2025, stateCode: 'Florida', filingStatus: 'mfj', residency: 'resident',
  federalAgi: 50000, wagesInState: 50000, wagesOutOfState: 0, stateWithholding: 200,
})
assert(fl.taxAfterCredits === 0 && fl.refundOrBalanceDue === 200, 'state-fl-withholding-refund')

const ca = computeStateReturn({
  taxYear: 2024, stateCode: 'CA', filingStatus: 'single', residency: 'resident',
  federalAgi: 80000, wagesInState: 80000, wagesOutOfState: 0, stateWithholding: 4000,
})
assert(ca.validationStatus === 'staging_validated', 'CA staging status')
assert(ca.taxableIncome === 80000 - 5363, 'state-ca-single taxable uses std deduction')
assert(ca.taxBeforeCredits > 3000 && ca.taxBeforeCredits < 4500, 'state-ca-single-wages tax band')
assert(ca.refundOrBalanceDue === 4000 - ca.taxAfterCredits, 'CA refund/balance math')

const nyPy = computeStateReturn({
  taxYear: 2025, stateCode: 'NY', filingStatus: 'single', residency: 'part_year',
  monthsResident: 6, federalAgi: 100000, wagesInState: 40000, wagesOutOfState: 60000, stateWithholding: 2000,
})
assert(nyPy.residency === 'part_year', 'state-ny-part-year residency')
assert(nyPy.allocatedStateIncome === 40000 + Math.round(60000 * 0.5), 'NY part-year allocation')
assert(nyPy.multiStateAllocation?.outOfStateIncome === 60000, 'NY multi-state out wages')

const caNr = computeStateReturn({
  taxYear: 2025, stateCode: 'CA', filingStatus: 'single', residency: 'nonresident',
  federalAgi: 120000, wagesInState: 30000, wagesOutOfState: 90000, stateWithholding: 1500,
})
assert(caNr.allocatedStateIncome === 30000, 'state-ca-nonresident-allocation')
assert(caNr.multiStateAllocation!.inStateRatio === 0.25, 'CA NR ratio 25%')

const il = computeStateReturn({
  taxYear: 2024, stateCode: 'IL', filingStatus: 'single', residency: 'resident',
  federalAgi: 50000, wagesInState: 50000, wagesOutOfState: 0, stateWithholding: 2000,
})
assert(il.taxableIncome === 50000 - 2425, 'state-il-flat taxable after exemption')
assert(il.taxBeforeCredits === Math.round((50000 - 2425) * 0.0495), 'IL flat 4.95%')

const ak = detectUnsupportedState('AK', 2025)
assert(!ak.supported && ak.reasons.some(r => r.includes('unsupported_state')), 'state-unsupported-ak')
const akRes = computeStateReturn({
  taxYear: 2025, stateCode: 'AK', filingStatus: 'single', residency: 'resident',
  federalAgi: 1, wagesInState: 1, wagesOutOfState: 0, stateWithholding: 0,
})
assert(akRes.validationStatus === 'unsupported', 'AK compute unsupported')

const ca2023 = computeStateReturn({
  taxYear: 2023, stateCode: 'CA', filingStatus: 'single', residency: 'resident',
  federalAgi: 40000, wagesInState: 40000, wagesOutOfState: 0, stateWithholding: 1000,
})
assert(ca2023.taxYear === 2023 && ca2023.validationStatus === 'staging_validated', 'state-prior-year-ca-2023')

const badYear = detectUnsupportedState('CA', 2019)
assert(!badYear.supported, 'prior-year out of range unsupported')

console.log('=== Business golden tests ===')
const p1065 = computeForm1065({
  taxYear: 2025, entityName: 'Sandbox Partners LLC', einSynthetic: 'XX-0000001',
  grossReceipts: 200000, costOfGoodsSold: 40000, ordinaryExpenses: 60000, depreciationExpense: 10000,
  partners: [
    { id: 'p1', name: 'Alex', ownershipPercent: 60 },
    { id: 'p2', name: 'Blair', ownershipPercent: 40 },
  ],
})
assert(p1065.form === 'Form 1065' && p1065.ordinaryBusinessIncome === 90000, 'biz-1065 ordinary 90000')
assert(p1065.k1s.length === 2 && p1065.k1s[0].ordinaryBusinessIncome === 54000, 'biz-1065-two-partners K-1')
assert(p1065.k1s[1].ordinaryBusinessIncome === 36000, '1065 partner 40%')
assert(p1065.liveEfile === false && p1065.productionReady === false, '1065 no live efile')

const s1120s = computeForm1120S({
  taxYear: 2025, entityName: 'Sandbox S Corp', einSynthetic: 'XX-0000002',
  grossReceipts: 150000, ordinaryExpenses: 50000, depreciationExpense: 5000,
  shareholders: [
    { id: 's1', name: 'Casey', ownershipPercent: 70 },
    { id: 's2', name: 'Drew', ownershipPercent: 30 },
  ],
})
assert(s1120s.ordinaryBusinessIncome === 95000, 'biz-1120s ordinary')
assert(s1120s.k1s[0].ordinaryBusinessIncome === 66500 && s1120s.k1s[1].ordinaryBusinessIncome === 28500, 'biz-1120s-two-shareholders')

const c1120 = computeForm1120({
  taxYear: 2025, entityName: 'Sandbox C Corp', einSynthetic: 'XX-0000003',
  grossReceipts: 500000, costOfGoodsSold: 100000, ordinaryExpenses: 200000, depreciationExpense: 20000,
  estimatedPayments: 30000, businessCredits: 1000,
})
assert(c1120.ordinaryBusinessIncome === 180000, 'biz-1120 ordinary')
assert(c1120.entityTax === Math.round(180000 * 0.21) - 1000, 'biz-1120-corp-tax 21% minus credit')
assert(c1120.k1s.length === 0, 'C-corp no K-1')
assert(c1120.refundOrBalanceDue === 30000 - c1120.entityTax!, '1120 refund/balance')

const dep = computeDepreciation({ costBasis: 10000, section179Election: 5000, recoveryYears: 5, yearInService: 1 })
assert(dep.section179 === 5000 && dep.macrs === Math.round(5000 * 0.2) && dep.total === 5000 + 1000, 'biz-depreciation-sec179')

console.log('=== Amended golden tests ===')
const baseReturn = {
  taxYear: 2025, filingStatus: 'single' as const, wages: 60000, withholding: 8000,
  selfEmploymentNetProfit: 0,
}
const corrected = { ...baseReturn, wages: 70000 }
const blocked = prepareAmendedReturn({
  tenantId: 'ten-amd', taxpayerId: 'tp-1', actorId: 'actor-1',
  original: baseReturn, corrected,
  authorization: { taxpayerAuthorized: false },
})
assert(!blocked.ok && blocked.error === 'taxpayer_authorization_required', 'amd-blocked-without-auth')

const amd = prepareAmendedReturn({
  tenantId: 'ten-amd', taxpayerId: 'tp-1', actorId: 'actor-1',
  original: baseReturn, corrected,
  authorization: { taxpayerAuthorized: true, method: 'staging_synthetic', authorizedAt: new Date().toISOString() },
})
assert(amd.ok && amd.form1040x?.form === 'Form 1040-X', 'amd-1040x-wage-correction')
assert(amd.originalPreserved && getPreservedOriginal('ten-amd', 'tp-1', 2025), 'original preserved')
assert(amd.correctedThemes.incomeChanged === true, 'corrected income flagged')
assert(amd.liveFiling === false && amd.productionReady === false, 'amendment not live')
assert(listAmendmentAudit('ten-amd', 'tp-1', 2025).length >= 2, 'amendment audit history')

// Preserve must not overwrite
const again = prepareAmendedReturn({
  tenantId: 'ten-amd', taxpayerId: 'tp-1', actorId: 'actor-2',
  original: { ...baseReturn, wages: 1 }, corrected,
  authorization: { taxpayerAuthorized: true, method: 'staging_synthetic' },
})
assert(again.ok && getPreservedOriginal('ten-amd', 'tp-1', 2025)!.originalInput.wages === 60000, 'original not overwritten')

console.log('=== AI adapter (isolated) ===')
const hints = recognizeInterviewNeeds({
  taxYear: 2025, filingState: 'California', hasBusinessIncome: true, entityType: 'partnership',
  filingMode: 'amended', documents: [],
})
assert(hints.some(h => h.kind === 'state_specific_question'), 'AI state questions')
assert(hints.some(h => h.kind === 'business_return_requirement'), 'AI business requirements')
assert(hints.some(h => h.kind === 'amended_return_change'), 'AI amended changes')
assert(hints.some(h => h.kind === 'missing_supporting_document'), 'AI missing docs')
assert(hints.every(h => h.mapsToSuggestedOnly === true), 'AI suggested-only')

console.log('=== Phase 7 API ===')
bootstrapStagingSecurity({ durableRoot: DURABLE })
const owner = syntheticPrincipal({
  id: 'own-p11', email: 'o@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-p11', officeId: 'off-p11', officeManager: true, mfaEnrolled: false,
})
const sess = createSession({ principal: owner, fingerprintSalt: 'p11', mfaSatisfied: true })
const statusRes = await ReturnsApi.GET()
assert(statusRes.status === 200, 'phase11 status API')
const statusBody = await statusRes.json()
assert(statusBody.nationwideStateFiling === false && statusBody.liveBusinessEfile === false, 'status locks')

const stateRes = await ReturnsApi.POST(new Request('http://local/api/security/returns-phase11', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': sess.sessionId },
  body: JSON.stringify({
    op: 'state_compute', tenantId: 'ten-p11',
    input: { taxYear: 2025, stateCode: 'TX', filingStatus: 'single', residency: 'resident',
      federalAgi: 10, wagesInState: 10, wagesOutOfState: 0, stateWithholding: 0 },
  }),
}))
assert(stateRes.status === 200, 'API state_compute authorized')

const deny = await ReturnsApi.POST(new Request('http://local/api/security/returns-phase11', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'state_compute' }),
}))
assert(deny.status === 401, 'unauthorized denied')

console.log(phase11Summary())
assert(PHASE11_VERSION.includes('phase11'), 'phase11 version')
assertNoProductionActivation()
console.log('=== PHASE11_RETURNS_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NOVARA_STAGING_SECURITY_API: '1' },
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
rmSync(durable, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
