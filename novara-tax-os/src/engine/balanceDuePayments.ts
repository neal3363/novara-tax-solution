/**
 * Balance-due payment guidance — for taxpayers who owe, not only refunds.
 * Never claims a payment was submitted or accepted.
 */

export type PaymentChannel =
  | 'irs_direct_pay'
  | 'eftps'
  | 'irs_online_account'
  | 'payment_plan'
  | 'voucher'
  | 'state_payment'

export interface PaymentOption {
  id: PaymentChannel
  title: string
  jurisdiction: 'federal' | 'state' | 'both'
  summary: string
  deadlineNote: string
  howTo: string
  /** Official info URL when known — guidance only */
  infoUrl?: string
}

export interface BalanceDueGuidance {
  balanceDue: number
  isBalanceDue: boolean
  explanation: string
  options: PaymentOption[]
  reminders: string[]
  disclaimer: string
}

export function buildBalanceDueGuidance(input: {
  refundOrBalance: number
  taxYear: number
  filingState?: string
}): BalanceDueGuidance {
  const balanceDue = input.refundOrBalance < 0 ? Math.abs(input.refundOrBalance) : 0
  const isBalanceDue = balanceDue > 0
  const state = (input.filingState || '').trim()

  const options: PaymentOption[] = [
    {
      id: 'irs_direct_pay',
      title: 'IRS Direct Pay',
      jurisdiction: 'federal',
      summary: 'Pay federal tax directly from a checking or savings account at no IRS fee.',
      deadlineNote: `Pay by the TY${input.taxYear} filing deadline (generally April 15 of the following year, or extension due date).`,
      howTo: 'Use IRS Direct Pay on IRS.gov — select the tax year and “Balance Due” / Form 1040. NOVARA does not submit this payment for you.',
      infoUrl: 'https://www.irs.gov/payments/direct-pay',
    },
    {
      id: 'eftps',
      title: 'Electronic Federal Tax Payment System (EFTPS)',
      jurisdiction: 'federal',
      summary: 'Treasury system for scheduling federal tax payments (enrollment required).',
      deadlineNote: 'Enroll in advance — first-time enrollment can take several days.',
      howTo: 'Register at EFTPS.gov if not already enrolled. NOVARA provides guidance only; it does not transmit EFTPS payments.',
      infoUrl: 'https://www.eftps.gov/',
    },
    {
      id: 'irs_online_account',
      title: 'IRS Online Account',
      jurisdiction: 'federal',
      summary: 'View balance and available payment methods in the taxpayer’s IRS online account.',
      deadlineNote: 'Confirm the amount due in the IRS account before paying.',
      howTo: 'Sign in at IRS.gov online account. Card payments may include a processing fee charged by the payment processor — not by NOVARA.',
      infoUrl: 'https://www.irs.gov/payments',
    },
    {
      id: 'payment_plan',
      title: 'IRS payment plan (installment agreement)',
      jurisdiction: 'federal',
      summary: 'Short-term or long-term installment options when the full amount cannot be paid immediately.',
      deadlineNote: 'Apply before or after filing; penalties/interest may continue to accrue.',
      howTo: 'Review IRS Online Payment Agreement options. NOVARA does not approve or guarantee installment agreements.',
      infoUrl: 'https://www.irs.gov/payments/online-payment-agreement-application',
    },
    {
      id: 'voucher',
      title: 'Payment voucher (Form 1040-V)',
      jurisdiction: 'federal',
      summary: 'Mail a check with Form 1040-V when required for paper payments.',
      deadlineNote: 'Use the address for the taxpayer’s state as shown in IRS Form 1040-V instructions.',
      howTo: 'Generate/print voucher from IRS instructions. Keep a copy with payment confirmation records you obtain outside NOVARA.',
    },
  ]

  if (state) {
    options.push({
      id: 'state_payment',
      title: `State payment instructions (${state})`,
      jurisdiction: 'state',
      summary: 'Follow the state revenue agency’s electronic payment or voucher process for any state balance due.',
      deadlineNote: 'State deadlines may differ from federal.',
      howTo: `Look up the ${state} department of revenue e-pay portal. State returns are partial in this demo — treat this as guidance only.`,
    })
  }

  const reminders = [
    `Keep IRS/state confirmation numbers outside NOVARA — this app does not mark payments as submitted.`,
    `Estimated tax (Form 1040-ES) may apply for next year if underpayment risk remains.`,
    `Ask the AI Refund Maximizer / interview about lawful credits and deductions before paying — never invent eligibility.`,
  ]

  return {
    balanceDue,
    isBalanceDue,
    explanation: isBalanceDue
      ? `The working return shows an estimated federal balance due of $${balanceDue.toLocaleString()}. Review calculations and any remaining tax-saving questions before paying.`
      : 'No federal balance due on the current projection (refund or zero). Payment options appear when a balance due is calculated.',
    options: isBalanceDue ? options : options.slice(0, 2),
    reminders,
    disclaimer:
      'Guidance only. NOVARA never claims a tax payment was submitted, received, or accepted by the IRS or any state. Confirm all amounts and deadlines with official IRS/state sources.',
  }
}
