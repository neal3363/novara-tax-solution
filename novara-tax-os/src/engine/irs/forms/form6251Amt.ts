/**
 * Form 6251 — Alternative Minimum Tax (isolated).
 * Computes tentative minimum tax and AMT due. Simplified AMT adjustments (standard deduction add-back).
 * NOT production-ready. Does not model full preference items list.
 */

import { getPhase4Params } from '../phase4Params'
import type { IrsFilingStatus } from '../types'

export interface Form6251Input {
  taxYear: number
  filingStatus: IrsFilingStatus
  /** Taxable income before QBI for AMT base themes (simplified) */
  taxableIncome: number
  /** Regular tax before credits (income tax) */
  regularTax: number
  /** Standard deduction taken (add-back for AMT) */
  standardDeductionTaken: number
  usedItemized: boolean
  /** Itemized SALT deducted (add-back) */
  saltDeducted?: number
}

export interface Form6251Result {
  form: 'Form 6251'
  readiness: 'isolated-validated'
  productionReady: false
  amti: number
  exemption: number
  amtTaxable: number
  tentativeMinimumTax: number
  amt: number
  notes: string[]
  sources: string[]
}

export function computeForm6251(input: Form6251Input): Form6251Result {
  const params = getPhase4Params(input.taxYear)
  const notes: string[] = [
    'Isolated Form 6251 — not production-ready.',
    'Full preference-item schedule not modeled; includes std-deduction / SALT add-backs.',
  ]
  if (!params) {
    return {
      form: 'Form 6251',
      readiness: 'isolated-validated',
      productionReady: false,
      amti: 0,
      exemption: 0,
      amtTaxable: 0,
      tentativeMinimumTax: 0,
      amt: 0,
      notes: [...notes, 'Tax year not supported'],
      sources: [],
    }
  }

  let amti = input.taxableIncome
  if (!input.usedItemized) {
    amti += input.standardDeductionTaken
  } else {
    amti += Math.max(0, input.saltDeducted ?? 0)
  }

  let exemption = params.amtExemption[input.filingStatus]
  const phaseBegin = params.amtPhaseoutBegin[input.filingStatus]
  if (amti > phaseBegin) {
    exemption = Math.max(0, Math.round(exemption - (amti - phaseBegin) * 0.25))
  }

  const amtTaxable = Math.max(0, amti - exemption)
  const t28 = params.amt28Threshold
  let tmt = 0
  if (amtTaxable <= t28) {
    tmt = amtTaxable * 0.26
  } else {
    tmt = t28 * 0.26 + (amtTaxable - t28) * 0.28
  }
  tmt = Math.round(tmt)
  const amt = Math.max(0, tmt - input.regularTax)

  return {
    form: 'Form 6251',
    readiness: 'isolated-validated',
    productionReady: false,
    amti: Math.round(amti),
    exemption,
    amtTaxable: Math.round(amtTaxable),
    tentativeMinimumTax: tmt,
    amt,
    notes,
    sources: params.sources.filter((s) => s.includes('6251') || s.includes('AMT')),
  }
}
