/**
 * Refund settlement pipeline (sandbox):
 * IRS/government wires refund into NOVARA virtual settlement account →
 * operator verifies amount → fees auto-withheld → remaining balance paid to
 * client via ACH (routing/account) or debit rails (Chime / Cash App style) →
 * transactional email ONLY after disbursement is confirmed.
 *
 * Live payments and live banking partners stay hard-OFF (assertNoLivePayments).
 */

import { TC_PERSONAL_FEE, formatMoney } from '../../../data/fees'
import { isValidRoutingNumber, accountLast4, validateAccountNumber } from '../../refundDelivery'
import { assertNoLivePayments, getPhase10Flags } from './config'
import {
  buildRefundDepositNotice,
  listTransactionalEmails,
  queueTransactionalEmail,
  type TransactionalEmailRecord,
} from './transactionalEmail'

export type DebitRail = 'chime' | 'cash_app' | 'other_prepaid'

export type ClientPayoutDestination =
  | {
      kind: 'ach_bank'
      routingNumber: string
      accountLast4: string
      accountType: 'checking' | 'savings'
    }
  | {
      kind: 'debit_rail'
      rail: DebitRail
      /** Masked handle / last4 — never store full card PAN */
      handleMasked: string
    }

export type SettlementPhase =
  | 'awaiting_irs_wire'
  | 'wire_received_pending_verify'
  | 'amount_verified'
  | 'fee_withheld'
  | 'disbursement_submitted'
  | 'disbursement_confirmed'
  | 'transactional_email_sent'
  | 'complete'
  | 'exception'

export interface VirtualSettlementAccount {
  label: string
  /** Display only — sandbox virtual bank */
  accountLast4: string
  routingHint: 'sandbox-virtual'
}

export interface FeeSplitBreakdown {
  grossRefundCents: number
  prepFeeWithheldCents: number
  bankRailFeeCents: number
  netToClientCents: number
  currency: 'usd'
}

export interface RefundSettlementCase {
  id: string
  tenantId: string
  ownerId: string
  taxpayerEmail: string
  taxYear: number
  expectedRefundCents: number
  authorizedPrepFeeCents: number
  bankRailFeeCents: number
  destination: ClientPayoutDestination
  virtualAccount: VirtualSettlementAccount
  phase: SettlementPhase
  inboundWireCents: number | null
  fees: FeeSplitBreakdown | null
  verifiedAt: string | null
  disbursedAt: string | null
  emailId: string | null
  timeline: { at: string; phase: SettlementPhase; note: string }[]
  livePayments: false
  liveBankingPartner: false
  sandboxOnly: true
}

const cases = new Map<string, RefundSettlementCase>()

