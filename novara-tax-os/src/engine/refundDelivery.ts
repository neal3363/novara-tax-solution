/**
 * Refund delivery selection — mandatory before e-file authorization.
 * Validates routing/account shapes; never logs full account numbers.
 * Form 8888-style allocations are supported when splitting a refund.
 */

export type RefundDeliveryMethod = 'direct_deposit' | 'paper_check' | 'bank_product'

export type BankAccountType = 'checking' | 'savings'

export interface DirectDepositAccount {
  routingNumber: string
  /** Last 4 only when stored for display — full number held ephemerally for validation */
  accountLast4: string
  accountType: BankAccountType
  /** Ephemeral full account — cleared after selection is confirmed; never persisted in prod logs */
  accountNumberEphemeral?: string
}

export interface Form8888Allocation {
  id: string
  amount: number
  routingNumber: string
  accountLast4: string
  accountType: BankAccountType
}

export interface RefundDeliverySelection {
  method: RefundDeliveryMethod
  /** Verified refund amount this selection is based on (from maximizer projectedRefund) */
  verifiedRefundAmount: number
  selectedAt: string
  /** Direct deposit (single account) when method === direct_deposit and no 8888 split */
  deposit?: DirectDepositAccount
  /** Form 8888 allocations when splitting — amounts must sum to verifiedRefundAmount */
  form8888?: Form8888Allocation[]
  /** Bank-product provider id when method === bank_product — product remains pending until live API */
  bankProductProviderId?: string
  bankProductCode?: string
  taxpayerAuthorized: boolean
  notes?: string
}

export interface RefundDeliveryValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
}

/** ABA routing checksum (US) */
export function isValidRoutingNumber(routing: string): boolean {
  const r = routing.replace(/\D/g, '')
  if (!/^\d{9}$/.test(r)) return false
  const d = r.split('').map(Number)
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])
  return sum % 10 === 0
}

export function maskAccountNumber(account: string): string {
  const digits = account.replace(/\D/g, '')
  if (digits.length < 4) return '••••'
  return `••••${digits.slice(-4)}`
}

export function accountLast4(account: string): string {
  const digits = account.replace(/\D/g, '')
  return digits.slice(-4)
}

export function validateAccountNumber(account: string): boolean {
  const digits = account.replace(/\D/g, '')
  return digits.length >= 4 && digits.length <= 17
}

export function validateRefundDelivery(
  selection: Partial<RefundDeliverySelection> & { method?: RefundDeliveryMethod },
  verifiedRefund: number,
): RefundDeliveryValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (!selection.method) {
    errors.push('Select a refund delivery method.')
    return { ok: false, errors, warnings }
  }

  if (verifiedRefund <= 0 && selection.method !== 'paper_check') {
    warnings.push('Current verified refund is $0 or a balance due — delivery may not apply until the return shows a refund.')
  }

  if (selection.method === 'direct_deposit') {
    const allocations = selection.form8888
    if (allocations && allocations.length > 0) {
      const sum = allocations.reduce((s, a) => s + a.amount, 0)
      if (verifiedRefund > 0 && Math.abs(sum - verifiedRefund) > 0.01) {
        errors.push('Form 8888 allocation amounts must equal the verified refund.')
      }
      for (const a of allocations) {
        if (!isValidRoutingNumber(a.routingNumber)) errors.push(`Invalid routing number on allocation ${a.id}.`)
        if (!a.accountLast4 || a.accountLast4.length < 4) errors.push(`Account last-4 missing on allocation ${a.id}.`)
        if (a.amount <= 0) errors.push(`Allocation ${a.id} must be greater than zero.`)
      }
    } else {
      const dep = selection.deposit
      if (!dep) errors.push('Enter a verified direct-deposit account.')
      else {
        if (!isValidRoutingNumber(dep.routingNumber)) errors.push('Routing number failed ABA validation.')
        if (dep.accountNumberEphemeral && !validateAccountNumber(dep.accountNumberEphemeral)) {
          errors.push('Account number must be 4–17 digits.')
        }
        if (!dep.accountLast4 && !dep.accountNumberEphemeral) errors.push('Account number is required.')
        if (!dep.accountType) errors.push('Select checking or savings.')
      }
    }
  }

  if (selection.method === 'bank_product') {
    if (!selection.bankProductProviderId) {
      errors.push('Select a bank-product provider configuration.')
    }
    warnings.push(
      'Bank-product refund transfer is not live until the provider API is connected and verified. NOVARA will not simulate an approval.',
    )
  }

  if (!selection.taxpayerAuthorized) {
    errors.push('Taxpayer must authorize the selected refund delivery method.')
  }

  return { ok: errors.length === 0, errors, warnings }
}

/** Persist-safe copy — strips ephemeral full account numbers */
export function sanitizeRefundDeliveryForStorage(sel: RefundDeliverySelection): RefundDeliverySelection {
  return {
    ...sel,
    deposit: sel.deposit
      ? {
          routingNumber: sel.deposit.routingNumber,
          accountLast4: sel.deposit.accountLast4 || accountLast4(sel.deposit.accountNumberEphemeral || ''),
          accountType: sel.deposit.accountType,
        }
      : undefined,
    form8888: sel.form8888?.map((a) => ({
      id: a.id,
      amount: a.amount,
      routingNumber: a.routingNumber,
      accountLast4: a.accountLast4,
      accountType: a.accountType,
    })),
  }
}

export const REFUND_DELIVERY_LABELS: Record<RefundDeliveryMethod, string> = {
  direct_deposit: 'Direct deposit to my account',
  paper_check: 'IRS paper check by mail',
  bank_product: 'Bank-product refund transfer (when provider is live)',
}
