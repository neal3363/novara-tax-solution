/**
 * Sandbox Stripe (or approved processor) adapter.
 * Hosted checkout / tokenized collection simulation — no raw PAN storage.
 * Webhook signature verification + idempotent processing.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { assertNoLivePayments, getPhase10Flags } from './config'
import type { FeeQuote } from './quotes'

export type PaymentStatus =
  | 'requires_payment_method'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'

export interface SandboxCheckoutSession {
  id: string
  clientSecret: string
  quote: FeeQuote
  tenantId: string
  principalId: string
  idempotencyKey: string
  status: PaymentStatus
  mode: 'sandbox'
  livePayments: false
  /** Never store raw card numbers — token only */
  paymentMethodToken?: string
  createdAt: string
  updatedAt: string
  failureCode?: string
  webhookDelivered?: boolean
}

export interface SandboxWebhookEvent {
  id: string
  type: 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 'charge.refunded' | 'charge.dispute.created'
  checkoutId: string
  signature: string
  payload: string
  livemode: false
}

const sessions = new Map<string, SandboxCheckoutSession>()
const idempotencyIndex = new Map<string, string>() // key -> checkoutId
const processedWebhooks = new Set<string>()

let providerMode: 'online' | 'unavailable' = 'online'
let webhookSecret = process.env.NOVARA_STRIPE_SANDBOX_WEBHOOK_SECRET || randomBytes(16).toString('hex')

export function resetStripeSandboxForTests(): void {
  sessions.clear()
  idempotencyIndex.clear()
  processedWebhooks.clear()
  providerMode = 'online'
  webhookSecret = randomBytes(16).toString('hex')
}

export function setStripeProviderMode(mode: 'online' | 'unavailable'): void {
  providerMode = mode
}

export function getStripeWebhookSecretForTests(): string {
  return webhookSecret
}

function signPayload(payload: string): string {
  return createHmac('sha256', webhookSecret).update(payload).digest('hex')
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload)
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function createSandboxCheckout(input: {
  quote: FeeQuote
  tenantId: string
  principalId: string
  idempotencyKey: string
}): SandboxCheckoutSession {
  assertNoLivePayments()
  if (!getPhase10Flags().sandboxStripeEnabled) throw new Error('sandbox_stripe_disabled')
  if (providerMode === 'unavailable') throw new Error('payment_provider_unavailable')

  const existingId = idempotencyIndex.get(input.idempotencyKey)
  if (existingId) {
    const existing = sessions.get(existingId)
    if (existing) return { ...existing, quote: { ...existing.quote } }
  }

  const id = `cs_test_${randomBytes(8).toString('hex')}`
  const session: SandboxCheckoutSession = {
    id,
    clientSecret: `secret_${randomBytes(12).toString('hex')}`,
    quote: { ...input.quote, livePayments: false },
    tenantId: input.tenantId,
    principalId: input.principalId,
    idempotencyKey: input.idempotencyKey,
    status: 'requires_payment_method',
    mode: 'sandbox',
    livePayments: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  sessions.set(id, session)
  idempotencyIndex.set(input.idempotencyKey, id)
  return { ...session, quote: { ...session.quote } }
}

/** Confirm with a tokenized payment method — never accept raw PAN. */
export function confirmSandboxPayment(input: {
  checkoutId: string
  paymentMethodToken: string
  forceFail?: boolean
}): SandboxCheckoutSession {
  assertNoLivePayments()
  if (providerMode === 'unavailable') throw new Error('payment_provider_unavailable')
  if (/^\d{13,19}$/.test(input.paymentMethodToken.replace(/\s/g, ''))) {
    throw new Error('raw_card_number_forbidden')
  }
  const s = sessions.get(input.checkoutId)
  if (!s) throw new Error('checkout_not_found')
  if (s.status === 'succeeded') return { ...s, quote: { ...s.quote } } // idempotent confirm

  s.paymentMethodToken = input.paymentMethodToken.startsWith('pm_')
    ? input.paymentMethodToken
    : `pm_test_${input.paymentMethodToken.slice(0, 12)}`
  s.status = input.forceFail ? 'failed' : 'succeeded'
  s.failureCode = input.forceFail ? 'card_declined' : undefined
  s.updatedAt = new Date().toISOString()
  sessions.set(s.id, s)
  return { ...s, quote: { ...s.quote } }
}

export function refundSandboxPayment(input: {
  checkoutId: string
  amountCents?: number
}): SandboxCheckoutSession {
  assertNoLivePayments()
  const s = sessions.get(input.checkoutId)
  if (!s) throw new Error('checkout_not_found')
  if (s.status !== 'succeeded' && s.status !== 'partially_refunded') throw new Error('not_refundable')
  const amt = input.amountCents ?? s.quote.amountCents
  s.status = amt < s.quote.amountCents ? 'partially_refunded' : 'refunded'
  s.updatedAt = new Date().toISOString()
  sessions.set(s.id, s)
  return { ...s, quote: { ...s.quote } }
}

export function buildSandboxWebhook(input: {
  checkoutId: string
  type: SandboxWebhookEvent['type']
}): SandboxWebhookEvent {
  const payload = JSON.stringify({
    id: `evt_test_${randomBytes(6).toString('hex')}`,
    type: input.type,
    data: { object: { id: input.checkoutId } },
    livemode: false,
  })
  return {
    id: JSON.parse(payload).id,
    type: input.type,
    checkoutId: input.checkoutId,
    signature: signPayload(payload),
    payload,
    livemode: false,
  }
}

export function processSandboxWebhook(event: SandboxWebhookEvent): {
  ok: boolean
  duplicate?: boolean
  error?: string
  session?: SandboxCheckoutSession
} {
  assertNoLivePayments()
  if (!verifyWebhookSignature(event.payload, event.signature)) {
    return { ok: false, error: 'invalid_webhook_signature' }
  }
  if (processedWebhooks.has(event.id)) {
    return { ok: true, duplicate: true, session: sessions.get(event.checkoutId) }
  }
  const s = sessions.get(event.checkoutId)
  if (!s) return { ok: false, error: 'checkout_not_found' }

  if (event.type === 'payment_intent.succeeded') s.status = 'succeeded'
  if (event.type === 'payment_intent.payment_failed') s.status = 'failed'
  if (event.type === 'charge.refunded') s.status = 'refunded'
  if (event.type === 'charge.dispute.created') s.status = 'disputed'
  s.webhookDelivered = true
  s.updatedAt = new Date().toISOString()
  sessions.set(s.id, s)
  processedWebhooks.add(event.id)
  return { ok: true, session: { ...s, quote: { ...s.quote } } }
}

export function getSandboxCheckout(id: string): SandboxCheckoutSession | undefined {
  const s = sessions.get(id)
  return s ? { ...s, quote: { ...s.quote } } : undefined
}

export function listSandboxCheckouts(filter?: { tenantId?: string }): SandboxCheckoutSession[] {
  return [...sessions.values()]
    .filter((s) => !filter?.tenantId || s.tenantId === filter.tenantId)
    .map((s) => ({ ...s, quote: { ...s.quote } }))
}
