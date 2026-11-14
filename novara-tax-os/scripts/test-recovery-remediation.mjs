/** Recovery remediation harness (WS8). */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-recovery')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import { buildRecoveryChecklist } from '../src/engine/remediation/recoveryReadiness.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const items = buildRecoveryChecklist()
for (const item of items) {
  assert(item.status !== 'FAIL', item.id + ' ' + item.status + ' — ' + item.detail)
  console.log('ITEM', item.id, item.status, item.detail)
}
assert(items.some(i => i.id === 'rec-prod-db-drill' && i.status === 'NOT_TESTED'), 'prod DB drill NOT_TESTED')
assert(items.some(i => i.id === 'rec-backup-restore' && i.status === 'PASS_STAGING'), 'backup sim pass')
assert(items.some(i => i.id === 'rec-pay-provider' && i.status === 'PASS_STAGING'), 'pay outage pass')
console.log('=== RECOVERY_REMEDIATION_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)
const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
