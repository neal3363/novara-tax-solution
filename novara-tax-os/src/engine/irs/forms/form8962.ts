/**
 * Form 8962 — Premium Tax Credit (isolated).
 * Supports annual and monthly SLCSP / enrollment premium paths + APTC repayment limitation.
 * NOT production-ready / not wired to taxpayer UI.
 */

import {
  applicableFigure,
  aptcRepaymentLimit,
  getPhase4Params,
} from '../phase4Params'
import type { IrsFilingStatus } from '../types'

export interface Form8962Month {
  enrollmentPremium: number
  slcsp: number
  /** Months covered (default 1 if row present) */
  months?: number
}

export interface Form8962Input {
  taxYear: number
  filingStatus: IrsFilingStatus
  /** Modified AGI used for household income (simplified: use MAGI/AGI provided) */
  householdIncome: number
  householdSize: number
  /** Annual enrollment premiums (if no monthly breakdown) */
  annualEnrollmentPremium?: number
  /** Annual SLCSP benchmark */
  annualSlcsp?: number
  /** Monthly Part II rows from Form 1095-A themes */
  months?: Form8962Month[]
  aptcReceived: number
}

export interface Form8962Result {
  form: 'Form 8962'
  readiness: 'isolated-validated'
  productionReady: false
  fpl: number
  pctOfFpl: number
  applicableFigure: number
  annualContribution: number
  annualSlcsp: number
  annualEnrollmentPremium: number
  /** Max PTC before APTC = max(0, SLCSP − contribution) limited by enrollment premium */
  maxPtc: number
  aptcReceived: number
  /** Net PTC (positive) or excess APTC to repay (negative before limitation) */
  netPtcBeforeLimit: number
  excessAptcRepayment: number
  /** Amount included as additional tax (excess APTC after Table 5 limit) */
  additionalTax: number
  /** Refundable PTC (when APTC < allowed) */
  refundablePtc: number
  notes: string[]
  sources: string[]
}

export function computeForm8962(input: Form8962Input): Form8962Result {
  const params = getPhase4Params(input.taxYear)
  const notes: string[] = [
    'Isolated Form 8962 — not production-ready; not connected to Refund Maximizer.',
  ]
  if (!params) {
    return empty8962(input, ['Tax year not supported'], [])
  }

  const size = Math.min(8, Math.max(1, Math.round(input.householdSize)))
  const fpl = params.fpl[size - 1]
  const pctOfFpl = input.householdIncome / fpl
  const fig = applicableFigure(pctOfFpl)
  const annualContribution = Math.round(input.householdIncome * fig)

  let annualEnrollment = input.annualEnrollmentPremium ?? 0
  let annualSlcsp = input.annualSlcsp ?? 0

  if (input.months && input.months.length > 0) {
    annualEnrollment = 0
    annualSlcsp = 0
    for (const m of input.months) {
      const mos = m.months ?? 1
      annualEnrollment += m.enrollmentPremium * mos
      annualSlcsp += m.slcsp * mos
    }
    notes.push('Computed from monthly 1095-A-style enrollment/SLCSP rows.')
  } else {
    notes.push('Annual premium/SLCSP path (Form 8962 Part II annual election themes).')
  }

  // PTC is lesser of (SLCSP − contribution) and enrollment premiums paid (simplified annual)
  const uncapped = Math.max(0, annualSlcsp - annualContribution)
  const maxPtc = Math.round(Math.min(uncapped, annualEnrollment))
  const net = maxPtc - input.aptcReceived
  let refundablePtc = 0
  let excessRaw = 0
  let additionalTax = 0

  if (net >= 0) {
    refundablePtc = Math.round(net)
  } else {
    excessRaw = Math.round(-net)
    const limit = aptcRepaymentLimit(pctOfFpl, input.filingStatus)
    additionalTax = Math.round(Math.min(excessRaw, limit))
    if (limit !== Infinity && excessRaw > limit) {
      notes.push(`Excess APTC repayment limited by Form 8962 Table 5 themes to $${limit}.`)
    }
  }

  return {
    form: 'Form 8962',
    readiness: 'isolated-validated',
    productionReady: false,
    fpl,
    pctOfFpl: Math.round(pctOfFpl * 1000) / 1000,
    applicableFigure: fig,
    annualContribution,
    annualSlcsp: Math.round(annualSlcsp),
    annualEnrollmentPremium: Math.round(annualEnrollment),
    maxPtc,
    aptcReceived: input.aptcReceived,
    netPtcBeforeLimit: Math.round(net),
    excessAptcRepayment: excessRaw,
    additionalTax,
    refundablePtc,
    notes,
    sources: params.sources.filter((s) => s.includes('8962') || s.includes('974') || s.includes('FPL')),
  }
}

function empty8962(input: Form8962Input, notes: string[], sources: string[]): Form8962Result {
  return {
    form: 'Form 8962',
    readiness: 'isolated-validated',
    productionReady: false,
    fpl: 0,
    pctOfFpl: 0,
    applicableFigure: 0,
    annualContribution: 0,
    annualSlcsp: 0,
    annualEnrollmentPremium: 0,
    maxPtc: 0,
    aptcReceived: input.aptcReceived,
    netPtcBeforeLimit: 0,
    excessAptcRepayment: 0,
    additionalTax: 0,
    refundablePtc: 0,
    notes,
    sources,
  }
}
