/**
 * Emergency questionnaire e2e — personal, dependents, business, edit, unanswered, resume.
 * Fictional taxpayers only. No network.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-q-e2e')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { defaultProfile, applyAnswer, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import { answerPresent } from '../src/engine/benefitAnswers.ts'
import { applyFilingStatusAnswer } from '../src/engine/smartInterview.ts'
import { applyDependentAnswer, nextDependentQuestion } from '../src/engine/dependentsEngine.ts'
import {
  buildInterviewProgress,
  nextInterviewTurn,
  resolveInterviewTurn,
} from '../src/engine/questionProgress.ts'
import {
  nextBenefitSpecificQuestion,
  benefitQuestionnaireComplete,
} from '../src/engine/benefitQuestionnaires.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

function grindDiscovery(p: any, answers: Record<string, string | number>, max = 40) {
  let profile = p
  const seen: string[] = []
  for (let i = 0; i < max; i++) {
    const t = nextInterviewTurn(profile)
    if (!t) break
    if (seen.filter((x) => x === t.mapsTo).length > 2) {
      throw new Error('loop on ' + t.mapsTo + ' after ' + seen.join(','))
    }
    seen.push(t.mapsTo)
    const override = answers[t.mapsTo]
    const v =
      override !== undefined
        ? override
        : t.kind === 'number'
          ? 0
          : t.kind === 'choice' && t.choices?.[0]
            ? t.choices[0]
            : 'no'
    if (t.phase === 'dependents' || t.mapsTo.startsWith('dep_') || t.mapsTo === 'potential_dependents' || t.mapsTo === 'dependent_count') {
      const stepped = applyDependentAnswer(profile.answers, profile.dependents, t.mapsTo, v, profile.taxYear)
      profile = { ...profile, answers: stepped.answers, dependents: stepped.dependents }
    } else if (['married_dec31','married_filing_plan','has_qualifying_person','maintained_home','potential_dependents','dependent_count'].includes(t.mapsTo)) {
      profile = applyFilingStatusAnswer(profile, t.mapsTo, String(v))
    } else {
      profile = applyAnswer(profile, t.mapsTo, v)
    }
  }
  return { profile, seen }
}

console.log('=== Test A — Personal return interview completes ===')
{
  let p = defaultProfile()
  p = { ...p, selfEmploymentIncome: 0, businessMileage: 0, wages: 55000, withholding: 6000, dependents: [], answers: {}, unresolvedKeys: [] }
  const { profile, seen } = grindDiscovery(p, {
    married_dec31: 'No',
    potential_dependents: 'no',
    education_expenses: 'no',
    student_loan_interest: 'no',
    retirement_contributions: 'no',
    self_employed: 'no',
    owns_home: 'no',
    had_marketplace: 'no',
    charitable_gifts: 'no',
    high_medical: 'no',
    filing_state: 'Texas',
  })
  assert(nextInterviewTurn(profile) === null, 'personal discovery reaches end')
  assert(seen.includes('self_employed'), 'asked self_employed')
  assert(seen.filter((x) => x === 'self_employed').length === 1, 'self_employed asked once')
  const progress = buildInterviewProgress(profile)
  assert(progress.unansweredCount === 0 || progress.nextUnanswered === null || nextInterviewTurn(profile) === null, 'no linear unanswered left')
}

console.log('=== Test B — Two dependents name → DOB advance ===')
{
  let p = applyAnswer(defaultProfile(), 'married_dec31', 'no')
  p = applyAnswer(p, 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 2)
  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_0_name', 'opens dep 0 name')
  let step = applyDependentAnswer(p.answers, p.dependents, 'dep_0_name', 'Avery Lee', p.taxYear)
  p = { ...p, answers: step.answers, dependents: step.dependents }
  assert(p.dependents[0]?.fullLegalName === 'Avery Lee', 'name 0 saved')
  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_0_dob', 'advances to DOB 0')
  step = applyDependentAnswer(p.answers, p.dependents, 'dep_0_dob', '2015-06-01', p.taxYear)
  p = { ...p, answers: step.answers, dependents: step.dependents }
  const finish0: [string, string | number][] = [
    ['dep_0_tin_path', 'I will enter last 4 now'],
    ['dep_0_tin_last4', '4321'],
    ['dep_0_relationship', 'Son'],
    ['dep_0_months', 12],
    ['dep_0_shared_custody', 'no'],
    ['dep_0_own_support', 'no'],
    ['dep_0_another_claim', 'no'],
  ]
  for (const [k, v] of finish0) {
    step = applyDependentAnswer(p.answers, p.dependents, k, v, p.taxYear)
    p = { ...p, answers: step.answers, dependents: step.dependents }
  }
  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_1_name', 'reaches dependent 1')
  step = applyDependentAnswer(p.answers, p.dependents, 'dep_1_name', 'Jordan Lee', p.taxYear)
  p = { ...p, answers: step.answers, dependents: step.dependents }
  assert(p.dependents[1]?.fullLegalName === 'Jordan Lee', 'name 1 saved')
  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_1_dob', 'advances to DOB 1')
}

console.log('=== Test C — Business / mileage does not freeze on No or zero miles ===')
{
  let p = defaultProfile()
  p = { ...p, selfEmploymentIncome: 0, businessMileage: 0, answers: {}, unresolvedKeys: [], dependents: [] }
  p = applyAnswer(p, 'business_vehicle', 'yes')
  p = applyAnswer(p, 'self_employed', 'no')
  assert(answerPresent(p, 'self_employed'), 'SE No present')
  assert(benefitQuestionnaireComplete('mileage', p), 'mileage complete after SE No')

  p = defaultProfile()
  p = { ...p, selfEmploymentIncome: 0, businessMileage: 0, answers: {}, unresolvedKeys: [], dependents: [] }
  p = applyAnswer(p, 'business_vehicle', 'yes')
  p = applyAnswer(p, 'self_employed', 'yes')
  p = applyAnswer(p, 'vehicle_type', 'Personal car')
  p = applyAnswer(p, 'total_miles', 10000)
  p = applyAnswer(p, 'business_miles', 0)
  assert(answerPresent(p, 'business_miles'), 'zero business miles counts as answered')
  assert(nextBenefitSpecificQuestion('mileage', p)?.mapsTo !== 'business_miles', 'advances past zero miles')
}

console.log('=== Test D — Edit existing answers reopens target ===')
{
  let p = defaultProfile()
  p = { ...p, selfEmploymentIncome: 0, businessMileage: 0, wages: 40000, dependents: [], answers: {}, unresolvedKeys: [] }
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  p = applyAnswer(p, 'education_expenses', 'no')
  p = applyAnswer(p, 'student_loan_interest', 'no')
  p = applyAnswer(p, 'retirement_contributions', 'yes')
  // Simulate clear of retirement_contributions (edit)
  const answers = { ...p.answers }
  delete answers.retirement_contributions
  p = { ...p, answers, retirementContributions: 0 }
  assert(!answerPresent(p, 'retirement_contributions'), 'cleared retirement not present')
  const focused = resolveInterviewTurn(p, 'retirement_contributions')
  assert(focused?.mapsTo === 'retirement_contributions', 'Edit focus opens retirement_contributions got ' + focused?.mapsTo)
  assert(focused?.kind === 'yesno', 'retirement kind yesno')
}

console.log('=== Test E — Orange unanswered opens via resolve ===')
{
  let p = defaultProfile()
  p = { ...p, selfEmploymentIncome: 0, businessMileage: 0, dependents: [], answers: {}, unresolvedKeys: [] }
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  const progress = buildInterviewProgress(p)
  const unanswered = progress.questions.filter((q) => q.status === 'unanswered').slice(0, 5)
  assert(unanswered.length >= 3, 'has unanswered orange questions')
  for (const q of unanswered) {
    const turn = resolveInterviewTurn(p, q.mapsTo)
    assert(turn?.mapsTo === q.mapsTo, 'opens orange ' + q.mapsTo + ' got ' + turn?.mapsTo)
  }
}

console.log('=== Test F — Resume keeps answers / next unanswered ===')
{
  let p = defaultProfile()
  p = { ...p, selfEmploymentIncome: 0, businessMileage: 0, dependents: [], answers: {}, unresolvedKeys: [] }
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  p = applyAnswer(p, 'education_expenses', 'no')
  const saved = JSON.parse(JSON.stringify(p))
  const before = nextInterviewTurn(saved)?.mapsTo
  const after = nextInterviewTurn(JSON.parse(JSON.stringify(saved)))?.mapsTo
  assert(before === after, 'resume same next unanswered')
  assert(answerPresent(saved, 'education_expenses'), 'saved answer intact')
}

console.log('=== Test H — Invalid empty name does not count as saved ===')
{
  assert(!answerPresent({ ...defaultProfile(), answers: { dep_0_name: '  ' }, dependents: [] } as any, 'dep_0_name'), 'whitespace name not present')
}

console.log('=== Test I — Calc after answers does not throw ===')
{
  let p = defaultProfile()
  p = { ...p, selfEmploymentIncome: 0, businessMileage: 0, wages: 60000, withholding: 7000, dependents: [], answers: {}, unresolvedKeys: [] }
  const { profile } = grindDiscovery(p, {
    married_dec31: 'No',
    potential_dependents: 'no',
    self_employed: 'yes',
    owns_home: 'no',
    education_expenses: 'no',
    student_loan_interest: 'no',
    retirement_contributions: 'no',
    had_marketplace: 'no',
    charitable_gifts: 'no',
    high_medical: 'no',
    filing_state: 'Texas',
  })
  const report = runBenefitOptimization(profile)
  assert(typeof report.projectedRefund === 'number', 'refund number after full interview')
}

if (failed) {
  console.error('\\n' + failed + ' failure(s)')
  process.exit(1)
}
console.log('\\nAll questionnaire emergency e2e checks passed.')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, npm_config_yes: 'true' },
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status ?? 1)
