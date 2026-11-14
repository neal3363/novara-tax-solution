/**
 * Authorized refund-banking partner adapter (sandbox).
 *
 * Stripe (phase10/stripeSandbox) is for software subscription / prep-fee checkout only.
 * It is NOT a refund settlement rail for IRS wires, fee withhold, or client disbursement.
 *
 * Live money movement stays hard-OFF until:
 *  - Signed agreement with an authorized refund-transfer / bank-product provider
 *  - Partner sandbox + production credentials in secrets manager
 *  - Official settlement / webhook tests with evidence
 *  - `liveBankingPartner` flipped only after owner approval
 */

import { assertNoLivePayments, getPhase10Flags } from './config'

export type RefundBankPartnerId = 'unconfigured' | 'sandbox_simulated_partner'

export type PartnerEventType =
  | 'inbound_wire_posted'
  | 'inbound_wire_verified'
  | 'fee_withheld'
  | 'disbursement_submitted'
  | 'disbursement_settled'
  | 'disbursement_failed'
  | 'duplicate_ignored'

export interface PartnerWebhookEvent {
  id: string
  type: PartnerEventType
  settlementCaseId: string
  amountCents: number
  currency: 'usd'
  occurredAt: string
  /** Partner-supplied idempotency key */
  idempotencyKey: string
}

export interface PartnerConnectionStatus {
  partnerId: RefundBankPartnerId
  partnerConnected: false
  liveBankingPartner: false
  stripeIsNotRefundSettlement: true
  agreementRequired: true
  message: string
  requiredSecretNames: string[]
}

export interface ProcessedPartnerEvent {
  accepted: boolean
  reason: string
  event: PartnerWebhookEvent
  duplicate: boolean
}

const processedKeys = new Set<string>()
const eventLog: ProcessedPartnerEvent[] = []

/** Deterministic sandbox tag — not a production crypto primitive. */
function sandboxTag(secret: string, rawBody: string): string {
  let h = 2166136261
  const s = `${secret}|${rawBody}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `sbx_${(h >>> 0).toString(16)}`
}

export function resetRefundBankPartnerForTests(): void {
  processedKeys.clear()
  eventLog.length = 0
}

export function refundBankPartnerStatus(): PartnerConnectionStatus {
  return {
    partnerId: 'unconfigured',
    partnerConnected: false,
    liveBankingPartner: false,
    stripeIsNotRefundSettlement: true,
    agreementRequired: true,
    message:
      'No authorized refund-banking partner is connected. Stripe sandbox handles software billing only — not IRS refund settlement, fee withhold, or client disbursement.',
    requiredSecretNames: [
      'REFUND_BANK_PARTNER_API_KEY',
      'REFUND_BANK_PARTNER_WEBHOOK_SECRET',
      'REFUND_BANK_PARTNER_MERCHANT_ID',
      'NOVARA_VIRTUAL_SETTLEMENT_ACCOUNT_ID',
    ],
  }
}

/** Verify partner webhook signatures (sandbox tag only). */
export function verifyPartnerWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!secret || !signatureHeader) return false
  const expected = sandboxTag(secret, rawBody)
  if (expected.length !== signatureHeader.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i)
  }
  return diff === 0
}

export function signPartnerWebhookForTests(rawBody: string, secret: string): string {
  return sandboxTag(secret, rawBody)
}

/**
 * Process a partner webhook. Duplicate idempotency keys are ignored.
 * Live partner processing is blocked while liveBankingPartner is false —
 * sandbox may still record simulated events for reconciliation drills.
 */
export function processPartnerWebhookEvent(
  event: PartnerWebhookEvent,
  opts?: { simulated?: boolean },
): ProcessedPartnerEvent {
  assertNoLivePayments()
  const flags = getPhase10Flags()
  if (flags.liveBankingPartner) {
    throw new Error('live_banking_partner_must_remain_false')
  }

  if (processedKeys.has(event.idempotencyKey)) {
    const dup: ProcessedPartnerEvent = {
      accepted: false,
      reason: 'duplicate_idempotency_key',
      event,
      duplicate: true,
    }
    eventLog.push(dup)
    return { ...dup, event: { ...event } }
  }

  if (!opts?.simulated && refundBankPartnerStatus().partnerConnected === false) {
    const blocked: ProcessedPartnerEvent = {
      accepted: false,
      reason: 'partner_not_connected_live_events_rejected',
      event,
      duplicate: false,
    }
    eventLog.push(blocked)
    return { ...blocked, event: { ...event } }
  }

  processedKeys.add(event.idempotencyKey)
  const ok: ProcessedPartnerEvent = {
    accepted: true,
    reason: opts?.simulated ? 'sandbox_simulated_event_recorded' : 'accepted',
    event,
    duplicate: false,
  }
  eventLog.push(ok)
  return { ...ok, event: { ...event } }
}

export function listPartnerEventLog(): ProcessedPartnerEvent[] {
  return eventLog.map((e) => ({ ...e, event: { ...e.event } }))
}

export function buildReconciliationSnapshot(settlementCaseId: string): {
  settlementCaseId: string
  events: PartnerWebhookEvent[]
  duplicatesBlocked: number
  partnerConnected: false
  note: string
} {
  const related = eventLog.filter((e) => e.event.settlementCaseId === settlementCaseId)
  return {
    settlementCaseId,
    events: related.filter((e) => e.accepted).map((e) => ({ ...e.event })),
    duplicatesBlocked: related.filter((e) => e.duplicate).length,
    partnerConnected: false,
    note: 'Reconciliation is sandbox-only until an authorized refund-banking partner is connected. Do not treat Stripe checkout events as refund settlement.',
  }
}
