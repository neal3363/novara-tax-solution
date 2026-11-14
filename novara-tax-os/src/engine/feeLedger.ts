/**
 * Itemized fee breakdown before taxpayer signs — keeps NOVARA software fees
 * separate from banking / processing / advance charges.
 */

import {
  PRIOR_YEAR_SURCHARGE,
  formatMoney,
  novaraSoftwareFeeForReturn,
  returnKindFromFlags,
  type OfficePlanId,
} from '../data/fees'
import type { AccountType, TaxReturn } from '../data/types'
import type { BankProductOffer } from './bankProducts'

export type FeeCategory =
  | 'novara_platform'
  | 'preparer_fee'
  | 'office_fee'
  | 'banking_processing'
  | 'refund_advance'
  | 'state_or_other'
  | 'prior_year'

export interface FeeLineItem {
  id: string
  category: FeeCategory
  label: string
  amount: number
  status: 'due' | 'estimated' | 'waived' | 'not_applicable' | 'provider_pending'
  note?: string
}

export interface FeeBreakdown {
  lines: FeeLineItem[]
  novaraTotal: number
  bankingTotal: number
  grandTotal: number
  disclaimer: string
}

export function buildPreSignFeeBreakdown(input: {
  accountType: AccountType | undefined
  taxReturn: TaxReturn | null | undefined
  taxYear: number
  seasonYear?: number
  bankProduct?: BankProductOffer | null
  officePlanId?: OfficePlanId | string
}): FeeBreakdown {
  const lines: FeeLineItem[] = []
  const season = input.seasonYear ?? 2026
  const isPrior = input.taxYear < season - 1
  const isBusiness = Boolean(input.taxReturn?.isBusiness)
  const at = input.accountType ?? 'tc'
  const kind = returnKindFromFlags({ isBusiness })

  const tier =
    at === 'independent_tp' ? 'TP' : at === 'office_owner' || at === 'office_preparer' ? 'Office' : 'TC'
  const priced = novaraSoftwareFeeForReturn({
    tier,
    kind,
    officePlanId: input.officePlanId,
    officeEmployedPreparer: at === 'office_preparer',
  })
  const software = priced.amount
  const label =
    priced.amount === 0 && tier === 'Office'
      ? `NOVARA platform fee — ${priced.fee.label}`
      : `NOVARA platform fee — ${priced.fee.label}`

  lines.push({
    id: 'novara-software',
    category: 'novara_platform',
    label,
    amount: software,
    status: priced.eligible ? (software === 0 ? 'waived' : 'due') : 'not_applicable',
    note: priced.reason ?? priced.fee.note ?? 'Approved NOVARA software pricing from fees.ts.',
  })

  if (isPrior) {
    lines.push({
      id: 'prior-year',
      category: 'prior_year',
      label: `Prior-year surcharge (TY${input.taxYear})`,
      amount: PRIOR_YEAR_SURCHARGE,
      status: 'due',
      note: 'Once per prior tax year per approved policy.',
    })
  }

  // Snapshot lines already on the return — dedupe by label AND skip same-amount
  // software fee already represented by the novara-software line (seed labels differ).
  const seen = new Set(lines.map((l) => l.label))
  for (const snap of input.taxReturn?.feeSnapshot ?? []) {
    if (seen.has(snap.label)) continue
    if (snap.amount === software) continue
    lines.push({
      id: `snap-${snap.label}`,
      category: 'novara_platform',
      label: snap.label,
      amount: snap.amount,
      status: snap.status === 'paid' ? 'waived' : 'due',
    })
    seen.add(snap.label)
  }

  if (input.bankProduct) {
    lines.push({
      id: `bank-${input.bankProduct.code}`,
      category: input.bankProduct.kind === 'refund_advance' ? 'refund_advance' : 'banking_processing',
      label: input.bankProduct.name,
      amount: input.bankProduct.estimatedFee ?? 0,
      status: input.bankProduct.estimatedFee == null ? 'provider_pending' : 'estimated',
      note: input.bankProduct.feeScheduleNote,
    })
  } else {
    lines.push({
      id: 'banking-placeholder',
      category: 'banking_processing',
      label: 'Banking / refund-transfer fees',
      amount: 0,
      status: 'not_applicable',
      note: 'Separate from NOVARA fees — only charged when a live provider is connected and authorized.',
    })
  }

  const novaraTotal = lines
    .filter((l) => l.category === 'novara_platform' || l.category === 'prior_year' || l.category === 'preparer_fee' || l.category === 'office_fee')
    .reduce((s, l) => s + (l.status === 'waived' ? 0 : l.amount), 0)
  const bankingTotal = lines
    .filter((l) => l.category === 'banking_processing' || l.category === 'refund_advance')
    .reduce((s, l) => s + (l.status === 'provider_pending' || l.status === 'not_applicable' ? 0 : l.amount), 0)

  return {
    lines,
    novaraTotal,
    bankingTotal,
    grandTotal: novaraTotal + bankingTotal,
    disclaimer: `NOVARA software fees (${formatMoney(novaraTotal)}) are separate from banking/processing fees. Banking products stay offline until a provider is verified. Approved pricing was not modified.`,
  }
}
