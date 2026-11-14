/**
 * Phase 5: Form 8582 / Sch E / 8949 / AMT prefs / golden / shadow / cutover criteria.
 * Does NOT activate IRS engine for taxpayers.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-irs-phase5-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  GOLDEN_FIXTURES,
  PHASE5_GOLDEN_FIXTURES,
  runAllGoldenFixtures,
  computeForm8582,
  computeSpecialAllowanceCeiling,
  computeScheduleE,
  computeForm8949,
  computeScheduleD,
  computeForm6251,
  computeForm1040X,
  getYearTables,
  FORM_READINESS,
  mayShowIrsToTaxpayer,
  runInternalShadowSuite,
  isAuthorizedShadowTester,
  cutoverReady,
  cutoverBlockingCriteria,
  formatCutoverCriteriaReport,
} from '../src/engine/irs/index.ts'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Protected surfaces ===')
assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC pricing unchanged')
assert(typeof runBenefitOptimization(defaultProfile()).projectedRefund === 'number', 'Maximizer intact')
assert(mayShowIrsToTaxpayer() === false, 'IRS hidden')
assert(FORM_READINESS.productionReady === false, 'not production ready')
assert(FORM_READINESS.form8582 === 'isolated-validated', '8582 readiness')
assert(FORM_READINESS.scheduleE === 'isolated-validated', 'Sch E readiness')

console.log('=== Form 8582 ===')
assert(computeSpecialAllowanceCeiling(100000, 'single') === 25000, 'full allowance at 100k')
assert(computeSpecialAllowanceCeiling(120000, 'single') === 15000, 'phaseout at 120k')
assert(computeSpecialAllowanceCeiling(150000, 'single') === 0, 'zero at 150k')
assert(computeSpecialAllowanceCeiling(90000, 'mfs', false) === 0, 'MFS no lived-apart')
assert(computeSpecialAllowanceCeiling(60000, 'mfs', true) === 7500, 'MFS lived-apart mid phaseout')

const f8582 = computeForm8582({
  taxYear: 2025, filingStatus: 'single', magi: 80000,
  activities: [{ id: 'r1', currentNet: -20000, rentalRealEstateActiveParticipation: true }],
})
assert(f8582.specialAllowanceUsed === 20000, 'special allowance used 20000')
assert(f8582.agiInclusion === -20000, 'agi inclusion -20000')
assert(f8582.productionReady === false, '8582 not production')

const schE = computeScheduleE({
  taxYear: 2025, filingStatus: 'single', magiBeforePassiveLosses: 120000,
  properties: [{ rentsReceived: 0, expenses: 25000, activelyParticipating: true }],
})
assert(schE.agiInclusion === -15000, 'Sch E phaseout allowed 15000 got ' + schE.agiInclusion)
assert(schE.suspendedPassiveLoss === 10000, 'suspended 10000')
assert(schE.form8582 != null, '8582 attached')

console.log('=== Form 8949 / Schedule D ===')
const f8949 = computeForm8949({
  transactions: [
    { proceeds: 5000, costBasis: 2000, longTerm: false },
    { proceeds: 20000, costBasis: 10000, longTerm: true, rateGroup: 'unrecaptured1250' },
  ],
})
assert(f8949.shortTermTotal === 3000, '8949 ST')
assert(f8949.longTermTotal === 10000, '8949 LT')
assert(f8949.unrecaptured1250Gain === 10000, '8949 1250')
const tables = getYearTables(2025)!
const schD = computeScheduleD({
  filingStatus: 'single', shortTermGainLoss: 0, longTermGainLoss: 20000,
  unrecaptured1250Gain: 8000, taxableIncome: 35000, tables,
})
assert(schD.unrecaptured1250Applied === 8000, '1250 applied')
assert(schD.productionReady === false, 'Sch D not production')

console.log('=== AMT preferences ===')
const amt = computeForm6251({
  taxYear: 2025, filingStatus: 'single', taxableIncome: 165000, regularTax: 30000,
  standardDeductionTaken: 15000, usedItemized: false, isoBargainElement: 40000,
})
assert(amt.adjustmentsTotal === 55000, 'AMT adjustments std+ISO')
assert(amt.amt > 0, 'AMT due')

console.log('=== 1040-X ===')
const x = computeForm1040X({
  original: { taxYear: 2025, filingStatus: 'single', wages: 40000, withholding: 4000, selfEmploymentNetProfit: 0 },
  corrected: { taxYear: 2025, filingStatus: 'single', wages: 52000, withholding: 4000, selfEmploymentNetProfit: 0 },
})
assert(x.deltas.find((d) => d.line === 'AGI')!.netChange === 12000, '1040-X AGI delta')

console.log('=== Golden suite ===')
assert(PHASE5_GOLDEN_FIXTURES.length >= 10, 'phase5 fixtures')
assert(GOLDEN_FIXTURES.length >= 30, 'combined fixtures got ' + GOLDEN_FIXTURES.length)
const suite = runAllGoldenFixtures()
console.log('GOLDEN_PASSED', suite.passed)
console.log('GOLDEN_FAILED', suite.failed)
for (const r of suite.results.filter((x) => !x.pass)) {
  console.error('FAIL', r.fixtureId, r.field, 'exp', r.expected, 'act', r.actual)
}
assert(suite.failed === 0, 'all golden pass')

console.log('=== Internal shadow testing ===')
assert(!isAuthorizedShadowTester('random'), 'unauthorized denied')
let threw = false
try { runInternalShadowSuite('random') } catch { threw = true }
assert(threw, 'unauthorized throws')
const shadow = runInternalShadowSuite('qa-shadow-1')
assert(shadow.taxpayerVisible === false, 'shadow not taxpayer visible')
assert(shadow.audience === 'internal_only', 'shadow internal')
assert(shadow.reports.length >= 3, 'shadow reports')
console.log('SHADOW', shadow.summary)
for (const c of shadow.causes.slice(0, 6)) {
  console.log('CAUSE', JSON.stringify({ field: c.field, delta: c.delta, cause: c.likelyCause }))
}

console.log('=== Cutover criteria ===')
assert(cutoverReady() === false, 'cutover not ready')
assert(cutoverBlockingCriteria().length > 0, 'blocking criteria exist')
console.log(formatCutoverCriteriaReport().split('\\n').slice(0, 3).join(' | '))

console.log('=== PHASE5_OK failed=' + failed + ' ===')
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
process.exit(r.status === 0 ? 0 : r.status ?? 1)
