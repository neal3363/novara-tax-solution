/**
 * Form 8889 — Health Savings Account deduction (isolated staging).
 * Sources: IRS Form 8889 / Pub 969 themes for TY limits from year tables.
 */

export interface Form8889Input {
  taxYear: number
  contributions: number
  /** Annual contribution limit from year tables */
  annualLimit: number
  familyCoverage?: boolean
  employerContributions?: number
}

export interface Form8889Result {
  form: 'Form 8889'
  deductibleContribution: number
  limit: number
  excessContribution: number
  productionReady: false
  notes: string[]
  sources: string[]
}

export function computeForm8889(input: Form8889Input): Form8889Result {
  const limit = Math.max(0, input.annualLimit)
  const employer = Math.max(0, input.employerContributions ?? 0)
  const contrib = Math.max(0, input.contributions)
  const combined = contrib + employer
  const deductible = Math.max(0, Math.min(contrib, Math.max(0, limit - employer)))
  const excess = Math.max(0, combined - limit)
  return {
    form: 'Form 8889',
    deductibleContribution: Math.round(deductible),
    limit,
    excessContribution: Math.round(excess),
    productionReady: false,
    notes: [
      'Isolated Form 8889 staging — HDHP eligibility / last-month rule not fully modeled.',
      'Do not mark filing-ready without HDHP eligibility confirmation.',
    ],
    sources: ['IRS Form 8889 Instructions', 'IRS Pub 969', `TY${input.taxYear}`],
  }
}
