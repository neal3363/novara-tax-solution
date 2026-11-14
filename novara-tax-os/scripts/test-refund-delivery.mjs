/**
 * Refund delivery, readiness score, fee ledger, bank-product offline guarantees.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-refund-delivery-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { defaultProfile, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import {
  isValidRoutingNumber,
  validateRefundDelivery,
  sanitizeRefundDeliveryForStorage,
  accountLast4,
} from '../src/engine/refundDelivery.ts'
import {
  evaluateBankProductEligibility,
  listBankProviderConfigs,
  createOfflineBankApplication,
} from '../src/engine/bankProducts.ts'
import { buildTaxPreparationCompletionScore } from '../src/engine/taxReadiness.ts'
import { buildPreSignFeeBreakdown } from '../src/engine/feeLedger.ts'
import { buildRefundTrackingSnapshot } from '../src/engine/refundTracking.ts'
import { PRICING, PRIOR_YEAR_SURCHARGE, TC_PERSONAL_FEE } from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Routing validation ===')
assert(isValidRoutingNumber('021000021'), 'Chase ABA 021000021 valid')
assert(!isValidRoutingNumber('123456789'), 'bad routing rejected')
assert(!isValidRoutingNumber('123'), 'short routing rejected')

console.log('=== Direct deposit selection ===')
{
  const verified = 921
  const raw = {
    method: 'direct_deposit' as const,
    verifiedRefundAmount: verified,
    selectedAt: new Date().toISOString(),
    taxpayerAuthorized: true,
    deposit: {
      routingNumber: '021000021',
      accountLast4: '',
      accountType: 'checking' as const,
      accountNumberEphemeral: '123456789',
    },
  }
  const v = validateRefundDelivery(raw, verified)
  assert(v.ok, 'valid DD passes')
  const saved = sanitizeRefundDeliveryForStorage(raw)
  assert(!saved.deposit?.accountNumberEphemeral, 'ephemeral account stripped')
  assert(saved.deposit?.accountLast4 === '6789', 'last4 retained')
  assert(accountLast4('123456789') === '6789', 'last4 helper')
}

console.log('=== Bank product stays offline ===')
{
  assert(PRICING.banking.liveConnectivity === false, 'pricing banking not live')
  const providers = listBankProviderConfigs('tenant-office')
  assert(providers.some((p) => p.selectionMode === 'office_choice'), 'office choice supported')
  assert(providers.some((p) => p.selectionMode === 'platform_default'), 'platform default supported')
  const p = providers[0]
  const el = evaluateBankProductEligibility(p, p.products[0].code)
  assert(el.status === 'provider_offline', 'eligibility offline')
  assert(!el.eligibleToApply, 'cannot apply while offline')
  const app = createOfflineBankApplication(p.id, p.products[0].code)
  assert(app.status === 'provider_offline', 'application recorded offline not approved')
}

console.log('=== Fee breakdown preserves pricing ===')
{
  const b = buildPreSignFeeBreakdown({
    accountType: 'tc',
    taxReturn: null,
    taxYear: 2025,
    seasonYear: 2026,
  })
  assert(b.lines.some((l) => l.amount === TC_PERSONAL_FEE), 'TC personal fee present')
  const prior = buildPreSignFeeBreakdown({
    accountType: 'tc',
    taxReturn: null,
    taxYear: 2023,
    seasonYear: 2026,
  })
  assert(prior.lines.some((l) => l.amount === PRIOR_YEAR_SURCHARGE), 'prior-year surcharge present')
  // Seed snapshots use a different label than the ledger line — must not double-count.
  const dup = buildPreSignFeeBreakdown({
    accountType: 'tc',
    taxReturn: {
      feeSnapshot: [{ label: 'Personal tax return (TC)', amount: TC_PERSONAL_FEE, status: 'quoted' }],
    } as any,
    taxYear: 2025,
    seasonYear: 2026,
  })
  const softwareLines = dup.lines.filter((l) => l.amount === TC_PERSONAL_FEE && l.status === 'due')
  assert(softwareLines.length === 1, 'TC software fee not double-counted with seed snapshot')
  assert(dup.novaraTotal === TC_PERSONAL_FEE, 'novaraTotal equals single TC personal fee')
}

console.log('=== Readiness requires delivery ===')
{
  const profile = defaultProfile()
  const report = runBenefitOptimization(profile)
  const score = buildTaxPreparationCompletionScore({
    profile,
    benefitReport: report,
    documents: [],
    refundDelivery: null,
    filingAuth: null,
    filingAuthorized: false,
  })
  assert(score.items.some((i) => i.id === 'refund_delivery' && i.status === 'blocked'), 'delivery blocked when missing')
  assert(score.label.includes('Tax Return Readiness'), 'readiness label')
  assert(!score.readyToFile, 'not ready to file without delivery/auth')
}

console.log('=== Tracking distinguishes sources ===')
{
  const snap = buildRefundTrackingSnapshot({
    taxReturn: {
      id: 'r1',
      clientName: 'T',
      clientId: 'c1',
      taxYear: 2025,
      returnType: '1040',
      state: 'Accepted',
      readiness: 90,
      refundOrOwe: 900,
      tenantId: 't1',
      isBusiness: false,
      feeSnapshot: [],
      appliedBenefits: [],
      updatedAt: new Date().toISOString(),
    },
    verifiedRefund: 900,
    delivery: {
      method: 'direct_deposit',
      verifiedRefundAmount: 900,
      selectedAt: new Date().toISOString(),
      taxpayerAuthorized: true,
      deposit: { routingNumber: '021000021', accountLast4: '6789', accountType: 'checking' },
    },
  })
  assert(snap.events.some((e) => e.source === 'irs'), 'IRS event present')
  assert(snap.events.some((e) => e.source === 'novara'), 'NOVARA event present')
  assert(snap.irsPhase.includes('Accepted'), 'IRS phase accepted sandbox')
}

if (failed) {
  console.error('\\n' + failed + ' failure(s)')
  process.exit(1)
}
console.log('\\nAll refund delivery / readiness tests passed.')
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
