/** Fee catalog from Addendum F — approved vs provisional */

export type FeeStatus = 'approved' | 'provisional' | 'partner_pending'

export interface FeeItem {
  id: string
  label: string
  amount: number
  note?: string
  status: FeeStatus
  audience: 'tp' | 'office' | 'consumer' | 'bank'
}

/** Approved Addendum F amounts */
export const OFFICE_SUBSCRIPTION_FLOOR = 899
export const TP_PERSONAL_FEE = 89.99
export const TP_BUSINESS_BASE = 89.99
export const TP_BUSINESS_SURCHARGE = 149.99
export const TP_BUSINESS_TOTAL = 239.98

export const TP_FEES: FeeItem[] = [
  {
    id: 'tp-personal',
    label: 'Individual tax return',
    amount: TP_PERSONAL_FEE,
    status: 'approved',
    audience: 'tp',
    note: 'NOVARA platform fee when a preparer files under a sponsoring office EFIN.',
  },
  {
    id: 'tp-business',
    label: 'Business tax return',
    amount: TP_BUSINESS_TOTAL,
    status: 'approved',
    audience: 'tp',
    note: '$89.99 base + $149.99 business surcharge. Never collect the base twice.',
  },
]

export const OFFICE_TIERS = [
  {
    id: 'starter',
    name: 'Starter Office',
    annual: OFFICE_SUBSCRIPTION_FLOOR,
    businessReturns: false,
    status: 'approved' as const,
    blurb: 'Lowest published annual tax-office subscription. Personal-return features per tier scope. Does not include unlimited free returns.',
  },
  {
    id: 'personal-pro',
    name: 'Personal Pro',
    annual: 1299,
    businessReturns: false,
    status: 'provisional' as const,
    blurb: 'Proposed only — not an approved final price.',
  },
  {
    id: 'complete-pro',
    name: 'Business-enabled / Complete Pro',
    annual: null as number | null,
    businessReturns: true,
    status: 'provisional' as const,
    blurb: 'Competitor comparable price less $150. Final amount not yet verified or approved.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise / Service Bureau',
    annual: null as number | null,
    businessReturns: true,
    status: 'provisional' as const,
    blurb: 'Custom commercial agreement — not a published fixed price.',
  },
]

export const STARTER_INCLUDES = [
  'Tax office dashboard',
  'Office and staff management',
  'Client management',
  'Tax preparation workflows',
  'AI-assisted tax benefit discovery',
  'Return tracking and electronic signature workflows',
  'E-file management, where enabled',
]

export const CONSUMER_PRICES: FeeItem[] = [
  { id: 'c-basic', label: 'Basic W-2 / Form 1040', amount: 149, status: 'provisional', audience: 'consumer' },
  { id: 'c-dep', label: 'W-2 with dependents/credits', amount: 249, status: 'provisional', audience: 'consumer' },
  { id: 'c-1099', label: '1099 / self-employed', amount: 349, status: 'provisional', audience: 'consumer' },
  { id: 'c-sched-c', label: 'Schedule C business', amount: 449, status: 'provisional', audience: 'consumer' },
  { id: 'c-sched-e', label: 'Rental property / Schedule E', amount: 399, status: 'provisional', audience: 'consumer' },
  { id: 'c-amended', label: 'Amended return', amount: 199, status: 'provisional', audience: 'consumer' },
  { id: 'c-1065', label: '1065 partnership', amount: 699, status: 'provisional', audience: 'consumer' },
  { id: 'c-1120s', label: '1120-S S corporation', amount: 799, status: 'provisional', audience: 'consumer' },
  { id: 'c-1120', label: '1120 C corporation', amount: 899, status: 'provisional', audience: 'consumer' },
]

export function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function estimateNovaraAnnualCharges(input: {
  subscriptionAnnual: number
  individualReturns: number
  businessReturns: number
}) {
  const individualFees = input.individualReturns * TP_PERSONAL_FEE
  const businessFees = input.businessReturns * TP_BUSINESS_TOTAL
  const perReturnTotal = individualFees + businessFees
  const total = input.subscriptionAnnual + perReturnTotal
  return { individualFees, businessFees, perReturnTotal, total }
}
