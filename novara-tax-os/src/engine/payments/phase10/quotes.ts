/**
 * Fee quotes — always import from fees.ts (never redefine approved prices).
 */

import {
  TC_PERSONAL_FEE,
  TC_BUSINESS_FEE,
  TP_PERSONAL_FEE,
  TP_SELF_EMPLOYED_FEE,
  TP_BUSINESS_FEE,
  OFFICE_SUBSCRIPTION_PERSONAL,
  OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
  OFFICE_SUBSCRIPTION_BUSINESS,
  PRIOR_YEAR_SURCHARGE,
  PRICING,
} from '../../../data/fees'

export type ChargeKind =
  | 'tc_personal'
  | 'tc_business'
  /** @deprecated TP has no subscription — amount is always 0 */
  | 'tp_subscription'
  | 'tp_personal'
  | 'tp_self_employed'
  | 'tp_business'
  | 'office_subscription_personal'
  | 'office_subscription_self_employed'
  | 'office_subscription_business'
  /** @deprecated Mapped to office_subscription_personal */
  | 'office_subscription_standard'
  /** @deprecated Mapped to office_subscription_business */
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
  cadence?: 'per_return' | 'per_year' | 'included' | 'none'
}

function dollars(n: number): FeeQuote['amountDollars'] {
  return n
}

function cents(n: number): number {
  return Math.round(n * 100)
}

export function quoteCharge(kind: ChargeKind, opts?: { includePriorYearSurcharge?: boolean }): FeeQuote {
  const surcharge = opts?.includePriorYearSurcharge ? PRIOR_YEAR_SURCHARGE : 0
  const table: Record<ChargeKind, { label: string; amount: number; cadence?: FeeQuote['cadence'] }> = {
    tc_personal: { label: 'Tax Client personal preparation', amount: TC_PERSONAL_FEE, cadence: 'per_return' },
    tc_business: { label: 'Tax Client business preparation', amount: TC_BUSINESS_FEE, cadence: 'per_return' },
    tp_subscription: {
      label: 'Independent Tax Preparer — no annual subscription',
      amount: 0,
      cadence: 'none',
    },
    tp_personal: { label: 'TP personal return — per return', amount: TP_PERSONAL_FEE, cadence: 'per_return' },
    tp_self_employed: {
      label: 'TP self-employed / Schedule C — per return',
      amount: TP_SELF_EMPLOYED_FEE,
      cadence: 'per_return',
    },
    tp_business: {
      label: 'TP business entity return — per return',
      amount: TP_BUSINESS_FEE,
      cadence: 'per_return',
    },
    office_subscription_personal: {
      label: 'Tax Office annual subscription — Personal',
      amount: OFFICE_SUBSCRIPTION_PERSONAL,
      cadence: 'per_year',
    },
    office_subscription_self_employed: {
      label: 'Tax Office annual subscription — Self-Employed',
      amount: OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
      cadence: 'per_year',
    },
    office_subscription_business: {
      label: 'Tax Office annual subscription — Business',
      amount: OFFICE_SUBSCRIPTION_BUSINESS,
      cadence: 'per_year',
    },
    office_subscription_standard: {
      label: 'Tax Office annual subscription — Personal (legacy id)',
      amount: OFFICE_SUBSCRIPTION_PERSONAL,
      cadence: 'per_year',
    },
    office_subscription_plus: {
      label: 'Tax Office annual subscription — Business (legacy id)',
      amount: OFFICE_SUBSCRIPTION_BUSINESS,
      cadence: 'per_year',
    },
    office_personal: {
      label: 'Office covered personal return (included in subscription)',
      amount: 0,
      cadence: 'included',
    },
    office_business: {
      label: 'Office covered business return (included in subscription)',
      amount: 0,
      cadence: 'included',
    },
    prior_year_surcharge: { label: 'Prior-year surcharge', amount: PRIOR_YEAR_SURCHARGE, cadence: 'per_return' },
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
    cadence: row.cadence,
  }
}

export function assertApprovedPricingIntact(): {
  ok: boolean
  tcPersonal: number
  tcBusiness: number
  bankingLive: false
  tpPersonal: number
  tpSelfEmployed: number
  tpBusiness: number
  officePlans: number[]
} {
  return {
    ok:
      TC_PERSONAL_FEE === 300 &&
      TC_BUSINESS_FEE === 399 &&
      TP_PERSONAL_FEE === 89 &&
      TP_SELF_EMPLOYED_FEE === 119 &&
      TP_BUSINESS_FEE === 249 &&
      OFFICE_SUBSCRIPTION_PERSONAL === 899 &&
      OFFICE_SUBSCRIPTION_SELF_EMPLOYED === 1199 &&
      OFFICE_SUBSCRIPTION_BUSINESS === 1499 &&
      PRICING.banking.liveConnectivity === false,
    tcPersonal: TC_PERSONAL_FEE,
    tcBusiness: TC_BUSINESS_FEE,
    bankingLive: false,
    tpPersonal: TP_PERSONAL_FEE,
    tpSelfEmployed: TP_SELF_EMPLOYED_FEE,
    tpBusiness: TP_BUSINESS_FEE,
    officePlans: [OFFICE_SUBSCRIPTION_PERSONAL, OFFICE_SUBSCRIPTION_SELF_EMPLOYED, OFFICE_SUBSCRIPTION_BUSINESS],
  }
}
