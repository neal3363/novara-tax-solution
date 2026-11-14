import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-multiyear-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  PRIOR_YEAR_SURCHARGE,
  TC_PERSONAL_FEE,
  TC_BUSINESS_FEE,
  quoteMultiYearOrder,
} from '../src/data/fees.ts'
import {
  availableTaxYears,
  buildTaxYearCatalog,
  historicalRulePack,
  resolveFilingSeason,
} from '../src/engine/taxYearCatalog.ts'
import { assessAmendment } from '../src/engine/amendmentEngine.ts'
import { estimatePenaltiesAndInterest } from '../src/engine/penaltyInterestEngine.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

// Freeze season as 2026 preparing 2025
const asOf = new Date(Date.UTC(2026, 10, 12))
const season = resolveFilingSeason(asOf)
assert(season.seasonYear === 2026, 'Season year 2026')
assert(season.currentTaxYear === 2025, 'Current tax year 2025')

console.log('=== Required TC order 2022–2025 personal ===')
const quote = quoteMultiYearOrder(
  'TC',
  [
    { taxYear: 2025, kind: 'personal', filingMode: 'original' },
    { taxYear: 2024, kind: 'personal', filingMode: 'original' },
    { taxYear: 2023, kind: 'personal', filingMode: 'original' },
    { taxYear: 2022, kind: 'personal', filingMode: 'original' },
  ],
  { currentTaxYear: 2025, seasonYear: 2026 },
)
assert(TC_PERSONAL_FEE === 300, 'TC personal 300')
assert(quote.basePreparationTotal === TC_PERSONAL_FEE * 4, 'Base fees 4× TC personal got ' + quote.basePreparationTotal)
assert(quote.priorYearCount === 3, 'Three prior years')
assert(PRIOR_YEAR_SURCHARGE === 250, 'Surcharge 250')
assert(quote.priorYearSurchargeTotal === 750, 'Prior surcharge 750')
assert(
  quote.preparationGrandTotal === TC_PERSONAL_FEE * 4 + 750,
  'Total 4× personal + surcharge got ' + quote.preparationGrandTotal,
)

console.log('=== Surcharge once per year with personal+business ===')
const mixed = quoteMultiYearOrder(
  'TC',
  [
    { taxYear: 2024, kind: 'both', filingMode: 'original' },
    { taxYear: 2025, kind: 'personal', filingMode: 'original' },
  ],
  { currentTaxYear: 2025, seasonYear: 2026 },
)
assert(mixed.basePreparationTotal === TC_PERSONAL_FEE + TC_BUSINESS_FEE + TC_PERSONAL_FEE, 'Base personal+business+personal')
assert(mixed.priorYearCount === 1, 'Only one prior year (2024)')
assert(mixed.priorYearSurchargeTotal === 250, 'Surcharge not duplicated for both returns')
assert(
  mixed.lines.filter((l) => l.kind === 'prior_year_surcharge').length === 1,
  'Single surcharge line for 2024',
)

console.log('=== Availability ===')
const available = availableTaxYears(season).map((y) => y.taxYear)
assert(available.includes(2025) && available.includes(2022), '2022–2025 available')
assert(!available.includes(2015), '2015 not in available list')
const catalog = buildTaxYearCatalog(season)
assert(catalog.some((y) => y.taxYear === 2015 && y.status === 'not_available'), '2015 marked unavailable')
let threw = false
try { historicalRulePack(2015) } catch { threw = true }
assert(threw, 'historicalRulePack rejects unavailable year')
const pack2022 = historicalRulePack(2022)
assert(pack2022.taxYear === 2022 && pack2022.standardDeductionSingle === 12950, '2022 rules distinct')
const pack2025 = historicalRulePack(2025)
assert(pack2025.standardDeductionSingle !== pack2022.standardDeductionSingle, 'Do not use same deduction as 2022')

console.log('=== Amendments & deadlines ===')
const amend = assessAmendment({
  taxYear: 2022,
  mode: 'amended',
  isBusiness: false,
  original: {
    taxYear: 2022,
    agiReported: 50000,
    taxReported: 4000,
    refundOrBalanceReported: 500,
    filedOn: '2023-04-10',
    source: 'transcript',
  },
  corrections: [{ field: 'refund', correctedAmount: 900, explanation: 'Missed withholding' }],
  asOf,
})
assert(amend.amendedForm === '1040-X', '1040-X for personal amendment')
assert(amend.explanationRequired, 'Explanation required')
assert(typeof amend.refundClaimOpen === 'boolean', 'Refund window evaluated')

const expired = assessAmendment({
  taxYear: 2018,
  mode: 'original',
  isBusiness: false,
  asOf: new Date(Date.UTC(2026, 10, 12)),
})
// 2018 may be unavailable engine — still evaluates deadline math
assert(expired.refundClaimWarning || !expired.refundClaimOpen || expired.filingMethod === 'unavailable', 'Old year warns or unavailable')

console.log('=== Penalties separate from NOVARA fees ===')
const penalties = estimatePenaltiesAndInterest({
  taxYear: 2023,
  taxDue: 2000,
  amountPaidByDueDate: 0,
  asOf,
})
assert(penalties.verifiedFromIrs === false, 'Penalties labeled unverified estimates')
assert(penalties.totalEstimate > 0, 'Penalty estimate computed')
assert(penalties.disclaimer.toLowerCase().includes('novara'), 'Disclaimer separates NOVARA fees')

if (failed) {
  console.error(failed + ' multi-year failures')
  process.exit(1)
}
console.log('All multi-year pricing tests passed')
`,
)

const result = spawnSync(
  'npx',
  ['--yes', 'tsx', join(tmp, 'run.ts')],
  { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' } },
)
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(result.status ?? 1)
