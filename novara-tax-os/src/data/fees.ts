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

export const TP_FEES: FeeItem[] = [
  {
    id: 'tp-personal',
    label: 'Personal return (1040)',
    amount: 89.99,
    status: 'approved',
    audience: 'tp',
    note: 'NOVARA charge per return',
  },
  {
    id: 'tp-business',
    label: 'Business return (1065 / 1120-S / 1120)',
    amount: 239.98,
    status: 'approved',
    audience: 'tp',
    note: '$89.99 base + $149.99 business AI surcharge. Never collect base twice.',
  },
]

export const OFFICE_TIERS = [
  {
    id: 'starter',
    name: 'Starter Office',
    annual: 899,
    businessReturns: false,
    status: 'approved' as const,
    blurb: 'Personal-return features per published tier scope. Floor pricing.',
  },
  {
    id: 'personal-pro',
    name: 'Personal Pro',
    annual: 1299,
    businessReturns: false,
    status: 'provisional' as const,
    blurb: 'Personal-only professional platform. Proposed, not final.',
  },
  {
    id: 'complete-pro',
    name: 'Business-enabled / Complete Pro',
    annual: null as number | null,
    businessReturns: true,
    status: 'provisional' as const,
    blurb: 'Competitor comparable price less $150. Final amount TBD.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise / Service Bureau',
    annual: null as number | null,
    businessReturns: true,
    status: 'provisional' as const,
    blurb: 'Custom commercial agreement.',
  },
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
