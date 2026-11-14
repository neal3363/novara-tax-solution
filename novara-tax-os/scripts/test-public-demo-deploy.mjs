/**
 * Public demo deployment safety harness — synthetic only.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-public-demo')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { rejectSensitiveDemoPayload, isPublicDemoMode, PUBLIC_DEMO_BANNER } from '../src/engine/demo/publicDemo.ts'
import { assertDemoSafetyLocks, publicDemoStatusPayload } from '../src/engine/remediation/publicDemoSafety.ts'
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

assert(isPublicDemoMode() === true, 'public demo mode default ON')
assert(PUBLIC_DEMO_BANNER.includes('synthetic'), 'banner mentions synthetic')
assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'pricing TC 300/399')

const safety = assertDemoSafetyLocks()
assert(safety.ok, 'all demo safety locks held: ' + safety.failures.join(','))
assert(safety.pricingOk, 'pricing intact')

const ssn = rejectSensitiveDemoPayload('My SSN is 123-45-6789', 'identity')
assert(!ssn.allowed && ssn.code === 'demo_ssn_blocked', 'SSN blocked')

const pan = rejectSensitiveDemoPayload('4111111111111111', 'payment')
assert(!pan.allowed, 'PAN blocked')

const pay = rejectSensitiveDemoPayload('ok', 'payment')
assert(!pay.allowed && pay.code === 'demo_payment_blocked', 'payment kind blocked')

const irs = rejectSensitiveDemoPayload('ok', 'irs_transmit')
assert(!irs.allowed, 'irs transmit blocked')

const ok = rejectSensitiveDemoPayload('I am a sample taxpayer in Texas with wages about 50000', 'generic')
assert(ok.allowed, 'synthetic narrative allowed')

const status = publicDemoStatusPayload()
assert(status.acceptRealTaxpayers === false, 'no real taxpayers')
assert(status.liveIrsFiling === false && status.livePayments === false, 'live off')
assert(status.dnsPublished === false, 'DNS not claimed published')
assert(status.ownerApprovalRequiredForPublicDns === true, 'owner DNS approval required')

console.log('=== PUBLIC_DEMO_DEPLOY_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })

// Dist must exist after build for static preview hosting
const distOk = existsSync(join(root, 'dist', 'index.html'))
if (!distOk) {
  console.error('FAIL dist/index.html missing — run npm run build before deploy')
  process.exit(1)
}
console.log('OK dist/index.html present')
process.exit(r.status === 0 ? 0 : r.status ?? 1)
