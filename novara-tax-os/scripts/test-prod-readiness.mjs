/**
 * Aggregated production-readiness remediation harness (WS9 subset).
 * Counts PASS / PASS_STAGING / BLOCKED / NOT_TESTED / FAIL honestly.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

function runNpm(script) {
  const r = spawnSync('npm', ['run', script], { cwd: root, encoding: 'utf8' })
  return { script, status: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') }
}

const suites = [
  'test:security-remediation',
  'test:tax-remediation',
  'test:mef-readiness',
  'test:payments-readiness',
  'test:recovery-remediation',
  'test:a11y-static',
]

const results = suites.map(runNpm)
for (const r of results) {
  console.log(`\n===== ${r.script} exit=${r.status} =====`)
  process.stdout.write(r.out.slice(-2500))
}

const tmp = join(root, '.tmp-prod-ready')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import { mefReadinessSummary } from '../src/engine/remediation/mefReadiness.ts'
import { paymentsReadinessSummary } from '../src/engine/remediation/paymentsReadiness.ts'
import { buildRecoveryChecklist } from '../src/engine/remediation/recoveryReadiness.ts'
import { cutoverReady, mayShowIrsToTaxpayer } from '../src/engine/irs/index.ts'
import { getPhase10Flags } from '../src/engine/payments/phase10/index.ts'
import { getMefFlags } from '../src/engine/irs/mef/index.ts'
import { getRemediationFlags } from '../src/engine/remediation/index.ts'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'

const rows: { id: string; status: string; detail: string }[] = []
function add(id: string, status: string, detail: string) { rows.push({ id, status, detail }) }

add('pricing', TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399 ? 'PASS' : 'FAIL', 'TC 300/399')
add('cutover', cutoverReady() === false ? 'PASS' : 'FAIL', 'cutoverReady false')
add('irs-visible', mayShowIrsToTaxpayer() === false ? 'PASS' : 'FAIL', 'IRS not taxpayer visible')
add('mef-live', getMefFlags().liveProductionTransmit === false ? 'PASS' : 'FAIL', 'MeF live OFF')
add('pay-live', getPhase10Flags().livePayments === false ? 'PASS' : 'FAIL', 'payments live OFF')
add('enforce', getRemediationFlags().productionEnforcement === false ? 'PASS' : 'FAIL', 'enforcement OFF')

for (const i of mefReadinessSummary().items) add('mef:' + i.id, i.status, i.detail)
for (const i of paymentsReadinessSummary().items) add('pay:' + i.id, i.status, i.detail)
for (const i of buildRecoveryChecklist()) add('rec:' + i.id, i.status, i.detail)

add('device-iphone', 'NOT_TESTED', 'No device lab')
add('device-android', 'NOT_TESTED', 'No device lab')
add('device-ipad', 'NOT_TESTED', 'No device lab')
add('a11y-screen-reader', 'NOT_TESTED', 'No VoiceOver/TalkBack session')
add('load-perf', 'NOT_TESTED', 'No controlled staging load test')
add('appsec-independent', 'BLOCKED', 'Independent AppSec assessment required')
add('irs-ats-official', 'BLOCKED', 'Official IRS ATS required')
add('pci-live', 'BLOCKED', 'PCI live obligations outstanding')
add('human-launch', 'BLOCKED', 'Human launch authorization required')

const totals = { pass: 0, pass_staging: 0, fail: 0, blocked: 0, not_tested: 0, recorded: rows.length }
for (const r of rows) {
  const s = r.status.toLowerCase()
  if (s === 'pass') totals.pass++
  else if (s === 'pass_staging') totals.pass_staging++
  else if (s === 'fail') totals.fail++
  else if (s === 'blocked') totals.blocked++
  else totals.not_tested++
}

console.log(JSON.stringify({ totals, rows }, null, 2))
if (totals.fail > 0) process.exit(1)
`,
)

const agg = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (agg.stdout) {
  process.stdout.write(agg.stdout)
  writeFileSync(join(root, 'docs/REMEDIATION_READINESS_SCORECARD.json'), agg.stdout.slice(agg.stdout.indexOf('{')))
}
if (agg.stderr) process.stderr.write(agg.stderr)
rmSync(tmp, { recursive: true, force: true })

const suiteFail = results.filter((r) => r.status !== 0)
console.log('\n=== PROD_READINESS suites_failed=' + suiteFail.length + ' agg_exit=' + (agg.status ?? 1) + ' ===')
process.exit(suiteFail.length || agg.status ? 1 : 0)
