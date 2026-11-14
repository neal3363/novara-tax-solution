/**
 * Production readiness audit harness — honest gates only.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
let failed = 0
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    failed++
  } else console.log('OK', m)
}

const docs = [
  'docs/PRODUCTION_READINESS_AUDIT_2026-11-14.md',
  'docs/PRODUCTION_READINESS_SCORECARD_2026-11-14.json',
  'docs/PRODUCT_SEPARATION_EVIDENCE.md',
  'docs/APPSEC_PENTEST_SCOPE.md',
  'docs/ARCHITECTURE.md',
  'docs/EXTERNAL_APPROVAL_TRACKER.md',
  'docs/ENV_VARIABLE_INVENTORY.md',
  'docs/REFUND_SETTLEMENT_PIPELINE.md',
]
for (const d of docs) assert(existsSync(join(root, d)), `doc ${d}`)

assert(!existsSync(join(root, 'wrangler.toml')), 'no wrangler at app root')
assert(!existsSync(join(root, '../wrangler.toml')), 'no wrangler at repo root')

const score = JSON.parse(readFileSync(join(root, 'docs/PRODUCTION_READINESS_SCORECARD_2026-11-14.json'), 'utf8'))
assert(score.productionActivation === false, 'scorecard productionActivation false')
assert(score.decisions.realTaxpayerProduction === 'NO-GO', 'scorecard NO-GO production')
assert(score.decisions.publicDemoLaunch === 'GO_SYNTHETIC_ONLY', 'scorecard GO synthetic only')
assert(score.prs['67'].reachedTaxOsBranch === false, 'PR67 not on Tax OS')
assert(score.prs['68'].capabilityClass === 'Simulated', 'PR68 classified Simulated')
assert(score.pricingPreserved.TP.personal === 89, 'pricing TP 89')
assert(score.pricingPreserved.OfficeAnnual.business === 1499, 'pricing Office 1499')
assert(score.pricingPreserved.officePerReturnNovaraFee === 0, 'office per-return 0')
assert(Array.isArray(score.topOwnerActions) && score.topOwnerActions.length === 5, 'five owner actions')

const envInv = readFileSync(join(root, 'docs/ENV_VARIABLE_INVENTORY.md'), 'utf8')
assert(envInv.includes('REFUND_BANK_PARTNER_API_KEY'), 'env lists refund bank partner secrets')
assert(/not Stripe/i.test(envInv), 'env distinguishes Stripe vs settlement')

const partner = readFileSync(join(root, 'src/engine/payments/phase10/refundBankPartner.ts'), 'utf8')
assert(partner.includes('stripeIsNotRefundSettlement'), 'partner adapter marks Stripe ≠ settlement')
assert(partner.includes('duplicate_idempotency_key'), 'duplicate prevention')
assert(partner.includes('liveBankingPartner'), 'live banking lock referenced')

const sep = readFileSync(join(root, 'docs/PRODUCT_SEPARATION_EVIDENCE.md'), 'utf8')
assert(sep.includes('PR #67'), 'separation covers PR67')
assert(sep.includes('PR #68'), 'separation covers PR68')
assert(sep.includes('novara-tax-solution'), 'shared repo named')

const landing = readFileSync(join(root, 'src/pages/Landing.tsx'), 'utf8')
assert(!landing.includes('Alex Rivera'), 'Landing placeholder avoids forbidden demo PII name')

console.log('\n=== Suite matrix ===')
for (const script of ['test:pricing', 'test:refund-settlement', 'test:isolation', 'test:publish-security', 'build']) {
  const r = spawnSync('npm', ['run', script], { cwd: root, encoding: 'utf8' })
  assert(r.status === 0, `${script} exit 0`)
  if (r.status !== 0) process.stdout.write(((r.stdout || '') + (r.stderr || '')).slice(-1200))
}

// Partner runtime checks
const tmpRun = `
import {
  refundBankPartnerStatus,
  processPartnerWebhookEvent,
  verifyPartnerWebhookSignature,
  signPartnerWebhookForTests,
  resetRefundBankPartnerForTests,
  buildReconciliationSnapshot,
} from '../src/engine/payments/phase10/refundBankPartner.ts'
import { getPhase10Flags } from '../src/engine/payments/phase10/config.ts'

resetRefundBankPartnerForTests()
const st = refundBankPartnerStatus()
if (st.partnerConnected !== false) throw new Error('partner must be disconnected')
if (st.stripeIsNotRefundSettlement !== true) throw new Error('stripe flag')
if (getPhase10Flags().liveBankingPartner !== false) throw new Error('live bank')

const body = JSON.stringify({ hello: 'wire' })
const secret = 'sandbox-secret'
const sig = signPartnerWebhookForTests(body, secret)
if (!verifyPartnerWebhookSignature(body, sig, secret)) throw new Error('sig verify')
if (verifyPartnerWebhookSignature(body, 'bad', secret)) throw new Error('bad sig')

const ev = {
  id: 'evt1',
  type: 'inbound_wire_posted',
  settlementCaseId: 'rset_demo',
  amountCents: 700000,
  currency: 'usd',
  occurredAt: new Date().toISOString(),
  idempotencyKey: 'idem-1',
}
const liveReject = processPartnerWebhookEvent(ev)
if (liveReject.accepted) throw new Error('live event must reject when disconnected')
const sim = processPartnerWebhookEvent(ev, { simulated: true })
if (!sim.accepted) throw new Error('simulated should accept')
const dup = processPartnerWebhookEvent(ev, { simulated: true })
if (!dup.duplicate) throw new Error('duplicate must block')
const snap = buildReconciliationSnapshot('rset_demo')
if (snap.partnerConnected !== false) throw new Error('snap disconnected')
if (snap.duplicatesBlocked < 1) throw new Error('dup count')
console.log('partner runtime ok')
`

import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
const tmp = join(root, '.tmp-prod-readiness')
mkdirSync(tmp, { recursive: true })
writeFileSync(join(tmp, 'run.ts'), tmpRun)
const pr = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
process.stdout.write(pr.stdout || '')
process.stderr.write(pr.stderr || '')
assert(pr.status === 0, 'partner runtime')
rmSync(tmp, { recursive: true, force: true })

if (failed) {
  console.error(failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('All prod-readiness-audit checks passed')
