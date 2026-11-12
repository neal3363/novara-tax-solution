/**
 * End-to-end engine tests A–F for benefit-specific questionnaires + document checklist.
 * Run: node --experimental-strip-types is unavailable; use vite-node or compile.
 * This ESM runner imports built dist... actually we use dynamic import via tsx.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-test-runner')
mkdirSync(tmp, { recursive: true })

const runner = `
import { defaultProfile, applyAnswer, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import {
  nextBenefitSpecificQuestion,
  benefitQuestionnaireComplete,
  listSupportedBenefitQuestionnaires,
  getQuestionnaire,
} from '../src/engine/benefitQuestionnaires.ts'
import { buildDocumentChecklist, documentsStillNeeded } from '../src/engine/documentChecklist.ts'
import { formMappingFor } from '../src/engine/returnForms.ts'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  } else {
    console.log('OK:', msg)
  }
}

function answerAll(ruleId, answers) {
  let p = defaultProfile()
  // Clear SE income so mileage isn't auto-triggered unless we set it
  for (const [k, v] of Object.entries(answers)) {
    p = applyAnswer(p, k, v)
  }
  return p
}

function walkQuestionnaire(ruleId, answerFn) {
  let p = defaultProfile()
  // Keep wages; SE income from seed helps QBI/mileage triggers when answered yes
  const seen = new Set()
  for (let i = 0; i < 20; i++) {
    const q = nextBenefitSpecificQuestion(ruleId, p)
    if (!q) break
    if (seen.has(q.id)) throw new Error('loop on ' + q.id)
    seen.add(q.id)
    p = applyAnswer(p, q.mapsTo, answerFn(q, p))
  }
  return p
}

console.log('\\n=== Questionnaire catalog ===')
const catalog = listSupportedBenefitQuestionnaires()
assert(catalog.length >= 20, 'at least 20 benefit questionnaires (' + catalog.length + ')')
catalog.forEach((c) => console.log(' -', c.ruleId, c.title, 'qs=' + c.questionCount, 'cond=' + c.conditionalCount))

console.log('\\n=== Test A: Business Mileage ===')
{
  const first = nextBenefitSpecificQuestion('mileage', defaultProfile())
  assert(first?.mapsTo === 'business_vehicle', 'mileage starts with business_vehicle gate, got ' + first?.mapsTo)

  let p = walkQuestionnaire('mileage', (q) => {
    if (q.kind === 'yesno') return 'yes'
    if (q.mapsTo === 'total_miles') return 12000
    if (q.mapsTo === 'business_miles') return 4200
    if (q.kind === 'choice') return q.choices?.[0] ?? 'yes'
    return 'yes'
  })
  assert(benefitQuestionnaireComplete('mileage', p), 'mileage questionnaire complete')
  assert(p.businessMileage === 4200, 'business miles saved on profile (' + p.businessMileage + ')')
  const report = runBenefitOptimization(p)
  const f = report.findings.find((x) => x.ruleId === 'mileage')
  assert(f && (f.status === 'applied' || f.status === 'pending_verification'), 'mileage applied/pending, got ' + f?.status)
  assert((f?.affectingRefund ?? 0) > 0, 'mileage affecting refund > 0 (' + f?.affectingRefund + ')')
  assert(f?.form === 'Schedule C', 'mileage maps to Schedule C')
  const checklist = buildDocumentChecklist(p, [])
  const mileDocs = checklist.filter((d) => d.benefitId === 'mileage')
  assert(mileDocs.some((d) => d.name.includes('Mileage')), 'mileage log on checklist')
  console.log('  amount=', f?.affectingRefund, 'status=', f?.status, 'docs=', mileDocs.map((d) => d.name).join(', '))
}

console.log('\\n=== Test B: Education Credit (AOTC) ===')
{
  const first = nextBenefitSpecificQuestion('aotc', defaultProfile())
  assert(first?.mapsTo === 'education_expenses', 'AOTC starts with education_expenses')
  let p = walkQuestionnaire('aotc', (q) => {
    if (q.mapsTo === 'felony_drug') return 'no'
    if (q.mapsTo === 'tuition_paid') return 4000
    if (q.kind === 'yesno') return 'yes'
    return 'yes'
  })
  assert(benefitQuestionnaireComplete('aotc', p), 'AOTC complete')
  assert(p.tuitionPaid === 4000, 'tuition saved')
  const report = runBenefitOptimization(p)
  const f = report.findings.find((x) => x.ruleId === 'aotc')
  assert(f && (f.status === 'applied' || f.status === 'pending_verification'), 'AOTC applied/pending got ' + f?.status)
  assert((f?.affectingRefund ?? 0) === 2500, 'AOTC max credit 2500 got ' + f?.affectingRefund)
  assert(f?.form === 'Form 8863', 'AOTC form 8863')
  const checklist = buildDocumentChecklist(p, [])
  assert(checklist.some((d) => d.name.includes('1098-T')), '1098-T requested')
  // previously uploaded 1098-T
  const withDoc = buildDocumentChecklist(p, [
    {
      id: 'd1',
      name: '1098-T.pdf',
      type: '1098-T',
      taxYear: 2025,
      sizeLabel: '1mb',
      uploadedAt: new Date().toISOString(),
      status: 'extracted',
      confidence: 0.9,
      ownerId: 'u1',
      facts: [],
    },
  ])
  const t = withDoc.find((d) => d.name.includes('1098-T'))
  assert(t?.status === 'uploaded', '1098-T marked uploaded after match, got ' + t?.status)
}

console.log('\\n=== Test C: Childcare Credit ===')
{
  const first = nextBenefitSpecificQuestion('cdcc', defaultProfile())
  assert(first?.mapsTo === 'has_child', 'CDCC starts with has_child')
  // Dependent interview must complete before CDCC can affect a verified refund
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  for (const [k, v] of [
    ['dep_0_name', 'Care Kid'],
    ['dep_0_dob', '2018-01-01'],
    ['dep_0_tin_path', 'I will enter last 4 now'],
    ['dep_0_tin_last4', '9999'],
    ['dep_0_relationship', 'Daughter'],
    ['dep_0_months', 12],
    ['dep_0_shared_custody', 'no'],
    ['dep_0_own_support', 'no'],
    ['dep_0_another_claim', 'no'],
  ]) {
    p = applyAnswer(p, k, v)
  }
  p = walkQuestionnaire('cdcc', (q) => {
    if (q.mapsTo === 'childcare_amount') return 3000
    if (q.mapsTo === 'employer_dependent_care') return 'no'
    if (q.kind === 'yesno') return 'yes'
    return 'yes'
  })
  // re-apply dep answers after walk (walk starts from defaultProfile)
  p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  for (const [k, v] of [
    ['dep_0_name', 'Care Kid'],
    ['dep_0_dob', '2018-01-01'],
    ['dep_0_tin_path', 'I will enter last 4 now'],
    ['dep_0_tin_last4', '9999'],
    ['dep_0_relationship', 'Daughter'],
    ['dep_0_months', 12],
    ['dep_0_shared_custody', 'no'],
    ['dep_0_own_support', 'no'],
    ['dep_0_another_claim', 'no'],
  ]) {
    p = applyAnswer(p, k, v)
  }
  p = applyAnswer(p, 'paid_childcare', 'yes')
  p = applyAnswer(p, 'childcare_amount', 3000)
  p = applyAnswer(p, 'care_provider', 'yes')
  p = applyAnswer(p, 'employer_dependent_care', 'no')
  assert(p.childcarePaid === 3000, 'childcare amount saved')
  const report = runBenefitOptimization(p)
  const f = report.findings.find((x) => x.ruleId === 'cdcc')
  assert(f && (f.status === 'applied' || f.status === 'pending_verification'), 'CDCC applied got ' + f?.status)
  assert((f?.affectingRefund ?? 0) > 0, 'CDCC amount > 0')
  assert(f?.form === 'Form 2441', 'CDCC Form 2441')
  const checklist = buildDocumentChecklist(p, [])
  assert(checklist.some((d) => d.benefitId === 'cdcc' || d.name.toLowerCase().includes('childcare')), 'CDCC docs on checklist')
}

console.log('\\n=== Test D: Previously uploaded documents ===')
{
  let p = walkQuestionnaire('mortgage', (q) => {
    if (q.mapsTo === 'mortgage_interest_amount') return 12000
    if (q.kind === 'yesno') return 'yes'
    return 'yes'
  })
  // high enough to beat standard deduction comparison in checklist path
  p = applyAnswer(p, 'property_tax_amount', 6000)
  const docs = [
    {
      id: 'd2',
      name: 'Form-1098.pdf',
      type: '1098',
      taxYear: 2025,
      sizeLabel: '200kb',
      uploadedAt: new Date().toISOString(),
      status: 'verified',
      confidence: 0.95,
      ownerId: 'u1',
      facts: [],
    },
  ]
  const checklist = buildDocumentChecklist(p, docs)
  const m = checklist.find((d) => d.id === 'doc-1098')
  assert(m?.status === 'verified', '1098 verified from vault, got ' + m?.status)
  const needed = documentsStillNeeded(checklist)
  assert(!needed.some((d) => d.id === 'doc-1098'), 'verified 1098 not in still-needed')
}

console.log('\\n=== Test E: Ineligible benefit ===')
{
  let p = applyAnswer(defaultProfile(), 'business_vehicle', 'no')
  const report = runBenefitOptimization(p)
  const f = report.findings.find((x) => x.ruleId === 'mileage')
  assert(f?.status === 'ineligible', 'mileage ineligible on No, got ' + f?.status)
  assert((f?.affectingRefund ?? 0) === 0, 'no mileage amount applied')

  let p2 = walkQuestionnaire('aotc', (q) => {
    if (q.mapsTo === 'felony_drug') return 'yes' // disqualify
    if (q.mapsTo === 'tuition_paid') return 4000
    if (q.kind === 'yesno') return 'yes'
    return 'yes'
  })
  const r2 = runBenefitOptimization(p2)
  const a = r2.findings.find((x) => x.ruleId === 'aotc')
  assert(a?.status === 'ineligible', 'AOTC ineligible on felony drug yes, got ' + a?.status)
}

console.log('\\n=== Test F: Answer correction reevaluates ===')
{
  let p = walkQuestionnaire('mileage', (q) => {
    if (q.kind === 'yesno') return 'yes'
    if (q.mapsTo === 'total_miles') return 10000
    if (q.mapsTo === 'business_miles') return 3000
    if (q.kind === 'choice') return q.choices?.[0] ?? 'yes'
    return 'yes'
  })
  const before = runBenefitOptimization(p).findings.find((x) => x.ruleId === 'mileage')
  assert((before?.affectingRefund ?? 0) > 0, 'mileage applied before correction')
  // Correct: not eligible
  p = applyAnswer(p, 'business_vehicle', 'no')
  p = { ...p, businessMileage: 0, answers: { ...p.answers, business_vehicle: 'no' } }
  const after = runBenefitOptimization(p).findings.find((x) => x.ruleId === 'mileage')
  assert(after?.status === 'ineligible', 'after correction mileage ineligible')
  assert((after?.affectingRefund ?? 0) === 0, 'after correction amount cleared')

  // Correct childcare amount upward (with completed dependent interview)
  let c = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  c = applyAnswer(c, 'dependent_count', 1)
  for (const [k, v] of [
    ['dep_0_name', 'Care Kid'],
    ['dep_0_dob', '2018-01-01'],
    ['dep_0_tin_path', 'I will enter last 4 now'],
    ['dep_0_tin_last4', '9999'],
    ['dep_0_relationship', 'Daughter'],
    ['dep_0_months', 12],
    ['dep_0_shared_custody', 'no'],
    ['dep_0_own_support', 'no'],
    ['dep_0_another_claim', 'no'],
  ]) {
    c = applyAnswer(c, k, v)
  }
  c = applyAnswer(c, 'paid_childcare', 'yes')
  c = applyAnswer(c, 'childcare_amount', 2000)
  c = applyAnswer(c, 'care_provider', 'yes')
  c = applyAnswer(c, 'employer_dependent_care', 'no')
  const amt1 = runBenefitOptimization(c).findings.find((x) => x.ruleId === 'cdcc')?.affectingRefund ?? 0
  c = applyAnswer(c, 'childcare_amount', 6000)
  const amt2 = runBenefitOptimization(c).findings.find((x) => x.ruleId === 'cdcc')?.affectingRefund ?? 0
  assert(amt2 >= amt1 && amt2 > 0, 'higher childcare expense recalculates credit (' + amt1 + ' -> ' + amt2 + ')')
}

console.log('\\n=== Form mapping sanity ===')
for (const id of ['mileage', 'aotc', 'cdcc', 'ctc', 'mortgage', 'qbi']) {
  const m = formMappingFor(id)
  assert(!!m.form && !!m.field, id + ' has form mapping: ' + m.form + ' / ' + m.field)
}

if (failed) {
  console.error('\\n' + failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('\\nAll benefit workflow tests passed.')
`

writeFileSync(join(tmp, 'run.ts'), runner)

const r = spawnSync(
  'npx',
  ['--yes', 'tsx', join(tmp, 'run.ts')],
  { cwd: root, encoding: 'utf8', env: { ...process.env, NPM_CONFIG_YES: 'true' } },
)
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status ?? 1)
