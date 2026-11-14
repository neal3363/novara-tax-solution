/**
 * Phase 4: expanded federal forms + golden + 1040-X + dual-run guards.
 * Does NOT activate IRS engine for taxpayers / Maximizer.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-irs-phase4-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  GOLDEN_FIXTURES,
  PHASE4_GOLDEN_FIXTURES,
  runAllGoldenFixtures,
  computeForm8962,
  computeForm8995A,
  computeForm8863,
  computeScheduleB,
  computeScheduleD,
  computeScheduleE,
  computeForm6251,
  computeForm8960,
  computeForm1040X,
  computeIrsFederalReturn,
  getYearTables,
  FORM_READINESS,
  completedPhase4Forms,
  mayShowIrsToTaxpayer,
  setDualRunFlagForTests,
  resetDualRunFlag,
  runDualComparison,
  sampleProfilesForComparison,
} from '../src/engine/irs/index.ts'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Protected surfaces ===')
assert(TC_PERSONAL_FEE === 300, 'TC personal $300')
assert(TC_BUSINESS_FEE === 399, 'TC business $399')
assert(typeof runBenefitOptimization(defaultProfile()).projectedRefund === 'number', 'Maximizer unchanged')
assert(mayShowIrsToTaxpayer() === false, 'IRS hidden from taxpayers')
assert(FORM_READINESS.productionReady === false, 'productionReady false')

console.log('=== Phase 4 form modules (not production-ready) ===')
const f8962 = computeForm8962({
  taxYear: 2025, filingStatus: 'single', householdIncome: 40000, householdSize: 1,
  annualEnrollmentPremium: 6000, annualSlcsp: 8000, aptcReceived: 3000,
})
assert(f8962.productionReady === false, '8962 not production')
assert(f8962.refundablePtc > 0, '8962 PTC computed')

const tables = getYearTables(2025)!
const f8995a = computeForm8995A({
  taxYear: 2025, filingStatus: 'single', qbi: 80000, taxableIncomeBeforeQbi: 60000,
  w2Wages: 20000, ubia: 50000, isSstb: true, tables,
})
assert(f8995a.qbiDeduction > 0, '8995-A QBI below threshold with SSTB')
assert(f8995a.productionReady === false, '8995-A not production')

const f8863 = computeForm8863({
  taxYear: 2025, filingStatus: 'single', magi: 50000,
  students: [{ creditType: 'aotc', qualifiedExpenses: 4000, eligible: true }],
})
assert(f8863.totalRefundable === 1000, 'AOTC refundable 1000 got ' + f8863.totalRefundable)
assert(f8863.productionReady === false, '8863 not production')

assert(computeScheduleB({ taxableInterest: 2000, ordinaryDividends: 1000 }).agiInclusion === 3000, 'Sch B')
assert(computeScheduleE({ properties: [{ rentsReceived: 24000, expenses: 10000, activelyParticipating: true }] }).agiInclusion === 14000, 'Sch E')
assert(computeForm8960({ filingStatus: 'single', magi: 250000, netInvestmentIncome: 50000 }).niit === 1900, 'NIIT')
assert(computeForm6251({
  taxYear: 2025, filingStatus: 'single', taxableIncome: 235000, regularTax: 32000,
  standardDeductionTaken: 15000, usedItemized: false,
}).amt > 0, 'AMT positive when TMT exceeds regular')

const schD = computeScheduleD({
  filingStatus: 'single', shortTermGainLoss: 0, longTermGainLoss: 5000,
  qualifiedDividends: 1000, taxableIncome: 53000, tables,
})
assert(schD.taxWithPreferentialRates > 0, 'Sch D preferential tax')
assert(schD.productionReady === false, 'Sch D not production')

console.log('=== Form 1040-X amended recalc ===')
const x = computeForm1040X({
  original: { taxYear: 2024, filingStatus: 'single', wages: 40000, withholding: 3500, selfEmploymentNetProfit: 0 },
  corrected: { taxYear: 2024, filingStatus: 'single', wages: 50000, withholding: 3500, selfEmploymentNetProfit: 0 },
})
assert(x.productionReady === false, '1040-X not production')
assert(x.deltas.some((d) => d.line === 'AGI' && d.netChange === 10000), '1040-X AGI +10000')
assert(x.netRefundOrBalanceChange !== 0, '1040-X refund/balance changes')

console.log('=== Golden suite (Phase 3 + Phase 4) ===')
assert(PHASE4_GOLDEN_FIXTURES.length >= 8, 'phase4 fixtures present')
assert(GOLDEN_FIXTURES.length >= 20, 'combined fixtures >= 20 got ' + GOLDEN_FIXTURES.length)
const suite = runAllGoldenFixtures()
console.log('GOLDEN_PASSED', suite.passed)
console.log('GOLDEN_FAILED', suite.failed)
for (const s of suite.fixtureSummaries.filter((x) => !x.allPass)) {
  console.error('FAIL fixture', s.id)
}
for (const r of suite.results.filter((x) => !x.pass)) {
  console.error('  ', r.fixtureId, r.field, 'exp', r.expected, 'act', r.actual, 'delta', r.delta)
}
assert(suite.failed === 0, 'all golden checks pass')

console.log('=== Dual-run preserved ===')
resetDualRunFlag()
assert(runDualComparison(defaultProfile()) === null, 'flag off')
setDualRunFlagForTests({ enabled: true })
const rows = sampleProfilesForComparison().map((s) => {
  const r = runDualComparison(s.profile, s.label)!
  return { label: s.label, demo: r.demo.projectedRefund, irs: r.irs.refundOrBalanceDue, delta: r.demo.projectedRefund - r.irs.refundOrBalanceDue }
})
for (const row of rows) console.log('DUAL', JSON.stringify(row))
assert(rows.length >= 3, 'dual-run rows')
resetDualRunFlag()

console.log('=== Gap readiness ===')
const done = completedPhase4Forms()
assert(done.length >= 8, 'phase4 completed forms listed')
assert(done.every((g) => g.productionReady === false), 'none production-ready')

console.log('=== PHASE4_OK failed=' + failed + ' ===')
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