const VIRTUAL_ACCOUNT: VirtualSettlementAccount = {
  label: 'NOVARA virtual settlement account (sandbox)',
  accountLast4: '9001',
  routingHint: 'sandbox-virtual',
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function pushTimeline(c: RefundSettlementCase, phase: SettlementPhase, note: string) {
  c.phase = phase
  c.timeline.push({ at: new Date().toISOString(), phase, note })
}

function dollarsToCents(n: number): number {
  return Math.round(n * 100)
}

function centsToDollars(c: number): number {
  return c / 100
}

export function resetRefundSettlementForTests(): void {
  cases.clear()
}

export function listRefundSettlementCases(tenantId?: string): RefundSettlementCase[] {
  return [...cases.values()]
    .filter((c) => !tenantId || c.tenantId === tenantId)
    .map((c) => ({ ...c, timeline: [...c.timeline], destination: { ...c.destination }, fees: c.fees ? { ...c.fees } : null }))
}

export function getRefundSettlementCase(id: string): RefundSettlementCase | null {
  const c = cases.get(id)
  return c
    ? { ...c, timeline: [...c.timeline], destination: { ...c.destination }, fees: c.fees ? { ...c.fees } : null }
    : null
}

export function destinationLabel(dest: ClientPayoutDestination): string {
  if (dest.kind === 'ach_bank') {
    return `bank account ••••${dest.accountLast4} (ACH)`
  }
  const rail =
    dest.rail === 'chime' ? 'Chime' : dest.rail === 'cash_app' ? 'Cash App' : 'prepaid debit'
  return `${rail} ${dest.handleMasked}`
}

export function validatePayoutDestination(dest: ClientPayoutDestination): string[] {
  const errors: string[] = []
  if (dest.kind === 'ach_bank') {
    if (!isValidRoutingNumber(dest.routingNumber)) errors.push('Routing number failed ABA validation.')
    if (!dest.accountLast4 || dest.accountLast4.length !== 4) errors.push('Account last four is required.')
  } else {
    if (!dest.handleMasked || dest.handleMasked.replace(/[•*\s]/g, '').length < 2) {
      errors.push('Debit-rail handle must be provided (masked).')
    }
  }
  return errors
}

/** Open a settlement case before IRS funds arrive (sandbox). */
export function openRefundSettlementCase(input: {
  tenantId: string
  ownerId: string
  taxpayerEmail: string
  taxYear: number
  expectedRefundDollars: number
  /** Authorized prep / platform fee to withhold from the refund (defaults to TC personal fee) */
  authorizedPrepFeeDollars?: number
  bankRailFeeDollars?: number
  destination: ClientPayoutDestination
}): RefundSettlementCase {
  assertNoLivePayments()
  if (!getPhase10Flags().bankingAdapterEnabled) throw new Error('banking_adapter_disabled')

  if (input.expectedRefundDollars <= 0) throw new Error('expected_refund_required')
  const destErrors = validatePayoutDestination(input.destination)
  if (destErrors.length) throw new Error(destErrors[0])

  const prep = dollarsToCents(input.authorizedPrepFeeDollars ?? TC_PERSONAL_FEE)
  const rail = dollarsToCents(input.bankRailFeeDollars ?? 0)
  const expected = dollarsToCents(input.expectedRefundDollars)
  if (prep + rail >= expected) throw new Error('fees_exceed_refund')

  const dest =
    input.destination.kind === 'ach_bank'
      ? {
          ...input.destination,
          accountLast4: input.destination.accountLast4 || accountLast4('0000'),
        }
      : { ...input.destination }

  const rec: RefundSettlementCase = {
    id: uid('rset'),
    tenantId: input.tenantId,
    ownerId: input.ownerId,
    taxpayerEmail: input.taxpayerEmail.trim().toLowerCase(),
    taxYear: input.taxYear,
    expectedRefundCents: expected,
    authorizedPrepFeeCents: prep,
    bankRailFeeCents: rail,
    destination: dest,
    virtualAccount: { ...VIRTUAL_ACCOUNT },
    phase: 'awaiting_irs_wire',
    inboundWireCents: null,
    fees: null,
    verifiedAt: null,
    disbursedAt: null,
    emailId: null,
    timeline: [],
    livePayments: false,
    liveBankingPartner: false,
    sandboxOnly: true,
  }
  pushTimeline(
    rec,
    'awaiting_irs_wire',
    `Awaiting IRS wire into ${VIRTUAL_ACCOUNT.label} (••••${VIRTUAL_ACCOUNT.accountLast4}). Client payout: ${destinationLabel(dest)}. No taxpayer email until funds are verified, fees withheld, and remaining balance deposited.`,
  )
  cases.set(rec.id, rec)
  return getRefundSettlementCase(rec.id)!
}

/** Simulate government/IRS digital wire into the virtual settlement account. */
export function receiveIrsWire(caseId: string, inboundRefundDollars: number): RefundSettlementCase {
  assertNoLivePayments()
  const c = cases.get(caseId)
  if (!c) throw new Error('settlement_not_found')
  if (c.phase !== 'awaiting_irs_wire' && c.phase !== 'exception') {
    throw new Error('wire_not_expected_in_phase')
  }
  const cents = dollarsToCents(inboundRefundDollars)
  if (cents <= 0) throw new Error('invalid_wire_amount')
  c.inboundWireCents = cents
  pushTimeline(
    c,
    'wire_received_pending_verify',
    `Sandbox wire received: ${formatMoney(centsToDollars(cents))} into virtual account ••••${c.virtualAccount.accountLast4}. Holding — do not notify taxpayer until amount is checked.`,
  )
  cases.set(c.id, c)
  return getRefundSettlementCase(c.id)!
}

/**
 * Operator/backend check that the deposited amount matches the expected refund.
 * Notification is still blocked until fee split + client deposit complete.
 */
export function verifyInboundDeposit(caseId: string, opts?: { allowMismatch?: boolean }): RefundSettlementCase {
  assertNoLivePayments()
  const c = cases.get(caseId)
  if (!c) throw new Error('settlement_not_found')
  if (c.phase !== 'wire_received_pending_verify') throw new Error('nothing_to_verify')
  if (c.inboundWireCents == null) throw new Error('no_inbound_wire')

  const match = c.inboundWireCents === c.expectedRefundCents
  if (!match && !opts?.allowMismatch) {
    pushTimeline(
      c,
      'exception',
      `Amount mismatch: expected ${formatMoney(centsToDollars(c.expectedRefundCents))}, received ${formatMoney(centsToDollars(c.inboundWireCents))}. Taxpayer not notified.`,
    )
    cases.set(c.id, c)
    return getRefundSettlementCase(c.id)!
  }

  c.verifiedAt = new Date().toISOString()
  pushTimeline(
    c,
    'amount_verified',
    match
      ? 'Inbound amount verified against expected refund. Ready to withhold authorized fees.'
      : 'Mismatch accepted by operator (sandbox). Proceeding with received amount.',
  )
  cases.set(c.id, c)
  return getRefundSettlementCase(c.id)!
}

/** Automatically subtract authorized fees from the verified inbound wire. */
export function withholdAuthorizedFees(caseId: string): RefundSettlementCase {
  assertNoLivePayments()
  const c = cases.get(caseId)
  if (!c) throw new Error('settlement_not_found')
  if (c.phase !== 'amount_verified') throw new Error('verify_before_fee_withhold')
  if (c.inboundWireCents == null) throw new Error('no_inbound_wire')

  const gross = c.inboundWireCents
  const prep = c.authorizedPrepFeeCents
  const rail = c.bankRailFeeCents
  const net = gross - prep - rail
  if (net <= 0) throw new Error('fees_exceed_inbound')

  c.fees = {
    grossRefundCents: gross,
    prepFeeWithheldCents: prep,
    bankRailFeeCents: rail,
    netToClientCents: net,
    currency: 'usd',
  }
  pushTimeline(
    c,
    'fee_withheld',
    `Fees withheld automatically: prep ${formatMoney(centsToDollars(prep))}, rail ${formatMoney(centsToDollars(rail))}. Net to client ${formatMoney(centsToDollars(net))}. Still no taxpayer email.`,
  )
  cases.set(c.id, c)
  return getRefundSettlementCase(c.id)!
}

/** Submit ACH or debit-rail payout of the remaining balance (sandbox). */
export function submitClientDisbursement(caseId: string): RefundSettlementCase {
  assertNoLivePayments()
  const c = cases.get(caseId)
  if (!c) throw new Error('settlement_not_found')
  if (c.phase !== 'fee_withheld' || !c.fees) throw new Error('withhold_fees_first')

  pushTimeline(
    c,
    'disbursement_submitted',
    `Sandbox disbursement submitted: ${formatMoney(centsToDollars(c.fees.netToClientCents))} → ${destinationLabel(c.destination)}.`,
  )
  cases.set(c.id, c)
  return getRefundSettlementCase(c.id)!
}

/** Confirm the client deposit landed — still no email until the next step. */
export function confirmClientDisbursement(caseId: string): RefundSettlementCase {
  assertNoLivePayments()
  const c = cases.get(caseId)
  if (!c) throw new Error('settlement_not_found')
  if (c.phase !== 'disbursement_submitted') throw new Error('submit_disbursement_first')

  c.disbursedAt = new Date().toISOString()
  pushTimeline(
    c,
    'disbursement_confirmed',
    `Client deposit confirmed to ${destinationLabel(c.destination)}. Transactional email may now be sent.`,
  )
  cases.set(c.id, c)
  return getRefundSettlementCase(c.id)!
}

/**
 * Send the taxpayer transactional email — blocked until disbursement_confirmed.
 * This is the payment-processing ↔ email hook the product requires.
 */
export function sendDepositTransactionalEmail(caseId: string): {
  settlement: RefundSettlementCase
  email: TransactionalEmailRecord
} {
  assertNoLivePayments()
  const c = cases.get(caseId)
  if (!c) throw new Error('settlement_not_found')
  if (c.phase !== 'disbursement_confirmed' && c.phase !== 'transactional_email_sent') {
    throw new Error('email_blocked_until_disbursement_confirmed')
  }
  if (!c.fees) throw new Error('missing_fee_split')
  if (c.emailId) {
    const existing = listTransactionalEmails(c.id).find((e) => e.id === c.emailId)
    if (existing) return { settlement: getRefundSettlementCase(c.id)!, email: existing }
  }

  const draft = buildRefundDepositNotice({
    settlementCaseId: c.id,
    toEmail: c.taxpayerEmail,
    netDepositedDollars: centsToDollars(c.fees.netToClientCents),
    feeWithheldDollars: centsToDollars(c.fees.prepFeeWithheldCents + c.fees.bankRailFeeCents),
    grossRefundDollars: centsToDollars(c.fees.grossRefundCents),
    destinationLabel: destinationLabel(c.destination),
  })
  const email = queueTransactionalEmail(draft)
  c.emailId = email.id
  pushTimeline(
    c,
    'transactional_email_sent',
    `Transactional email queued to ${email.toMasked}: remaining balance deposited notice.`,
  )
  pushTimeline(c, 'complete', 'Settlement complete (sandbox). Live bank rails remain OFF.')
  cases.set(c.id, c)
  return { settlement: getRefundSettlementCase(c.id)!, email }
}

/**
 * Run the happy-path sandbox pipeline end-to-end after a case is opened.
 * Still requires an explicit wire amount (defaults to expected refund).
 */
export function runSandboxSettlementHappyPath(
  caseId: string,
  opts?: { wireDollars?: number },
): { settlement: RefundSettlementCase; email: TransactionalEmailRecord } {
  assertNoLivePayments()
  const existing = cases.get(caseId)
  if (!existing) throw new Error('settlement_not_found')
  const wire = opts?.wireDollars ?? centsToDollars(existing.expectedRefundCents)
  receiveIrsWire(caseId, wire)
  verifyInboundDeposit(caseId)
  withholdAuthorizedFees(caseId)
  submitClientDisbursement(caseId)
  confirmClientDisbursement(caseId)
  return sendDepositTransactionalEmail(caseId)
}

/** Helper for UI forms that still have an ephemeral full account number. */
export function achDestinationFromForm(input: {
  routingNumber: string
  accountNumber: string
  accountType: 'checking' | 'savings'
}): ClientPayoutDestination {
  if (!validateAccountNumber(input.accountNumber)) {
    throw new Error('invalid_account_number')
  }
  return {
    kind: 'ach_bank',
    routingNumber: input.routingNumber.replace(/\D/g, ''),
    accountLast4: accountLast4(input.accountNumber),
    accountType: input.accountType,
  }
}

export function debitRailDestination(rail: DebitRail, handleOrLast4: string): ClientPayoutDestination {
  const cleaned = handleOrLast4.trim()
  const masked =
    cleaned.includes('@') || cleaned.startsWith('$')
      ? `${cleaned.slice(0, 2)}•••${cleaned.slice(-2)}`
      : `••••${cleaned.replace(/\D/g, '').slice(-4) || '0000'}`
  return { kind: 'debit_rail', rail, handleMasked: masked }
}
