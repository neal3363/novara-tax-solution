/**
 * Payments & banking live-activation readiness (WS6).
 * Sandbox verification only — live payments/banking remain OFF.
 */

import {
  PHASE10_VERSION,
  getPhase10Flags,
  assertNoLivePayments,
  assertApprovedPricingIntact,
  bankingPartnerConnectionStatus,
  createSandboxCheckout,
  confirmSandboxPayment,
  buildSandboxWebhook,
  processSandboxWebhook,
  verifyWebhookSignature,
  getStripeWebhookSecretForTests,
  setStripeProviderMode,
  renewSandboxSubscription,
  createSandboxSubscription,
  refundSandboxPayment,
  resetPhase10ForTests,
  quoteCharge,
} from '../payments/phase10'

export type ReadinessStatus = 'PASS' | 'PASS_STAGING' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED'

export interface PaymentsReadinessItem {
  id: string
  title: string
  status: ReadinessStatus
  detail: string
}

export const PAYMENTS_EXTERNAL_ACTIVATION_STEPS = [
  'Execute payment processor merchant agreement and live-account approval',
  'Provision production API keys / webhook secrets via secrets manager (not in repo)',
  'Complete PCI DSS SAQ / ROC obligations appropriate to hosted-checkout architecture',
  'Execute banking partner agreement and settlement testing',
  'Complete independent PCI-related implementation review',
  'Human approval to flip livePayments / liveBankingPartner (code locks remain until then)',
] as const

export function buildPaymentsReadinessChecklist(): PaymentsReadinessItem[] {
  resetPhase10ForTests()
  assertNoLivePayments()
  const f = getPhase10Flags()
  const pricing = assertApprovedPricingIntact()
  const bank = bankingPartnerConnectionStatus()
  const items: PaymentsReadinessItem[] = []

  items.push({
    id: 'pay-version',
    title: 'Phase 10 sandbox module present',
    status: 'PASS_STAGING',
    detail: `version=${PHASE10_VERSION}`,
  })
  items.push({
    id: 'pay-live-off',
    title: 'Live payments OFF',
    status: f.livePayments === false ? 'PASS' : 'FAIL',
    detail: `livePayments=${f.livePayments}`,
  })
  items.push({
    id: 'bank-live-off',
    title: 'Live banking partner OFF',
    status: f.liveBankingPartner === false && bank.partnerConnected === false ? 'PASS' : 'FAIL',
    detail: `liveBankingPartner=${f.liveBankingPartner}; partnerConnected=${bank.partnerConnected}`,
  })
  items.push({
    id: 'pay-pricing',
    title: 'Approved pricing intact',
    status: pricing.ok ? 'PASS' : 'FAIL',
    detail: `TC personal=${pricing.tcPersonal} business=${pricing.tcBusiness}`,
  })

  const quote = quoteCharge('tc_personal')
  const checkout = createSandboxCheckout({
    quote,
    tenantId: 't_readiness',
    principalId: 'p_readiness',
    idempotencyKey: 'ready-1',
  })
  const paid = confirmSandboxPayment({
    checkoutId: checkout.id,
    paymentMethodToken: 'tok_sandbox_visa',
  })
  items.push({
    id: 'pay-hosted-checkout',
    title: 'Secure hosted checkout (sandbox tokenized)',
    status: paid.status === 'succeeded' ? 'PASS_STAGING' : 'FAIL',
    detail: `status=${paid.status}; mode=sandbox`,
  })

  const dup = createSandboxCheckout({
    quote,
    tenantId: 't_readiness',
    principalId: 'p_readiness',
    idempotencyKey: 'ready-1',
  })
  items.push({
    id: 'pay-idempotency',
    title: 'Idempotent checkout',
    status: dup.id === checkout.id ? 'PASS_STAGING' : 'FAIL',
    detail: dup.id === checkout.id ? 'Duplicate idempotency key reused session' : 'Duplicate created new session',
  })

  const wh = buildSandboxWebhook({
    checkoutId: paid.id,
    type: 'payment_intent.succeeded',
  })
  const bad = verifyWebhookSignature(wh.payload, 'deadbeef')
  items.push({
    id: 'pay-webhook-sig',
    title: 'Webhook signature verification',
    status: verifyWebhookSignature(wh.payload, wh.signature) && !bad ? 'PASS_STAGING' : 'FAIL',
    detail: `secretConfigured=${Boolean(getStripeWebhookSecretForTests())}; spoofRejected=${!bad}`,
  })

  const processed = processSandboxWebhook(wh)
  items.push({
    id: 'pay-webhook-process',
    title: 'Webhook processing (sandbox)',
    status: processed.ok ? 'PASS_STAGING' : 'FAIL',
    detail: processed.ok ? 'Succeeded event processed' : String(processed.error),
  })

  const { subscription: sub } = createSandboxSubscription({
    kind: 'tp_subscription',
    tenantId: 't_readiness',
    principalId: 'p_readiness',
  })
  const renewed = renewSandboxSubscription(sub.id)
  items.push({
    id: 'pay-renewal',
    title: 'Subscription renewal (sandbox)',
    status: renewed.subscription.status === 'active' ? 'PASS_STAGING' : 'FAIL',
    detail: `sub=${sub.id}; renewals=${renewed.subscription.renewals}`,
  })

  const refunded = refundSandboxPayment({ checkoutId: paid.id })
  items.push({
    id: 'pay-refund',
    title: 'Payment refund path (sandbox)',
    status: refunded.status === 'refunded' || refunded.status === 'partially_refunded' ? 'PASS_STAGING' : 'FAIL',
    detail: `status=${refunded.status}`,
  })

  setStripeProviderMode('unavailable')
  let outageOk = false
  try {
    createSandboxCheckout({
      quote,
      tenantId: 't_readiness',
      principalId: 'p_readiness',
      idempotencyKey: 'ready-outage',
    })
  } catch {
    outageOk = true
  }
  setStripeProviderMode('online')
  items.push({
    id: 'pay-outage',
    title: 'Provider outage fail-closed',
    status: outageOk ? 'PASS_STAGING' : 'FAIL',
    detail: outageOk ? 'Unavailable mode throws safely' : 'Checkout succeeded during outage',
  })

  items.push({
    id: 'pay-pci-live',
    title: 'PCI live-account / SAQ evidence',
    status: 'BLOCKED',
    detail: 'Hosted-checkout sandbox only — live PCI obligations require external approval',
  })
  items.push({
    id: 'pay-live-activation',
    title: 'Live payments / banking activation',
    status: 'BLOCKED',
    detail: 'Provider agreements, credentials, testing, and human approval required',
  })

  return items
}

export function paymentsReadinessSummary() {
  const items = buildPaymentsReadinessChecklist()
  return {
    items,
    livePayments: false as const,
    liveBanking: false as const,
    externalSteps: PAYMENTS_EXTERNAL_ACTIVATION_STEPS,
  }
}
