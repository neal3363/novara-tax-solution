/**
 * Taxpayer refund / filing status dashboard model.
 * Distinguishes NOVARA internal status, IRS ACK, and bank-provider status.
 */

import type { ReturnState, TaxReturn } from '../data/types'
import type { BankProductApplication } from './bankProducts'
import type { RefundDeliverySelection } from './refundDelivery'

export type StatusSource = 'novara' | 'irs' | 'bank_provider'

export interface RefundTrackingEvent {
  id: string
  at: string
  source: StatusSource
  title: string
  detail: string
}

export interface RefundTrackingSnapshot {
  returnState: ReturnState
  novaraPhase: string
  irsPhase: string
  bankPhase: string
  verifiedRefund: number
  deliveryMethod: string | null
  rejectionReason: string | null
  events: RefundTrackingEvent[]
  canCorrect: boolean
}

export function buildRefundTrackingSnapshot(input: {
  taxReturn: TaxReturn | null | undefined
  verifiedRefund: number
  delivery: RefundDeliverySelection | null
  bankApp?: BankProductApplication | null
  transmittedAt?: string | null
  acceptedAt?: string | null
  rejectedReason?: string | null
}): RefundTrackingSnapshot {
  const state = input.taxReturn?.state ?? 'Intake Started'
  const events: RefundTrackingEvent[] = []
  const now = new Date().toISOString()

  events.push({
    id: 'novara-prep',
    at: input.taxReturn?.updatedAt ?? now,
    source: 'novara',
    title: 'Return preparation',
    detail: `NOVARA status: ${state}`,
  })

  if (['Signature Pending', 'Ready to File', 'Client Review'].includes(state)) {
    events.push({
      id: 'novara-auth',
      at: now,
      source: 'novara',
      title: 'Awaiting taxpayer authorization',
      detail: 'Signatures / Form 8879 and refund delivery must be complete before sandbox e-file.',
    })
  }

  if (state === 'Transmitted' || state === 'Accepted' || state === 'Rejected') {
    events.push({
      id: 'irs-submit',
      at: input.transmittedAt ?? now,
      source: 'irs',
      title: 'Submitted to IRS (sandbox)',
      detail: 'Sandbox e-file adapter only — not a live MeF transmission.',
    })
  }

  if (state === 'Accepted') {
    events.push({
      id: 'irs-ack',
      at: input.acceptedAt ?? now,
      source: 'irs',
      title: 'Accepted (sandbox acknowledgment)',
      detail: 'IRS acceptance is simulated in this environment.',
    })
  }

  if (state === 'Rejected') {
    events.push({
      id: 'irs-reject',
      at: now,
      source: 'irs',
      title: 'Rejected',
      detail: input.rejectedReason ?? 'Rejection reason from transmitter when available — never invented.',
    })
  }

  if (input.delivery) {
    events.push({
      id: 'delivery',
      at: input.delivery.selectedAt,
      source: 'novara',
      title: 'Refund delivery selected',
      detail: `Method: ${input.delivery.method.replace(/_/g, ' ')} · based on verified refund $${input.delivery.verifiedRefundAmount.toLocaleString()}`,
    })
  }

  if (input.bankApp) {
    events.push({
      id: 'bank',
      at: input.bankApp.updatedAt,
      source: 'bank_provider',
      title: `Bank product: ${input.bankApp.status}`,
      detail: input.bankApp.lastMessage,
    })
  }

  let irsPhase = 'Not submitted'
  if (state === 'Transmitted') irsPhase = 'Submitted — awaiting ACK (sandbox)'
  if (state === 'Accepted') irsPhase = 'Accepted (sandbox)'
  if (state === 'Rejected') irsPhase = 'Rejected — correction required'

  let bankPhase = 'Not applicable'
  if (input.delivery?.method === 'bank_product') {
    bankPhase = input.bankApp?.status.replace(/_/g, ' ') ?? 'Provider offline — not submitted'
  } else if (input.delivery?.method === 'direct_deposit') {
    bankPhase = 'Taxpayer direct deposit — IRS pays account (no bank product)'
  } else if (input.delivery?.method === 'paper_check') {
    bankPhase = 'Paper check — IRS mail'
  }

  return {
    returnState: state,
    novaraPhase: state,
    irsPhase,
    bankPhase,
    verifiedRefund: input.verifiedRefund,
    deliveryMethod: input.delivery?.method ?? null,
    rejectionReason: state === 'Rejected' ? input.rejectedReason ?? 'See transmitter ACK when available' : null,
    events,
    canCorrect: state === 'Rejected' || state === 'Diagnostics',
  }
}
