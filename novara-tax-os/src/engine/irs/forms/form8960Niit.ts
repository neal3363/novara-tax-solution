/**
 * Form 8960 — Net Investment Income Tax (isolated).
 * 3.8% of the lesser of NII or MAGI excess over threshold.
 * NOT production-ready.
 */

import { NIIT_THRESHOLDS } from '../phase4Params'
import type { IrsFilingStatus } from '../types'

export interface Form8960Input {
  filingStatus: IrsFilingStatus
  magi: number
  /** Net investment income (interest, dividends, capital gains, rental, royalties — simplified) */
  netInvestmentIncome: number
}

export interface Form8960Result {
  form: 'Form 8960'
  readiness: 'isolated-validated'
  productionReady: false
  threshold: number
  magiExcess: number
  nii: number
  niit: number
  notes: string[]
  sources: string[]
}

export function computeForm8960(input: Form8960Input): Form8960Result {
  const threshold = NIIT_THRESHOLDS[input.filingStatus]
  const magiExcess = Math.max(0, input.magi - threshold)
  const nii = Math.max(0, Math.round(input.netInvestmentIncome))
  const base = Math.min(nii, magiExcess)
  const niit = Math.round(base * 0.038)

  return {
    form: 'Form 8960',
    readiness: 'isolated-validated',
    productionReady: false,
    threshold,
    magiExcess: Math.round(magiExcess),
    nii,
    niit,
    notes: [
      'Isolated Form 8960 — not production-ready.',
      'NII composition asserted by caller; passive trade/business nuances simplified.',
    ],
    sources: ['Form 8960 Instructions', 'IRC §1411'],
  }
}
