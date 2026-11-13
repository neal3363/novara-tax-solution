/**
 * E2E engine test: dependent name Answer must save, mark progress green, and advance to DOB.
 * Guards the InterviewChoice text-path bug (name questions previously had no input / no submit).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-dep-name-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { defaultProfile, applyAnswer } from '../src/engine/benefitOptimizer.ts'
import {
  applyDependentAnswer,
  nextDependentQuestion,
  getDiscoveryState,
} from '../src/engine/dependentsEngine.ts'
import { buildInterviewProgress, nextInterviewTurn } from '../src/engine/questionProgress.ts'
import { answerPresent } from '../src/engine/benefitAnswers.ts'

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('FAIL', msg); failed++ }
  else console.log('OK', msg)
}

console.log('=== Dependent name → Answer → advance ===')
{
  // Filing-status gate (incl. maintained_home) must be clear so nextInterviewTurn reaches dep name
  let p = applyAnswer(defaultProfile(), 'married_dec31', 'no')
  p = applyAnswer(p, 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 2)
  p = applyAnswer(p, 'maintained_home', 'yes')
  assert(p.dependents.length === 2, 'two dependent slots created')

  const before = nextDependentQuestion(p.answers, p.dependents)
  assert(before?.mapsTo === 'dep_0_name', 'first open question is dependent 1 name')
  assert(before?.kind === 'text', 'name question kind is text (needs text input UI)')

  const turnBefore = nextInterviewTurn(p)
  assert(turnBefore?.mapsTo === 'dep_0_name', 'unified turn is dep_0_name')
  assert(turnBefore?.kind === 'text', 'unified turn exposes text kind')

  // Simulate Answer button confirming the typed name
  const applied = applyDependentAnswer(p.answers, p.dependents, 'dep_0_name', 'Emma Blake', p.taxYear)
  p = { ...p, answers: applied.answers, dependents: applied.dependents }

  assert(p.dependents[0].fullLegalName === 'Emma Blake', 'name saved on dependent record')
  assert(p.answers['dep_0_name'] === 'Emma Blake', 'name saved in answers map')
  assert(answerPresent(p, 'dep_0_name'), 'answerPresent reports name answered')
  assert(p.dependents.length === 2, 'no duplicate dependent created on answer')

  const progress = buildInterviewProgress(p)
  const nameQ = progress.questions.find((q) => q.mapsTo === 'dep_0_name')
  assert(nameQ?.status === 'answered', 'progress indicator green/answered for name')

  const after = nextDependentQuestion(p.answers, p.dependents)
  assert(after?.mapsTo === 'dep_0_dob', 'advances to date of birth next')
  assert(after?.kind === 'date', 'DOB question kind is date')

  const turnAfter = nextInterviewTurn(p)
  assert(turnAfter?.mapsTo === 'dep_0_dob', 'unified next turn is DOB')

  // Second press with same name must not add a third dependent
  const again = applyDependentAnswer(p.answers, p.dependents, 'dep_0_name', 'Emma Blake', p.taxYear)
  assert(again.dependents.length === 2, 'repeat Answer does not duplicate dependents')
  assert(again.dependents[0].fullLegalName === 'Emma Blake', 'repeat Answer keeps same record')
}

console.log('=== Empty name rejected by engine contract (UI validates before call) ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  const blank = applyDependentAnswer(p.answers, p.dependents, 'dep_0_name', '   ', p.taxYear)
  // Engine stores trimmed empty — UI must block before this; next question stays name
  assert(!blank.dependents[0].fullLegalName, 'whitespace-only name does not count as filled')
  const still = nextDependentQuestion(blank.answers, blank.dependents)
  assert(still?.mapsTo === 'dep_0_name', 'still on name until a real value is saved')
}

console.log('=== Multi-child name → DOB (then finish child 0 so child 1 name opens) ===')
{
  let p = applyAnswer(defaultProfile(), 'married_dec31', 'no')
  p = applyAnswer(p, 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 2)

  // Child 0: name → DOB
  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_0_name', 'child 0 name next')
  let step = applyDependentAnswer(p.answers, p.dependents, 'dep_0_name', 'Avery Lee', p.taxYear)
  p = { ...p, answers: step.answers, dependents: step.dependents }
  assert(p.dependents[0].fullLegalName === 'Avery Lee', 'child 0 name stored')
  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_0_dob', 'child 0 advances to DOB')
  step = applyDependentAnswer(p.answers, p.dependents, 'dep_0_dob', '2018-06-01', p.taxYear)
  p = { ...p, answers: step.answers, dependents: step.dependents }

  // Finish remaining child-0 facts so interview opens child 1 name
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

  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_1_name', 'child 1 name next after child 0 complete')
  step = applyDependentAnswer(p.answers, p.dependents, 'dep_1_name', 'Jordan Lee', p.taxYear)
  p = { ...p, answers: step.answers, dependents: step.dependents }
  assert(p.dependents[1].fullLegalName === 'Jordan Lee', 'child 1 name stored')
  assert(nextDependentQuestion(p.answers, p.dependents)?.mapsTo === 'dep_1_dob', 'child 1 advances to DOB')
  step = applyDependentAnswer(p.answers, p.dependents, 'dep_1_dob', '2020-01-10', p.taxYear)
  p = { ...p, answers: step.answers, dependents: step.dependents }

  assert(getDiscoveryState(p.answers, p.dependents).declaredCount === 2, 'still two declared')
  assert(p.dependents[0].fullLegalName === 'Avery Lee' && p.dependents[1].fullLegalName === 'Jordan Lee', 'both children named')
  assert(p.dependents.every((d) => d.dateOfBirth), 'both children have DOB started')
}

if (failed) {
  console.error(failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('\\nAll dependent name Answer e2e checks passed.')
`,
)

const run = spawnSync(
  'npx',
  ['--yes', 'tsx', join(tmp, 'run.ts')],
  { cwd: root, encoding: 'utf8', env: process.env },
)
process.stdout.write(run.stdout || '')
process.stderr.write(run.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(run.status === 0 ? 0 : 1)
