/**
 * Phase 3: IRS golden fixtures + dual-run (feature-flagged, taxpayer-hidden).
 * Does NOT activate IRS engine for real users / UI.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-irs-golden-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  GOLDEN_FIXTURES,
  runAllGoldenFixtures,
  ALL_FILING_STATUSES,
  DEFAULT_DUAL_RUN_FLAG,
  getDualRunFlag,
  setDualRunFlagForTests,
  resetDualRunFlag,
  runDualComparison,
  mayShowIrsToTaxpayer,
  CALCULATION_GAPS,
  gapsNeedingApproval,
  ALL_STUBS,
  MAXIMIZER_MIGRATION_STEPS,
  maximizerMigrationSummary,
  sampleProfilesForComparison,
} from '../src/engine/irs/index.ts'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Protected surfaces unchanged ===')
assert(TC_PERSONAL_FEE === 300, 'TC personal $300')
assert(TC_BUSINESS_FEE === 399, 'TC business $399')
const demo = runBenefitOptimization(defaultProfile())
assert(typeof demo.projectedRefund === 'number', 'Maximizer still runs')
assert(typeof demo.ruleVersion === 'string' && demo.ruleVersion.length > 0, 'Maximizer ruleVersion present')

console.log('=== Golden fixture inventory ===')
assert(GOLDEN_FIXTURES.length >= 12, 'at least 12 golden fixtures got ' + GOLDEN_FIXTURES.length)
const years = new Set(GOLDEN_FIXTURES.map((f) => f.taxYear))
assert([2022,2023,2024,2025].every((y) => years.has(y)), 'fixtures cover TY2022-2025')
const statuses2025 = new Set(
  GOLDEN_FIXTURES.filter((f) => f.taxYear === 2025).map((f) => f.input.filingStatus),
)
assert(ALL_FILING_STATUSES.every((s) => statuses2025.has(s)), '2025 covers all five filing statuses')
for (const f of GOLDEN_FIXTURES) {
  assert(!!f.source && f.source.length > 10, 'source documented: ' + f.id)
  assert(f.derivation.length > 0, 'derivation present: ' + f.id)
  assert(!JSON.stringify(f.expected).includes('computeIrs'), 'expected not engine-copied: ' + f.id)
}

console.log('=== Run golden suite ===')
const suite = runAllGoldenFixtures()
console.log('GOLDEN_PASSED', suite.passed)
console.log('GOLDEN_FAILED', suite.failed)
for (const s of suite.fixtureSummaries) {
  console.log(s.allPass ? 'PASS' : 'FAIL', s.id, '—', s.label)
}
for (const r of suite.results.filter((x) => !x.pass)) {
  console.error('  field', r.fixtureId, r.field, 'expected', r.expected, 'actual', r.actual, 'delta', r.delta)
}
assert(suite.failed === 0, 'all golden field checks pass (failed=' + suite.failed + ')')
assert(suite.fixtureSummaries.every((s) => s.allPass), 'all fixtures pass')

console.log('=== Dual-run flag (hidden from taxpayers) ===')
resetDualRunFlag()
assert(getDualRunFlag().enabled === false, 'dual-run default OFF')
assert(getDualRunFlag().audience === 'internal_only', 'audience internal_only')
assert(mayShowIrsToTaxpayer() === false, 'IRS never taxpayer-visible')
assert(runDualComparison(defaultProfile()) === null, 'disabled flag returns null')

setDualRunFlagForTests({ enabled: true, verbose: true })
assert(getDualRunFlag().enabled === true, 'flag enable for tests')
const report = runDualComparison(defaultProfile(), 'phase3-default-profile')
assert(report != null, 'dual-run produces report')
assert(report!.taxpayerVisible === false, 'report taxpayerVisible false')
assert(report!.flag.audience === 'internal_only', 'report audience locked')
assert(typeof report!.irs.agi === 'number', 'IRS AGI present')
assert(typeof report!.demo.projectedRefund === 'number', 'demo refund present')
assert(report!.diffs.length > 0, 'diffs present')
console.log('DUAL_SUMMARY', report!.summary)

const samples = sampleProfilesForComparison()
const dualRows: { label: string; demo: number; irs: number; delta: number }[] = []
for (const s of samples) {
  const r = runDualComparison(s.profile, s.label)!
  dualRows.push({
    label: s.label,
    demo: r.demo.projectedRefund,
    irs: r.irs.refundOrBalanceDue,
    delta: r.demo.projectedRefund - r.irs.refundOrBalanceDue,
  })
}
console.log('=== Demo vs IRS (synthetic; internal) ===')
for (const row of dualRows) {
  console.log(JSON.stringify(row))
}
assert(dualRows.length >= 3, 'compared >=3 synthetic profiles')

// Attempt to force taxpayer_visible is ignored
setDualRunFlagForTests({ enabled: true, audience: 'taxpayer_visible' as any })
assert(getDualRunFlag().audience === 'internal_only', 'cannot set taxpayer_visible via test setter')
resetDualRunFlag()

console.log('=== Gap inventory + stubs (isolated, not production-ready) ===')
assert(CALCULATION_GAPS.length >= 7, 'gap inventory covers requested forms')
assert(gapsNeedingApproval().every((g) => g.approvalRequired), 'approval flags set')
for (const stub of ALL_STUBS) {
  const r = stub()
  assert(r.productionReady === false, 'not production-ready: ' + r.form)
  assert(r.isolatedImplemented === true, 'isolated implemented: ' + r.form)
}
const forms = CALCULATION_GAPS.map((g) => g.form)
for (const need of ['Form 8962', 'Form 8995-A', 'Form 8863', 'Schedule B', 'Schedule D', 'Schedule E', 'Form 1040-X']) {
  assert(forms.includes(need), 'gap listed: ' + need)
}

console.log('=== Maximizer migration plan only ===')
assert(MAXIMIZER_MIGRATION_STEPS.some((s) => s.id === 'cutover' && s.status === 'blocked'), 'cutover blocked')
assert(MAXIMIZER_MIGRATION_STEPS.every((s) => s.id !== 'cutover' || s.touchesMaximizer), 'cutover touches maximizer')
const plan = maximizerMigrationSummary()
assert(plan.includes('NO interface'), 'plan preserves Maximizer interface')
console.log(plan.split('\\n')[0])

console.log('=== PHASE3_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync(
  'npx',
  ['--yes', 'tsx', join(tmp, 'run.ts')],
  { cwd: root, encoding: 'utf8', env: { ...process.env } },
)
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
