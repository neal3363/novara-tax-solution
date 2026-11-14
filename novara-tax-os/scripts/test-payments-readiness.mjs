/** Payments/banking readiness — sandbox only; live activation BLOCKED. */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-pay-readiness')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import { paymentsReadinessSummary, PAYMENTS_EXTERNAL_ACTIVATION_STEPS } from '../src/engine/remediation/paymentsReadiness.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const s = paymentsReadinessSummary()
assert(s.livePayments === false && s.liveBanking === false, 'live pay/bank OFF')
assert(s.externalSteps.length === PAYMENTS_EXTERNAL_ACTIVATION_STEPS.length, 'external steps listed')
for (const item of s.items) {
  assert(item.status !== 'FAIL', item.id + ' ' + item.status + ' ' + item.detail)
  console.log('ITEM', item.id, item.status, item.detail)
}
assert(s.items.some(i => i.id === 'pay-pricing' && i.status === 'PASS'), 'pricing pass')
assert(s.items.some(i => i.id === 'pay-live-activation' && i.status === 'BLOCKED'), 'live activation blocked')
console.log('=== PAYMENTS_READINESS_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)
const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
