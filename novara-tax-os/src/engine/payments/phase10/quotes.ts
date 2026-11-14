/**
 * Fee quotes — always import from fees.ts (never redefine approved prices).
 */

import {
  TC_PERSONAL_FEE,
  TC_BUSINESS_FEE,
  TP_REGISTRATION_FEE,
  TP_PERSONAL_FEE,
  TP_BUSINESS_FEE,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  OFFICE_PERSONAL_FEE,
  OFFICE_BUSINESS_FEE,
  PRIOR_YEAR_SURCHARGE,
  PRICING,
} from '../../../data/fees'

export type ChargeKind =
  | 'tc_personal'
  | 'tc_business'
  | 'tp_subscription'
  | 'tp_personal'
  | 'tp_business'
  | 'office_subscription_standard'
  | 'office_subscription_plus'
  | 'office_personal'
  | 'office_business'
  | 'prior_year_surcharge'

export interface FeeQuote {
  kind: ChargeKind
  label: string
  amountCents: number
  amountDollars: number
  currency: 'usd'
  priorYearSurchargeCents?: number
  source: 'fees.ts'
  livePayments: false
}

function dollars(n: number): FeeQuote['amountDollars'] {
  return n
}

function cents(n: number): number {
  return Math.round(n * 100)
}

export function quoteCharge(kind: ChargeKind, opts?: { includePriorYearSurcharge?: boolean }): FeeQuote {
  const surcharge = opts?.includePriorYearSurcharge ? PRIOR_YEAR_SURCHARGE : 0
  const table: Record<ChargeKind, { label: string; amount: number }> = {
    tc_personal: { label: 'Tax Client personal preparation', amount: TC_PERSONAL_FEE },
    tc_business: { label: 'Tax Client business preparation', amount: TC_BUSINESS_FEE },
    tp_subscription: { label: 'Independent Tax Preparer registration/subscription', amount: TP_REGISTRATION_FEE },
    tp_personal: { label: 'TP personal return software fee', amount: TP_PERSONAL_FEE },
    tp_business: { label: 'TP business return software fee', amount: TP_BUSINESS_FEE },
    office_subscription_standard: {
      label: 'Tax Office annual subscription (Standard)',
      amount: OFFICE_SUBSCRIPTION_FLOOR,
    },
    office_subscription_plus: {
      label: 'Tax Office annual subscription (Plus)',
      amount: OFFICE_SUBSCRIPTION_HIGH,
    },
    office_personal: { label: 'Office personal return software fee', amount: OFFICE_PERSONAL_FEE },
    office_business: { label: 'Office business return software fee', amount: OFFICE_BUSINESS_FEE },
    prior_year_surcharge: { label: 'Prior-year surcharge', amount: PRIOR_YEAR_SURCHARGE },
  }
  const row = table[kind]
  const total = row.amount + (kind === 'prior_year_surcharge' ? 0 : surcharge)
  return {
    kind,
    label: row.label,
    amountCents: cents(total),
    amountDollars: dollars(total),
    currency: 'usd',
    priorYearSurchargeCents: surcharge ? cents(surcharge) : undefined,
    source: 'fees.ts',
    livePayments: false,
  }
}

export function assertApprovedPricingIntact(): {
  ok: boolean
  tcPersonal: number
  tcBusiness: number
  bankingLive: false
} {
  return {
    ok: TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399 && PRICING.banking.liveConnectivity === false,
    tcPersonal: TC_PERSONAL_FEE,
    tcBusiness: TC_BUSINESS_FEE,
    bankingLive: false,
  }
}
