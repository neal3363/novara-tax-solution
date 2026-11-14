/**
 * Form 6251 — Alternative Minimum Tax (isolated).
 * Includes common adjustments/preferences: std deduction, SALT, private-activity bond
 * interest (preference), ISO bargain element, investment interest limitation difference.
 * NOT production-ready. Complex preferences may remain unsupported.
 */

import { getPhase4Params } from '../phase4Params'
import type { IrsFilingStatus } from '../types'

export interface Form6251Input {
  taxYear: number
  filingStatus: IrsFilingStatus
  taxableIncome: number
  regularTax: number
  standardDeductionTaken: number
  usedItemized: boolean
  saltDeducted?: number
  /** Tax-exempt interest from private activity bonds (Form 6251 preference) */
  privateActivityBondInterest?: number
  /** Incentive stock option bargain element exercised (preference) */
  isoBargainElement?: number
  /** Depreciation adjustment (positive = add to AMTI) — simplified */
  depreciationAdjustment?: number
  /** Passive activity AMT adjustment */
  passiveActivityAdjustment?: number
  /** Investment interest expense difference (AMT vs regular) */
  investmentInterestAdjustment?: number
  /** Medical deduction AGI floor difference themes */
  medicalDeductionAdjustment?: number
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
  adjustmentsTotal: number
  unsupportedCases: string[]
  notes: string[]
  sources: string[]
}

export function computeForm6251(input: Form6251Input): Form6251Result {
  const params = getPhase4Params(input.taxYear)
  const notes: string[] = [
    'Isolated Form 6251 — not production-ready.',
  ]
  const unsupportedCases: string[] = []
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
      adjustmentsTotal: 0,
      unsupportedCases: ['Tax year not supported'],
      notes: [...notes, 'Tax year not supported'],
      sources: [],
    }
  }

  let adjustments = 0
  if (!input.usedItemized) {
    adjustments += input.standardDeductionTaken
    notes.push('Added back standard deduction.')
  } else {
    adjustments += Math.max(0, input.saltDeducted ?? 0)
    if ((input.saltDeducted ?? 0) > 0) notes.push('Added back SALT for AMTI.')
  }

  const prefs = [
    { v: input.privateActivityBondInterest, label: 'private activity bond interest' },
    { v: input.isoBargainElement, label: 'ISO bargain element' },
    { v: input.depreciationAdjustment, label: 'depreciation adjustment' },
    { v: input.passiveActivityAdjustment, label: 'passive activity AMT adjustment' },
    { v: input.investmentInterestAdjustment, label: 'investment interest adjustment' },
    { v: input.medicalDeductionAdjustment, label: 'medical deduction adjustment' },
  ]
  for (const p of prefs) {
    if (p.v) {
      adjustments += Math.round(p.v)
      notes.push(`AMT preference/adjustment: ${p.label}.`)
    }
  }

  // Flag complex unsupported preferences when large unexplained gaps likely
  unsupportedCases.push(
    'ACE adjustment (pre-2018 corporate) N/A for individuals',
  )
  notes.push(
    'Not modeled: foreign tax credit AMT limitation worksheet detail; certain depletion/intangible drilling preferences.',
  )

  const amti = Math.round(input.taxableIncome + adjustments)
  let exemption = params.amtExemption[input.filingStatus]
  const phaseBegin = params.amtPhaseoutBegin[input.filingStatus]
  if (amti > phaseBegin) {
    exemption = Math.max(0, Math.round(exemption - (amti - phaseBegin) * 0.25))
  }

  const amtTaxable = Math.max(0, amti - exemption)
  const t28 = params.amt28Threshold
  let tmt =
    amtTaxable <= t28
      ? amtTaxable * 0.26
      : t28 * 0.26 + (amtTaxable - t28) * 0.28
  tmt = Math.round(tmt)
  const amt = Math.max(0, tmt - input.regularTax)

  return {
    form: 'Form 6251',
    readiness: 'isolated-validated',
    productionReady: false,
    amti,
    exemption,
    amtTaxable: Math.round(amtTaxable),
    tentativeMinimumTax: tmt,
    amt,
    adjustmentsTotal: Math.round(adjustments),
    unsupportedCases,
    notes,
    sources: params.sources.filter((s) => s.includes('6251') || s.includes('AMT')),
  }
}
