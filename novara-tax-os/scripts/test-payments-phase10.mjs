/**
 * Phase 10 payments/banking sandbox tests — synthetic only.
 * STOP before live payments or banking products.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-phase10-test')
mkdirSync(tmp, { recursive: true })
const durable = mkdtempSync(join(tmpdir(), 'novara-p10-'))

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRIOR_YEAR_SURCHARGE, PRICING } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'
import { cutoverReady } from '../src/engine/irs/cutoverCriteria.ts'
import { getMefFlags } from '../src/engine/irs/mef/index.ts'
import {
  PHASE10_VERSION,
  getPhase10Flags,
  assertNoLivePayments,
  resetPhase10ForTests,
  quoteCharge,
  assertApprovedPricingIntact,
  createSandboxCheckout,
  confirmSandboxPayment,
  refundSandboxPayment,
  buildSandboxWebhook,
  processSandboxWebhook,
  createSandboxSubscription,
  renewSandboxSubscription,
  setStripeProviderMode,
  calculateBankingFees,
  explainRefundDeliveryOptions,
  startSandboxBankSettlement,
  advanceSandboxSettlement,
  bankingPartnerConnectionStatus,
  buildFinancialReport,
  appendLedger,
  listLedger,
  phase10Summary,
} from '../src/engine/payments/phase10/index.ts'
import {
  createSession,
  syntheticPrincipal,
  resetSessionStoreForTests,
} from '../src/engine/security/phase6/index.ts'
import { bootstrapStagingSecurity, resetStagingForTests, serverAuthorize } from '../src/engine/security/phase7/index.ts'
import * as SessionApi from '../api/security/session.ts'
import * as PaymentsApi from '../api/security/payments.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const DURABLE = ${JSON.stringify(durable)}

resetPhase10ForTests()
resetSessionStoreForTests()
resetStagingForTests(DURABLE)

console.log('=== Preserve pricing & protected surfaces ===')
const pricing = assertApprovedPricingIntact()
assert(pricing.ok && TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC $300/$399 intact')
assert(PRIOR_YEAR_SURCHARGE === 250, 'prior-year surcharge intact')
assert(PRICING.banking.liveConnectivity === false, 'banking liveConnectivity false')
assert(Boolean(runBenefitOptimization(defaultProfile())), 'Maximizer intact')
assert(cutoverReady() === false, 'IRS cutover still false')
assert(getMefFlags().liveProductionTransmit === false, 'MeF live transmit false')
assert(getPhase10Flags().livePayments === false, 'livePayments false')
assertNoLivePayments()

console.log('=== Fee quotes ===')
assert(quoteCharge('tc_personal').amountDollars === 300, 'personal quote 300')
assert(quoteCharge('tc_business').amountDollars === 399, 'business quote 399')
assert(quoteCharge('tc_personal', { includePriorYearSurcharge: true }).amountDollars === 550, 'personal+prior year')
assert(quoteCharge('office_subscription_standard').amountDollars === 899, 'office 899')
assert(quoteCharge('office_subscription_plus').amountDollars === 1250, 'office 1250')
assert(quoteCharge('tp_subscription').amountDollars === 599, 'tp subscription 599')

console.log('=== Sandbox checkout / idempotency / refund / fail ===')
const q = quoteCharge('tc_personal')
const c1 = createSandboxCheckout({ quote: q, tenantId: 'ten-pay', principalId: 'u1', idempotencyKey: 'idem-1' })
const c1b = createSandboxCheckout({ quote: q, tenantId: 'ten-pay', principalId: 'u1', idempotencyKey: 'idem-1' })
assert(c1.id === c1b.id, 'duplicate-payment prevention via idempotency')
assert(c1.livePayments === false && c1.mode === 'sandbox', 'sandbox checkout')
const ok = confirmSandboxPayment({ checkoutId: c1.id, paymentMethodToken: 'pm_test_visa' })
assert(ok.status === 'succeeded', 'payment succeeded')
appendLedger({ tenantId: 'ten-pay', actorId: 'u1', kind: 'payment_succeeded', amountCents: q.amountCents, currency: 'usd', refId: c1.id, outcome: 'success' })

let rawBlocked = false
try { confirmSandboxPayment({ checkoutId: c1.id, paymentMethodToken: '4111111111111111' }) } catch { rawBlocked = true }
assert(rawBlocked, 'raw card number forbidden')

const cFail = createSandboxCheckout({ quote: quoteCharge('tc_business'), tenantId: 'ten-pay', principalId: 'u1', idempotencyKey: 'idem-fail' })
const failedPay = confirmSandboxPayment({ checkoutId: cFail.id, paymentMethodToken: 'pm_test', forceFail: true })
assert(failedPay.status === 'failed', 'failed payment handled')
appendLedger({ tenantId: 'ten-pay', actorId: 'u1', kind: 'payment_failed', amountCents: cFail.quote.amountCents, currency: 'usd', refId: cFail.id, outcome: 'error' })

const refunded = refundSandboxPayment({ checkoutId: c1.id })
assert(refunded.status === 'refunded', 'refund processed')
appendLedger({ tenantId: 'ten-pay', actorId: 'u1', kind: 'payment_refunded', amountCents: q.amountCents, currency: 'usd', refId: c1.id, outcome: 'success' })

console.log('=== Webhook signature + dispute ===')
const c2 = createSandboxCheckout({ quote: quoteCharge('tp_personal'), tenantId: 'ten-pay', principalId: 'u1', idempotencyKey: 'idem-wh' })
confirmSandboxPayment({ checkoutId: c2.id, paymentMethodToken: 'pm_test' })
const wh = buildSandboxWebhook({ checkoutId: c2.id, type: 'charge.dispute.created' })
const bad = processSandboxWebhook({ ...wh, signature: 'deadbeef' })
assert(!bad.ok && bad.error === 'invalid_webhook_signature', 'invalid webhook rejected')
const good = processSandboxWebhook(wh)
assert(good.ok && good.session?.status === 'disputed', 'dispute webhook applied')
const dup = processSandboxWebhook(wh)
assert(dup.ok && dup.duplicate === true, 'webhook idempotent')

console.log('=== Subscriptions ===')
const sub = createSandboxSubscription({ tenantId: 'ten-office', principalId: 'owner1', kind: 'office_subscription_standard' })
assert(sub.subscription.status === 'active' && sub.subscription.quote.amountDollars === 899, 'office subscription')
const renewed = renewSandboxSubscription(sub.subscription.id)
assert(renewed.subscription.renewals === 1 && renewed.subscription.status === 'active', 'subscription renewal')

console.log('=== Provider outage ===')
setStripeProviderMode('unavailable')
let outage = false
try {
  createSandboxCheckout({ quote: quoteCharge('tc_personal'), tenantId: 'ten-pay', principalId: 'u1', idempotencyKey: 'idem-out' })
} catch (e) { outage = String(e).includes('unavailable') }
assert(outage, 'payment provider outage handled')
setStripeProviderMode('online')

console.log('=== Banking adapter + delivery ===')
const bankStatus = bankingPartnerConnectionStatus()
assert(bankStatus.partnerConnected === false && bankStatus.agreementRequired === true, 'no partner claimed connected')
const fees = calculateBankingFees({ refundDollars: 2000, bankProductFeeDollars: 40, taxPrepFeeDollars: 300 })
assert(fees.netToTaxpayerCents === 166000 && fees.liveBankingPartner === false, 'bank fee calculation')
const delivery = explainRefundDeliveryOptions(2000)
assert(delivery.options.some((o) => o.method === 'direct_deposit'), 'direct deposit option')
assert(delivery.options.some((o) => o.method === 'paper_check'), 'IRS mailed check option')
assert(delivery.irsControlDisclaimer.includes('does not control IRS'), 'IRS control disclaimer')

const settle = startSandboxBankSettlement({
  tenantId: 'ten-pay',
  ownerId: 'u1',
  providerId: 'novara-platform-default',
  productCode: 'refund_transfer',
  refundDollars: 2000,
  bankProductFeeDollars: 40,
  taxPrepFeeDollars: 300,
  delivery: {
    method: 'bank_product',
    verifiedRefundAmount: 2000,
    selectedAt: new Date().toISOString(),
    taxpayerAuthorized: true,
    bankProductProviderId: 'novara-platform-default',
    bankProductCode: 'refund_transfer',
  },
})
assert(settle.status === 'provider_offline' || settle.fees.partnerConnected === false, 'settlement offline / not connected')
const advanced = advanceSandboxSettlement(settle.id, 'reconciled')
assert(advanced.status === 'reconciled' && advanced.note.includes('sandbox'), 'sandbox settlement reconcile')

console.log('=== Financial reporting ===')
const report = buildFinancialReport('ten-pay')
assert(report.livePayments === false, 'report livePayments false')
assert(report.failedPayments >= 1, 'failed payment alert data')
assert(Array.isArray(report.alerts), 'alerts present')

console.log('=== Phase 7 financial authz ===')
bootstrapStagingSecurity({ durableRoot: DURABLE })
const owner = syntheticPrincipal({
  id: 'pay-owner', email: 'o@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-fin', officeId: 'off-1', officeManager: true, mfaEnrolled: false,
})
const prep = syntheticPrincipal({
  id: 'pay-prep', email: 'p@synthetic.test', role: 'preparer', accountType: 'office_preparer',
  tenantId: 'ten-fin', officeId: 'off-1', officeManager: false, mfaEnrolled: false,
})
const sessO = createSession({ principal: owner, fingerprintSalt: 'p10', mfaSatisfied: true })
const sessP = createSession({ principal: prep, fingerprintSalt: 'p10', mfaSatisfied: true })
assert(serverAuthorize({ sessionId: sessO.sessionId, action: 'payment.charge', resourceTenantId: 'ten-fin' }).allowed, 'owner can charge')
assert(serverAuthorize({ sessionId: sessO.sessionId, action: 'billing.read', resourceTenantId: 'ten-fin' }).allowed, 'owner billing read')
assert(!serverAuthorize({ sessionId: sessP.sessionId, action: 'billing.read', resourceTenantId: 'ten-fin' }).allowed, 'preparer denied financial reports')
assert(!serverAuthorize({
  sessionId: sessO.sessionId, action: 'payment.charge', resourceTenantId: 'ten-other',
}).allowed, 'cross-tenant payment denied')

const createRes = await SessionApi.POST(new Request('http://local/api/security/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    principalId: 'pay-owner', email: 'o@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
    tenantId: 'ten-fin', officeId: 'off-1', officeManager: true, mfaSatisfied: true,
  }),
}))
const created = await createRes.json()
const statusRes = await PaymentsApi.GET()
assert(statusRes.status === 200, 'payments status API')
const statusBody = await statusRes.json()
assert(statusBody.livePayments === false && statusBody.banking.partnerConnected === false, 'status locks')

const quoteRes = await PaymentsApi.POST(new Request('http://local/api/security/payments', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({ op: 'quote', kind: 'tc_personal', tenantId: 'ten-fin' }),
}))
const quoteBody = await quoteRes.json()
assert(quoteRes.status === 200 && quoteBody.quote.amountDollars === 300, 'API quote 300')

const denySession = await PaymentsApi.POST(new Request('http://local/api/security/payments', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'quote', kind: 'tc_personal' }),
}))
assert(denySession.status === 401, 'unauthorized financial access denied')

assert(listLedger({ tenantId: 'ten-pay' }).every((e) => !JSON.stringify(e.meta).includes('4111111111111111')), 'no raw card in ledger')

console.log(phase10Summary())
assert(PHASE10_VERSION.includes('phase10'), 'phase10 version')
assertNoLivePayments()
console.log('=== PHASE10_PAYMENTS_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env },
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
rmSync(durable, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
