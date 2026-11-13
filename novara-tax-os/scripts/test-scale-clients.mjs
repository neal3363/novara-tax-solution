import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-scale-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { DEV_DEMO_USERS } from '../../dev-fixtures/seed.dev.ts'
import {
  asScopedReturn,
  assertNoClientQuota,
  assertNoReturnQuota,
  filterReturnsForActor,
  canAccessReturn,
  resolveWriteTenant,
} from '../src/engine/tenantIsolation.ts'
import type { TaxReturn } from '../src/data/types.ts'
import { TP_PERSONAL_FEE } from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const kim = DEV_DEMO_USERS.find((u) => u.id === 'u-prep-solo')!
const alex = DEV_DEMO_USERS.find((u) => u.id === 'u-prep')!

function makeReturns(tenantId: string, preparerId: string, count: number): TaxReturn[] {
  const out: TaxReturn[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      id: \`r-scale-\${tenantId}-\${i}\`,
      clientName: \`Client \${i}\`,
      clientId: \`c-scale-\${tenantId}-\${i}\`,
      taxYear: 2025,
      returnType: '1040',
      state: 'Intake Started',
      readiness: 10,
      refundOrOwe: 0,
      preparerId,
      tenantId,
      assignedPreparerIds: [preparerId],
      isBusiness: false,
      feeSnapshot: [{ label: 'Personal tax return (TP software)', amount: TP_PERSONAL_FEE, status: 'approved' }],
      appliedBenefits: [],
      updatedAt: new Date().toISOString(),
    })
  }
  return out
}

for (const n of [100, 1000, 10000]) {
  console.log(\`=== Scale \${n} clients (Kim TP) ===\`)
  const t0 = performance.now()
  const bulk = makeReturns('tenant-kim-tp', kim.id, n).map(asScopedReturn)
  // Mix in foreign-tenant noise to prove filters stay correct at scale
  const noise = makeReturns('tenant-summit', alex.id, Math.min(n, 500)).map(asScopedReturn)
  const all = [...bulk, ...noise]
  assertNoClientQuota(kim, n)
  assertNoReturnQuota(kim, n)
  const visible = filterReturnsForActor(kim, all)
  const t1 = performance.now()
  assert(visible.length === n, \`Kim sees exactly \${n} of own clients (got \${visible.length})\`)
  assert(visible.every((r) => r.tenantId === 'tenant-kim-tp'), \`All \${n} visible returns stay in Kim tenant\`)
  assert(!canAccessReturn(alex, bulk[0]).allowed, \`Summit TP denied first of \${n} Kim clients\`)
  assert(resolveWriteTenant(kim) === 'tenant-kim-tp', 'Write tenant stable under load')
  const ms = t1 - t0
  console.log(\`  filtered \${all.length} rows → \${visible.length} in \${ms.toFixed(1)}ms\`)
  assert(ms < 5000, \`Filter of \${n} completes under 5s (took \${ms.toFixed(1)}ms)\`)
}

if (failed) {
  console.error(failed + ' scale failures')
  process.exit(1)
}
console.log('All scale client tests passed')
`,
)

const result = spawnSync(
  'npx',
  ['--yes', 'tsx', join(tmp, 'run.ts')],
  { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' } },
)
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(result.status ?? 1)
