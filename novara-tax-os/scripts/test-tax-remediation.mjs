/**
 * Tax remediation golden tests — HSA / energy / IRA / education / QSS / state worksheets.
 * Cutover remains OFF. Synthetic only.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-tax-remediation')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { defaultProfile, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import { computeIrsFederalReturn } from '../src/engine/irs/federalReturn.ts'
import { computeForm8889 } from '../src/engine/irs/forms/form8889Hsa.ts'
import { computeForm5695 } from '../src/engine/irs/forms/form5695Energy.ts'
import { computeIraDeduction } from '../src/engine/irs/forms/iraDeduction.ts'
import { profileToIrsInput } from '../src/engine/irs/compareDemo.ts'
import { runStagingAdapter, detectUnsupportedSituations } from '../src/engine/irs/phase9/stagingAdapter.ts'
import { cutoverReady, mayShowIrsToTaxpayer } from '../src/engine/irs/index.ts'
import {
  computeCa540Worksheet, computeNyItWorksheet, computeForm1065, computeDepreciation,
} from '../src/engine/returns/phase11/index.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'pricing intact')
assert(cutoverReady() === false && mayShowIrsToTaxpayer() === false, 'cutover/visibility OFF')

console.log('=== HSA Form 8889 golden ===')
const hsa = computeForm8889({ taxYear: 2025, contributions: 4000, annualLimit: 4300 })
assert(hsa.deductibleContribution === 4000 && hsa.productionReady === false, 'HSA deductible under limit')
const hsaOver = computeForm8889({ taxYear: 2025, contributions: 6000, annualLimit: 4300, employerContributions: 0 })
assert(hsaOver.deductibleContribution === 4300 && hsaOver.excessContribution === 1700, 'HSA excess capped')

const hsaRet = computeIrsFederalReturn({
  taxYear: 2025, filingStatus: 'single', wages: 80000, withholding: 10000,
  selfEmploymentNetProfit: 0, hsaContribution: 3000,
})
assert(hsaRet.hsaDeduction === 3000, 'federal AGI includes HSA deduction')
assert(hsaRet.unsupportedCases.some(c => c.includes('hsa')), 'HSA eligibility review flagged')

console.log('=== Energy Form 5695 partial golden ===')
const en = computeForm5695({ taxYear: 2025, qualifiedImprovementSpend: 5000 })
assert(en.creditBeforeTaxLimit === 1200 && en.fullyMapped === false, 'energy capped partial credit')
const enRet = computeIrsFederalReturn({
  taxYear: 2025, filingStatus: 'single', wages: 90000, withholding: 12000,
  selfEmploymentNetProfit: 0, residentialEnergySpend: 5000,
})
assert(enRet.residentialEnergyCredit > 0 && enRet.residentialEnergyCredit <= 1200, 'energy credit applied')
assert(enRet.unsupportedCases.some(c => c.includes('5695')), 'energy review flagged')

console.log('=== IRA deduction golden ===')
const ira = computeIraDeduction({
  taxYear: 2025, contributions: 7000, filingStatus: 'single', magi: 50000, coveredByWorkplacePlan: false,
})
assert(ira.deductible === 7000, 'IRA full deductible without workplace plan')
const iraPhase = computeIraDeduction({
  taxYear: 2025, contributions: 7000, filingStatus: 'single', magi: 90000, coveredByWorkplacePlan: true,
})
assert(iraPhase.deductible === 0, 'IRA fully phased out')
const iraRet = computeIrsFederalReturn({
  taxYear: 2025, filingStatus: 'single', wages: 60000, withholding: 8000,
  selfEmploymentNetProfit: 0, iraContribution: 5000,
})
assert(iraRet.iraDeduction === 5000, 'federal IRA deduction')

console.log('=== Education mapping when type present ===')
let p = defaultProfile()
p = { ...p, tuitionPaid: 4000, answers: { ...p.answers, education_credit_type: 'aotc' }, unresolvedKeys: [] }
const mapped = profileToIrsInput(p)
assert(mapped.educationStudents?.[0].creditType === 'aotc', 'education mapped to AOTC')
const eduAd = runStagingAdapter(p)
assert(!eduAd.unsupportedSituations.includes('education_credit_needs_followup_questions'), 'education followup cleared when typed')

p = { ...p, answers: { ...p.answers, education_credit_type: undefined } }
assert(detectUnsupportedSituations(p, null).some(x => x.includes('education_credit_needs_followup')), 'education followup when missing')

console.log('=== QSS Maximizer status ===')
const qss = { ...defaultProfile(), filingStatus: 'qss' as const, unresolvedKeys: [] }
const qssMax = runBenefitOptimization(qss)
assert(Boolean(qssMax), 'Maximizer accepts qss filingStatus')
const qssIrs = profileToIrsInput(qss)
assert(qssIrs.filingStatus === 'qss', 'QSS maps to IRS qss')

console.log('=== Maximizer hypothetical vs verified + escalate ===')
const energyProf = { ...defaultProfile(), energyImprovements: 2000, unresolvedKeys: [] }
const energyAd = runStagingAdapter(energyProf)
assert(energyAd.fullyValidated === false, 'energy not fullyValidated')
assert(energyAd.unsupportedSituations.some(s => s.includes('energy')), 'energy escalated')
assert(energyAd.maximizer.potentialSavings !== undefined && energyAd.taxpayerVisible === false, 'hypothetical path; IRS not taxpayer visible')

console.log('=== State worksheets CA/NY ===')
const ca = computeCa540Worksheet({
  taxYear: 2025, stateCode: 'CA', filingStatus: 'single', residency: 'nonresident',
  federalAgi: 100000, wagesInState: 25000, wagesOutOfState: 75000, stateWithholding: 1000,
})
assert(ca.worksheet.productionReady === false && ca.worksheet.californiaSourceIncome === 25000, 'CA 540NR worksheet')
const ny = computeNyItWorksheet({
  taxYear: 2025, stateCode: 'NY', filingStatus: 'single', residency: 'part_year', monthsResident: 6,
  federalAgi: 100000, wagesInState: 40000, wagesOutOfState: 60000, stateWithholding: 2000,
})
assert(ny.worksheet.localTaxIncluded === false, 'NY local taxes excluded')

console.log('=== Business depreciation / K-1 ===')
const dep = computeDepreciation({ costBasis: 10000, section179Election: 2000, recoveryYears: 5, yearInService: 1 })
assert(dep.section179 === 2000 && dep.total === 2000 + Math.round(8000 * 0.2), 'depreciation golden')
const k1 = computeForm1065({
  taxYear: 2025, entityName: 'Rem LLC', einSynthetic: 'XX', grossReceipts: 100000,
  ordinaryExpenses: 40000, depreciationExpense: 10000,
  partners: [{ id: 'a', name: 'A', ownershipPercent: 60 }, { id: 'b', name: 'B', ownershipPercent: 40 }],
})
assert(k1.ordinaryBusinessIncome === 50000 && k1.k1s[0].ordinaryBusinessIncome === 30000, 'K-1 60/40')
assert(k1.liveEfile === false, 'business e-file still OFF')

console.log('=== PHASE_TAX_REMEDIATION_OK failed=' + failed + ' ===')
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
