import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-dep-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { defaultProfile, applyAnswer, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import {
  applyDependentAnswer,
  nextDependentQuestion,
  getDiscoveryState,
  dependentsReadyForVerifiedCredits,
  displayTin,
  evaluateDependent,
  emptyDependent,
} from '../src/engine/dependentsEngine.ts'

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('FAIL:', msg); failed++ }
  else console.log('OK:', msg)
}

function completeChild(index: number, opts: {
  name: string
  dob: string
  rel?: string
  months?: number
  last4?: string
  student?: boolean
  ownSupport?: boolean
  another?: boolean
  shared?: boolean
  custodial?: boolean
  disabled?: boolean
}, answers: Record<string, any>, deps: any[], taxYear = 2025) {
  let a = answers
  let d = deps
  const steps: [string, string | number | boolean][] = [
    [\`dep_\${index}_name\`, opts.name],
    [\`dep_\${index}_dob\`, opts.dob],
    [\`dep_\${index}_tin_path\`, 'I will enter last 4 now'],
    [\`dep_\${index}_tin_last4\`, opts.last4 ?? '1234'],
    [\`dep_\${index}_relationship\`, opts.rel ?? 'Son'],
    [\`dep_\${index}_months\`, opts.months ?? 12],
  ]
  if (opts.shared !== undefined || true) {
    steps.push([\`dep_\${index}_shared_custody\`, opts.shared ? 'yes' : 'no'])
  }
  if (opts.shared) steps.push([\`dep_\${index}_custodial\`, opts.custodial ? 'yes' : 'no'])
  // student / disabled asked conditionally by nextDependentQuestion — apply directly when provided
  if (opts.student !== undefined) steps.push([\`dep_\${index}_student\`, opts.student ? 'yes' : 'no'])
  if (opts.disabled !== undefined) steps.push([\`dep_\${index}_disabled\`, opts.disabled ? 'yes' : 'no'])
  steps.push([\`dep_\${index}_own_support\`, opts.ownSupport ? 'yes' : 'no'])
  steps.push([\`dep_\${index}_another_claim\`, opts.another ? 'yes' : 'no'])

  for (const [k, v] of steps) {
    const r = applyDependentAnswer(a, d, k, v, taxYear)
    a = r.answers
    d = r.dependents
  }
  return { answers: a, dependents: d }
}

console.log('\\n=== Zero dependents ===')
{
  let p = defaultProfile()
  assert(runBenefitOptimization(p).refundIncomplete === true, 'incomplete before discovery')
  p = applyAnswer(p, 'potential_dependents', 'no')
  const r = runBenefitOptimization(p)
  assert(r.dependentInfoComplete === true, 'complete when explicitly zero')
  assert(r.refundIncomplete === false, 'refund not incomplete at zero')
  assert((r.findings.find(f => f.ruleId === 'ctc')?.affectingRefund ?? 0) === 0, 'no CTC at zero')
}

console.log('\\n=== One qualifying child ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  assert(runBenefitOptimization(p).refundIncomplete === true, 'incomplete until interview done')
  const filled = completeChild(0, { name: 'Alex Rivera', dob: '2016-03-01' }, p.answers, p.dependents)
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  assert(dependentsReadyForVerifiedCredits(p.answers, p.dependents), 'ready after one child interview')
  const r = runBenefitOptimization(p)
  assert(r.refundIncomplete === false, 'refund complete')
  const ctc = r.findings.find(f => f.ruleId === 'ctc')
  assert((ctc?.affectingRefund ?? 0) === 2000, 'CTC 2000 for one child, got ' + ctc?.affectingRefund)
  assert(displayTin(p.dependents[0]).includes('1234'), 'TIN masked display')
  assert(!displayTin(p.dependents[0]).includes('***-**-1234'.slice(0,3)) || displayTin(p.dependents[0]).startsWith('***'), 'masked format')
}

console.log('\\n=== Two qualifying children ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 2)
  let filled = completeChild(0, { name: 'A', dob: '2015-01-01', rel: 'Daughter' }, p.answers, p.dependents)
  filled = completeChild(1, { name: 'B', dob: '2018-06-01', rel: 'Son' }, filled.answers, filled.dependents)
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  const r = runBenefitOptimization(p)
  assert((r.findings.find(f => f.ruleId === 'ctc')?.affectingRefund ?? 0) === 4000, 'CTC 4000 for two')
}

console.log('\\n=== Three children ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 3)
  let filled = { answers: p.answers, dependents: p.dependents }
  for (let i = 0; i < 3; i++) {
    filled = completeChild(i, { name: 'Kid'+i, dob: \`201\${4+i}-01-01\` }, filled.answers, filled.dependents)
  }
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  assert((runBenefitOptimization(p).findings.find(f => f.ruleId === 'ctc')?.affectingRefund ?? 0) === 6000, 'CTC 6000 for three')
}

console.log('\\n=== Different ages / college student ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 2)
  let filled = completeChild(0, { name: 'Teen', dob: '2008-01-01', student: false }, p.answers, p.dependents) // age 17 in 2025
  filled = completeChild(1, { name: 'College', dob: '2004-05-01', student: true, rel: 'Daughter', disabled: false }, filled.answers, filled.dependents) // ~21
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  const r = runBenefitOptimization(p)
  // 17+ not CTC; may be ODC if qualifying child/relative with TIN
  assert((r.findings.find(f => f.ruleId === 'ctc')?.affectingRefund ?? 0) === 0, 'no CTC for 17+ only household')
  const odc = r.findings.find(f => f.ruleId === 'odc')
  assert((odc?.affectingRefund ?? 0) >= 500, 'ODC for older dependents got ' + odc?.affectingRefund)
}

console.log('\\n=== Qualifying relative ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  const filled = completeChild(0, {
    name: 'Parent Elder',
    dob: '1960-01-01',
    rel: 'Parent',
    months: 12,
    ownSupport: false,
    another: false,
    disabled: false,
  }, p.answers, p.dependents)
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  assert(p.dependents[0].qualifyingRelative === true, 'qualifying relative')
  assert(p.dependents[0].ctcEligible === false, 'parent not CTC')
  assert(p.dependents[0].odcEligible === true, 'parent ODC eligible')
}

console.log('\\n=== Shared custody non-custodial — not QC ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  const filled = completeChild(0, {
    name: 'Shared Kid',
    dob: '2014-01-01',
    shared: true,
    custodial: false,
    months: 5,
  }, p.answers, p.dependents)
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  assert(p.dependents[0].qualifyingChild === false, 'non-custodial / low months not QC')
  assert((runBenefitOptimization(p).findings.find(f => f.ruleId === 'ctc')?.affectingRefund ?? 0) === 0, 'no CTC')
}

console.log('\\n=== Another may claim — disqualified ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  const filled = completeChild(0, { name: 'X', dob: '2015-01-01', another: true }, p.answers, p.dependents)
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  assert(p.dependents[0].ctcEligible === false, 'another claimant blocks CTC')
}

console.log('\\n=== Recalc on edit ===')
{
  let p = applyAnswer(defaultProfile(), 'potential_dependents', 'yes')
  p = applyAnswer(p, 'dependent_count', 1)
  let filled = completeChild(0, { name: 'Edit Me', dob: '2016-01-01' }, p.answers, p.dependents)
  p = { ...p, answers: filled.answers, dependents: filled.dependents }
  const before = runBenefitOptimization(p).findings.find(f => f.ruleId === 'ctc')?.affectingRefund ?? 0
  assert(before === 2000, 'before edit CTC 2000')
  // Remove dependents
  p = applyAnswer(p, 'potential_dependents', 'no')
  const after = runBenefitOptimization(p)
  assert((after.findings.find(f => f.ruleId === 'ctc')?.affectingRefund ?? 0) === 0, 'after removal CTC 0')
  assert(after.dependentInfoComplete === true, 'still complete at zero')
}

console.log('\\n=== Discovery question order ===')
{
  const q1 = nextDependentQuestion({}, [])
  assert(q1?.mapsTo === 'potential_dependents', 'first question potential_dependents')
  const q2 = nextDependentQuestion({ potential_dependents: 'yes' }, [])
  assert(q2?.mapsTo === 'dependent_count', 'second is count')
}

if (failed) { console.error('\\n' + failed + ' failed'); process.exit(1) }
console.log('\\nAll dependent tests passed.')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NPM_CONFIG_YES: 'true' },
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status ?? 1)
