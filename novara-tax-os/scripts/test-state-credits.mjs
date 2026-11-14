/**
 * State credit law differences: TX/FL none, CA/NY/IL match rates, address → filing state.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-state-credits')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  estimateStateEitcCredit,
  filingStateFromAddress,
  getStateCreditProfile,
  normalizeFilingState,
} from '../src/engine/stateCredits.ts'
import { syncProfileFromDocuments, satisfyDocBackedAnswers } from '../src/engine/smartInterview.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

assert(normalizeFilingState('Texas') === 'TX', 'normalize Texas')
assert(normalizeFilingState('ca') === 'CA', 'normalize ca')
assert(filingStateFromAddress('1842 Harbor Ave, Austin, TX') === 'TX', 'address → TX')
assert(filingStateFromAddress('100 Main St, Brooklyn, NY 11201') === 'NY', 'address → NY')

assert(getStateCreditProfile('TX')?.hasPersonalIncomeTax === false, 'TX no PIT')
assert((getStateCreditProfile('CA')?.credits.length ?? 0) >= 2, 'CA has multiple credits')
assert(estimateStateEitcCredit({ filingState: 'TX', federalEitcEstimate: 4000, qualifyingChildren: 1 }) === 0, 'TX EITC 0')
assert(estimateStateEitcCredit({ filingState: 'NY', federalEitcEstimate: 4000, qualifyingChildren: 1 }) === 1200, 'NY 30% of federal')
const ca = estimateStateEitcCredit({ filingState: 'CA', federalEitcEstimate: 4000, qualifyingChildren: 1 })
assert(ca > 1200, 'CA match + young child > NY (' + ca + ')')

const empty = { ...defaultProfile(), wages: 0, selfEmploymentIncome: 0, answers: {}, dependents: [], unresolvedKeys: [] }
const docs = [{
  id: 'id1', name: 'DL.pdf', type: 'ID' as const, status: 'extracted' as const,
  facts: [
    { id: 'a', label: 'Full name', value: 'Jordan Lee', confidence: 0.9, verified: true, sourcePage: 1 },
    { id: 'b', label: 'Address', value: '1842 Harbor Ave, Austin, TX', confidence: 0.9, verified: true, sourcePage: 1 },
  ],
}, {
  id: 'w2', name: 'W2.pdf', type: 'W-2' as const, status: 'extracted' as const,
  facts: [
    { id: 'c', label: 'Wages (Box 1)', value: '$48200', confidence: 0.9, verified: true, sourcePage: 1 },
  ],
}]
let p = satisfyDocBackedAnswers(syncProfileFromDocuments(empty as any, docs as any))
assert(p.answers.filing_state === 'TX', 'docs set filing_state from address (got ' + p.answers.filing_state + ')')
const txReport = runBenefitOptimization(p)
const txState = txReport.findings.find((f) => f.ruleId === 'state_eitc')
assert(!txState || txState.affectingRefund === 0 || txState.status === 'ineligible' || txState.status === 'needs_info', 'TX state EITC not paying')

p = { ...p, answers: { ...p.answers, filing_state: 'CA', eitc_investment_ok: 'yes', has_earned_income_q: 'yes' } }
const caReport = runBenefitOptimization(p)
const caState = caReport.findings.find((f) => f.ruleId === 'state_eitc')
assert(Boolean(caState), 'CA state EITC finding exists')

if (failed) { console.error(failed + ' failure(s)'); process.exit(1) }
console.log('All state credit checks passed.')
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
