/**
 * Itemized fee breakdown before taxpayer signs — keeps NOVARA software fees
 * separate from banking / processing / advance charges.
 */

import {
  OFFICE_BUSINESS_FEE,
  OFFICE_PERSONAL_FEE,
  PRIOR_YEAR_SURCHARGE,
  TC_BUSINESS_FEE,
  TC_PERSONAL_FEE,
  TP_BUSINESS_FEE,
  TP_PERSONAL_FEE,
  formatMoney,
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
}): FeeBreakdown {
  const lines: FeeLineItem[] = []
  const season = input.seasonYear ?? 2026
  const isPrior = input.taxYear < season - 1
  const isBusiness = Boolean(input.taxReturn?.isBusiness)
  const at = input.accountType ?? 'tc'

  let software: number = TC_PERSONAL_FEE
  let label = 'NOVARA platform fee — personal return (Tax Client)'
  if (at === 'independent_tp') {
    software = isBusiness ? Number(TP_BUSINESS_FEE) : Number(TP_PERSONAL_FEE)
    label = isBusiness
      ? 'NOVARA platform fee — business return (Independent TP)'
      : 'NOVARA platform fee — personal return (Independent TP)'
  } else if (at === 'office_owner' || at === 'office_preparer') {
    software = isBusiness ? Number(OFFICE_BUSINESS_FEE) : Number(OFFICE_PERSONAL_FEE)
    label = isBusiness
      ? 'NOVARA platform fee — business return (Office)'
      : 'NOVARA platform fee — personal return (Office)'
  } else if (isBusiness) {
    software = Number(TC_BUSINESS_FEE)
    label = 'NOVARA platform fee — business return (Tax Client)'
  }

  lines.push({
    id: 'novara-software',
    category: 'novara_platform',
    label,
    amount: software,
    status: 'due',
    note: 'Approved NOVARA software pricing — unchanged.',
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

  // Snapshot lines already on the return (dedupe by label)
  const seen = new Set(lines.map((l) => l.label))
  for (const snap of input.taxReturn?.feeSnapshot ?? []) {
    if (seen.has(snap.label)) continue
    lines.push({
      id: `snap-${snap.label}`,
      category: 'novara_platform',
      label: snap.label,
      amount: snap.amount,
      status: snap.status === 'paid' ? 'waived' : 'due',
    })
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
