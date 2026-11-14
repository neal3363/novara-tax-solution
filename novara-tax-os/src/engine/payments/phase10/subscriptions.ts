/**
 * Subscription renewal management (sandbox).
 */

import { randomBytes } from 'node:crypto'
import { assertNoLivePayments } from './config'
import { quoteCharge, type ChargeKind, type FeeQuote } from './quotes'
import { confirmSandboxPayment, createSandboxCheckout, type SandboxCheckoutSession } from './stripeSandbox'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'

export interface SandboxSubscription {
  id: string
  tenantId: string
  principalId: string
  kind: ChargeKind
  quote: FeeQuote
  status: SubscriptionStatus
  currentPeriodEnd: string
  renewals: number
  lastCheckoutId?: string
  livePayments: false
  createdAt: string
  updatedAt: string
}

const subs = new Map<string, SandboxSubscription>()

export function resetSubscriptionsForTests(): void {
  subs.clear()
}

export function createSandboxSubscription(input: {
  tenantId: string
  principalId: string
  kind:
    | 'tp_subscription'
    | 'office_subscription_standard'
    | 'office_subscription_plus'
    | 'office_subscription_personal'
    | 'office_subscription_self_employed'
    | 'office_subscription_business'
  periodDays?: number
}): { subscription: SandboxSubscription; checkout: SandboxCheckoutSession } {
  assertNoLivePayments()
  const quote = quoteCharge(input.kind)
  const idem = `sub_${input.tenantId}_${input.kind}_${Date.now()}`
  const checkout = createSandboxCheckout({
    quote,
    tenantId: input.tenantId,
    principalId: input.principalId,
    idempotencyKey: idem,
  })
  const confirmed = confirmSandboxPayment({
    checkoutId: checkout.id,
    paymentMethodToken: 'pm_test_subscription',
  })
  const now = Date.now()
  const periodDays = input.periodDays ?? 365
  const sub: SandboxSubscription = {
    id: `sub_test_${randomBytes(6).toString('hex')}`,
    tenantId: input.tenantId,
    principalId: input.principalId,
    kind: input.kind,
    quote,
    status: confirmed.status === 'succeeded' ? 'active' : 'incomplete',
    currentPeriodEnd: new Date(now + periodDays * 86400000).toISOString(),
    renewals: 0,
    lastCheckoutId: confirmed.id,
    livePayments: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  subs.set(sub.id, sub)
  return { subscription: { ...sub, quote: { ...sub.quote } }, checkout: confirmed }
}

export function renewSandboxSubscription(subscriptionId: string): {
  subscription: SandboxSubscription
  checkout: SandboxCheckoutSession
} {
  assertNoLivePayments()
  const sub = subs.get(subscriptionId)
  if (!sub) throw new Error('subscription_not_found')
  if (sub.status === 'canceled') throw new Error('subscription_canceled')

  const idem = `renew_${sub.id}_${sub.renewals + 1}`
  const checkout = createSandboxCheckout({
    quote: sub.quote,
    tenantId: sub.tenantId,
    principalId: sub.principalId,
    idempotencyKey: idem,
  })
  const confirmed = confirmSandboxPayment({
    checkoutId: checkout.id,
    paymentMethodToken: 'pm_test_renewal',
  })
  if (confirmed.status !== 'succeeded') {
    sub.status = 'past_due'
    sub.updatedAt = new Date().toISOString()
    subs.set(sub.id, sub)
    throw new Error('renewal_payment_failed')
  }
  sub.renewals += 1
  sub.status = 'active'
  sub.lastCheckoutId = confirmed.id
  const end = new Date(sub.currentPeriodEnd).getTime()
  sub.currentPeriodEnd = new Date(Math.max(Date.now(), end) + 365 * 86400000).toISOString()
  sub.updatedAt = new Date().toISOString()
  subs.set(sub.id, sub)
  return { subscription: { ...sub, quote: { ...sub.quote } }, checkout: confirmed }
}

export function cancelSandboxSubscription(subscriptionId: string): SandboxSubscription {
  const sub = subs.get(subscriptionId)
  if (!sub) throw new Error('subscription_not_found')
  sub.status = 'canceled'
  sub.updatedAt = new Date().toISOString()
  subs.set(sub.id, sub)
  return { ...sub, quote: { ...sub.quote } }
}

export function getSandboxSubscription(id: string): SandboxSubscription | undefined {
  const s = subs.get(id)
  return s ? { ...s, quote: { ...s.quote } } : undefined
}

export function listSandboxSubscriptions(tenantId?: string): SandboxSubscription[] {
  return [...subs.values()]
    .filter((s) => !tenantId || s.tenantId === tenantId)
    .map((s) => ({ ...s, quote: { ...s.quote } }))
}
