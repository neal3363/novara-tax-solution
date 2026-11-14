/**
 * Independent verification of isolated IRS TY2022–2025 modules.
 * Also compares demo benefitOptimizer vs IRS results (read-only).
 * Does NOT wire IRS modules into the live UI.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-irs-engine-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  computeIrsFederalReturn,
  getYearTables,
  supportedIrsTaxYears,
  taxFromBrackets,
  runDemoIrsComparisonReport,
  TABLES_2022,
  TABLES_2025,
} from '../src/engine/irs/index.ts'
import { securityArchitectureSummary as secSum, authorizeStub as authz } from '../src/engine/securityArchitecture.ts'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Pricing precondition (unchanged) ===')
assert(TC_PERSONAL_FEE === 300, 'TC personal still 300')
assert(TC_BUSINESS_FEE === 399, 'TC business still 399')

console.log('=== Year modules present ===')
assert(supportedIrsTaxYears().join(',') === '2022,2023,2024,2025', 'years 2022-2025')
assert(getYearTables(2022)?.standardDeduction.single === 12950, '2022 std single 12950')
assert(getYearTables(2023)?.standardDeduction.mfj === 27700, '2023 std MFJ 27700')
assert(getYearTables(2024)?.standardDeduction.hoh === 21900, '2024 std HOH 21900')
assert(getYearTables(2025)?.standardDeduction.single === 15000, '2025 std single 15000')
assert(TABLES_2022.ctcPerChild === 2000 && TABLES_2025.actcMaxPerChild === 1700, 'CTC/ACTC params')

console.log('=== Progressive tax brackets ===')
{
  const tax = taxFromBrackets(50000, TABLES_2025.brackets.single)
  // 10%*11925 + 12%*(48475-11925) + 22%*(50000-48475)
  const expected = Math.round(11925 * 0.1 + (48475 - 11925) * 0.12 + (50000 - 48475) * 0.22)
  assert(tax === expected, '2025 single $50k tax matches bracket math got ' + tax + ' expected ' + expected)
}

console.log('=== Filing statuses ===')
for (const fs of ['single', 'mfj', 'mfs', 'hoh', 'qss'] as const) {
  const r = computeIrsFederalReturn({
    taxYear: 2025,
    filingStatus: fs,
    wages: 60000,
    withholding: 6000,
    selfEmploymentNetProfit: 0,
  })
  assert(r.standardDeduction === getYearTables(2025)!.standardDeduction[fs], 'std ded ' + fs)
  assert(r.incomeTaxBeforeCredits > 0, 'tax computed ' + fs)
}

console.log('=== Dependents / CTC / ACTC / CDCC ===')
{
  const r = computeIrsFederalReturn({
    taxYear: 2024,
    filingStatus: 'hoh',
    wages: 40000,
    withholding: 2000,
    selfEmploymentNetProfit: 0,
    childcareExpenses: 4000,
    dependents: [
      { qualifiesCtc: true, qualifiesOdc: false, qualifiesEitcChild: true, qualifiesCdcc: true },
    ],
  })
  assert(r.ctc + r.actc > 0, 'CTC/ACTC applied')
  assert(r.cdcc > 0, 'CDCC applied')
  assert(r.eitc >= 0, 'EITC computed')
}

console.log('=== Self-employment + QBI ===')
{
  const r = computeIrsFederalReturn({
    taxYear: 2023,
    filingStatus: 'single',
    wages: 0,
    withholding: 0,
    selfEmploymentNetProfit: 40000,
    qbiAmount: 40000,
  })
  assert(r.seTax > 0, 'SE tax > 0')
  assert(r.qbiDeduction > 0, 'QBI deduction > 0')
}

console.log('=== Itemized vs standard ===')
{
  const r = computeIrsFederalReturn({
    taxYear: 2025,
    filingStatus: 'single',
    wages: 100000,
    withholding: 18000,
    selfEmploymentNetProfit: 0,
    itemizedDeductions: {
      mortgageInterest: 12000,
      stateLocalTaxes: 15000,
      charitable: 5000,
    },
  })
  assert(r.itemizedDeduction === 12000 + 10000 + 5000, 'SALT capped at 10000')
  assert(r.usedItemized === true, 'uses itemized when larger')
}

console.log('=== Prior-year isolation ===')
{
  const a = computeIrsFederalReturn({
    taxYear: 2022, filingStatus: 'single', wages: 50000, withholding: 5000, selfEmploymentNetProfit: 0,
  })
  const b = computeIrsFederalReturn({
    taxYear: 2025, filingStatus: 'single', wages: 50000, withholding: 5000, selfEmploymentNetProfit: 0,
  })
  assert(a.standardDeduction !== b.standardDeduction, 'std ded differs by year')
  assert(a.incomeTaxBeforeCredits !== b.incomeTaxBeforeCredits, 'tax differs by year for same wages')
}

console.log('=== Amended-style scenario (original vs corrected wages) ===')
{
  const original = computeIrsFederalReturn({
    taxYear: 2024, filingStatus: 'single', wages: 45000, withholding: 4000, selfEmploymentNetProfit: 0,
  })
  const corrected = computeIrsFederalReturn({
    taxYear: 2024, filingStatus: 'single', wages: 52000, withholding: 4000, selfEmploymentNetProfit: 0,
  })
  assert(corrected.taxableIncome > original.taxableIncome, 'corrected wages raise taxable income')
  assert(corrected.refundOrBalanceDue !== original.refundOrBalanceDue, 'refund/balance changes on amendment facts')
}

console.log('=== PTC simplified path ===')
{
  const r = computeIrsFederalReturn({
    taxYear: 2025,
    filingStatus: 'single',
    wages: 30000,
    withholding: 1000,
    selfEmploymentNetProfit: 0,
    marketplaceCoverage: true,
    annualPremium: 6000,
    aptcReceived: 0,
    householdIncomeForPtc: 30000,
  })
  assert(typeof r.ptc === 'number', 'PTC numeric')
  assert(r.notes.some((n) => n.toLowerCase().includes('8962') || n.toLowerCase().includes('simplified')), 'PTC limitation noted')
}

console.log('=== Independently checked expected: 2025 single $50k wages, $5k withholding, no deps ===')
{
  const r = computeIrsFederalReturn({
    taxYear: 2025,
    filingStatus: 'single',
    wages: 50000,
    withholding: 5000,
    selfEmploymentNetProfit: 0,
  })
  assert(r.agi === 50000, 'AGI 50000')
  assert(r.deductionTaken === 15000, 'std ded 15000')
  assert(r.taxableIncome === 35000, 'TI 35000')
  const expectedTax = taxFromBrackets(35000, getYearTables(2025)!.brackets.single)
  assert(r.incomeTaxBeforeCredits === expectedTax, 'income tax matches brackets')
  assert(r.refundOrBalanceDue === 5000 - expectedTax, 'refund = withholding - tax')
}

console.log('=== Demo vs IRS comparison report ===')
{
  const report = runDemoIrsComparisonReport()
  assert(report.rows.length >= 4, 'comparison rows')
  for (const row of report.rows) {
    console.log(
      'COMPARE',
      row.label,
      'demo=',
      row.demoProjectedRefund,
      'irs=',
      row.irsRefundOrBalanceDue,
      'delta=',
      row.delta,
    )
    assert(typeof row.delta === 'number', 'delta number for ' + row.label)
  }
  // Seed-like demo often diverges materially from progressive IRS tax
  const anyDiverge = report.rows.some((r) => Math.abs(r.delta) > 100)
  assert(anyDiverge, 'demo and IRS diverge on at least one scenario (expected until migration)')
}

console.log('=== Security architecture stubs ===')
{
  const sum = secSum()
  assert(sum.includes('Server-side authorization'), 'authz designed')
  assert(sum.includes('Multi-factor'), 'mfa designed')
  const d = authz({ principalId: 'u1', tenantId: 't1', action: 'read', resource: 'return:1' })
  assert(d.allowed === false, 'authz stub denies by default')
}

if (failed) {
  console.error('\\n' + failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('\\nAll isolated IRS engine + comparison + security architecture checks passed')
`,
)

const r = spawnSync('npx', ['tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
if (r.status !== 0) process.exit(r.status ?? 1)
