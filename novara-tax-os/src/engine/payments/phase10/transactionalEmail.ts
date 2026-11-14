/**
 * Transactional email for refund disbursement — sandbox only.
 * Deposit emails must NOT send until the client payout is confirmed.
 */

export type TransactionalEmailKind =
  | 'refund_deposit_notice'
  | 'fee_withheld_internal'
  | 'settlement_exception'

export interface TransactionalEmailRecord {
  id: string
  kind: TransactionalEmailKind
  toMasked: string
  subject: string
  body: string
  settlementCaseId: string
  createdAt: string
  /** Always sandbox — never claims a live ESP send */
  delivery: 'sandbox_queued'
}

const outbox: TransactionalEmailRecord[] = []

export function resetTransactionalEmailForTests(): void {
  outbox.length = 0
}

export function listTransactionalEmails(settlementCaseId?: string): TransactionalEmailRecord[] {
  return outbox
    .filter((e) => !settlementCaseId || e.settlementCaseId === settlementCaseId)
    .map((e) => ({ ...e }))
}

export function maskEmail(email: string): string {
  const t = email.trim().toLowerCase()
  const at = t.indexOf('@')
  if (at < 1) return '•••@•••'
  const user = t.slice(0, at)
  const domain = t.slice(at + 1)
  const show = user.slice(0, Math.min(2, user.length))
  return `${show}•••@${domain}`
}

/** Build the taxpayer-facing deposit notice (queued only after disbursement confirm). */
export function buildRefundDepositNotice(input: {
  settlementCaseId: string
  toEmail: string
  netDepositedDollars: number
  feeWithheldDollars: number
  grossRefundDollars: number
  destinationLabel: string
}): Omit<TransactionalEmailRecord, 'id' | 'createdAt' | 'delivery'> {
  const net = input.netDepositedDollars.toFixed(2)
  const fee = input.feeWithheldDollars.toFixed(2)
  const gross = input.grossRefundDollars.toFixed(2)
  return {
    kind: 'refund_deposit_notice',
    toMasked: maskEmail(input.toEmail),
    settlementCaseId: input.settlementCaseId,
    subject: 'NOVARA deposited your remaining tax refund',
    body: [
      `We deposited $${net} of your $${gross} tax refund to ${input.destinationLabel}.`,
      `Authorized preparation / settlement fees of $${fee} were withheld before disbursement.`,
      'This notice is sent only after the deposit was verified and the remaining balance was released.',
      'Sandbox notice — not a live bank or email-provider send.',
    ].join(' '),
  }
}

export function queueTransactionalEmail(
  draft: Omit<TransactionalEmailRecord, 'id' | 'createdAt' | 'delivery'>,
): TransactionalEmailRecord {
  const rec: TransactionalEmailRecord = {
    ...draft,
    id: `teml_${outbox.length + 1}_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    delivery: 'sandbox_queued',
  }
  outbox.push(rec)
  return { ...rec }
}
