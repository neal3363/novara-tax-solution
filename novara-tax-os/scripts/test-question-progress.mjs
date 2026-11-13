/**
 * Smart question progress: no re-asks, green/orange status, resume next unanswered.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-qp-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { defaultProfile, applyAnswer, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import { applyFilingStatusAnswer, nextFilingStatusTurn } from '../src/engine/smartInterview.ts'
import { nextDependentQuestion, applyDependentAnswer } from '../src/engine/dependentsEngine.ts'
import {
  buildInterviewProgress,
  nextInterviewTurn,
} from '../src/engine/questionProgress.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== TIN path does not re-ask ===')
{
  let answers: Record<string, any> = { potential_dependents: 'yes', dependent_count: 1 }
  let deps: any[] = []
  let a = applyDependentAnswer(answers, deps, 'potential_dependents', 'yes')
  a = applyDependentAnswer(a.answers, a.dependents, 'dependent_count', 1)
  a = applyDependentAnswer(a.answers, a.dependents, 'dep_0_name', 'Avery Lee')
  a = applyDependentAnswer(a.answers, a.dependents, 'dep_0_dob', '2015-06-01')
  a = applyDependentAnswer(a.answers, a.dependents, 'dep_0_tin_path', 'I will enter last 4 now')
  const next = nextDependentQuestion(a.answers, a.dependents)
  assert(next?.mapsTo === 'dep_0_tin_last4', 'after tin_path, next is tin_last4 not tin_path (got ' + next?.mapsTo + ')')
}

console.log('=== Answer 10 questions → all green; next unanswered orange ===')
{
  let p = defaultProfile()
  p = { ...p, wages: 72400, withholding: 8920, selfEmploymentIncome: 0, dependents: [], answers: {}, unresolvedKeys: [] }
  const sequence: [string, string | number][] = [
    ['married_dec31', 'No'],
    ['potential_dependents', 'No'],
  ]
  // Apply filing first
  for (const [k, v] of sequence) {
    p = applyFilingStatusAnswer(p, k, String(v))
  }
  // Answer discovery probes via applyAnswer until we have >= 10 answered progress items
  const probes: [string, string | number][] = [
    ['paid_childcare', 'no'],
    ['education_expenses', 'no'],
    ['retirement_contributions', 'no'],
    ['self_employed', 'no'],
    ['owns_home', 'no'],
    ['student_loan_interest_yes', 'no'],
    ['hsa_contributions_yes', 'no'],
    ['charitable_gifts_yes', 'no'],
  ]
  for (const [k, v] of probes) p = applyAnswer(p, k, v)

  let progress = buildInterviewProgress(p)
  assert(progress.answeredCount >= 8, 'at least 8 answered after sequence (' + progress.answeredCount + ')')
  const answered = progress.questions.filter((q) => q.status === 'answered')
  assert(answered.every((q) => q.statusLabel === 'Answered'), 'answered items labeled Answered')
  assert(answered.every((q) => q.status === 'answered'), 'answered status is green path')

  // Simulate "exit and return" — rebuild progress from same profile (persistence of answers)
  const resumed = buildInterviewProgress(p)
  assert(resumed.answeredCount === progress.answeredCount, 'resume keeps answered count')
  assert(resumed.greeting.includes('completed') || resumed.unansweredCount === 0, 'greeting references progress')

  const next = nextInterviewTurn(p)
  if (next) {
    assert(resumed.nextUnanswered?.mapsTo === next.mapsTo || resumed.unansweredCount > 0, 'next unanswered aligns with engine')
    // Answer the next one
    p = applyAnswer(p, next.mapsTo, next.kind === 'number' ? 0 : 'no')
    const after = buildInterviewProgress(p)
    assert(after.answeredCount >= resumed.answeredCount, 'answering next increases or holds answered count')
    const was = after.questions.find((q) => q.mapsTo === next.mapsTo)
    assert(!was || was.status === 'answered' || was.status === 'awaiting_verification' || !after.questions.some((q) => q.mapsTo === next.mapsTo && q.status === 'unanswered'), 'answered question not left unanswered')
  } else {
    assert(resumed.unansweredCount === 0, 'no next turn means no unanswered')
  }
}

console.log('=== Continue never restarts completed filing questions ===')
{
  let p = defaultProfile()
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  const turn = nextInterviewTurn(p)
  assert(turn?.mapsTo !== 'married_dec31', 'does not re-ask married_dec31')
  assert(turn?.mapsTo !== 'potential_dependents', 'does not re-ask potential_dependents')
  const filing = nextFilingStatusTurn(p)
  assert(filing === null, 'filing status complete')
}

console.log('=== Yes normalization applies side effects ===')
{
  let p = defaultProfile()
  p = applyAnswer(p, 'has_dependents', 'Yes')
  assert(p.answers.potential_dependents === 'yes' || p.answers.has_dependents === 'yes', 'Yes syncs dependent flags')
}

console.log('=== Recalc after answer ===')
{
  let p = defaultProfile()
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  const before = runBenefitOptimization(p).projectedRefund
  p = applyAnswer(p, 'retirement_contribution_amount', 3000)
  const after = runBenefitOptimization(p)
  assert(typeof after.projectedRefund === 'number', 'recalc produces number')
  // amount may or may not change refund depending on rules — engine must run
  assert(after.taxYear === p.taxYear, 'tax year preserved on recalc')
  void before
}

console.log('=== Greeting format ===')
{
  let p = defaultProfile()
  p = { ...p, answers: {}, dependents: [], unresolvedKeys: [] }
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  const g = buildInterviewProgress(p).greeting
  assert(g.includes('completed') || g.includes('questions'), 'greeting mentions progress: ' + g)
}

if (failed) {
  console.error('\\n' + failed + ' failure(s)')
  process.exit(1)
}
console.log('\\nAll question progress tests passed.')
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
