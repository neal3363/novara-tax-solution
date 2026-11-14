/**
 * Applicable estimated tax calculations (staging / simplified).
 */

export interface EstimatedTaxInput {
  /** Expected annual tax */
  expectedTax: number
  paymentsToDate?: number
  /** Safe harbor: 100% or 110% of prior year (simplified flag) */
  priorYearTax?: number
  useSafeHarbor?: boolean
}

export interface EstimatedTaxResult {
  requiredAnnual: number
  quarterlyInstallment: number
  paymentsToDate: number
  remaining: number
  notes: string[]
  productionReady: false
}

export function computeEstimatedTax(input: EstimatedTaxInput): EstimatedTaxResult {
  const expected = Math.max(0, input.expectedTax)
  const prior = Math.max(0, input.priorYearTax ?? 0)
  const safeHarbor = input.useSafeHarbor && prior > 0 ? Math.round(prior * 1.1) : expected
  const required = Math.min(expected, safeHarbor) || expected
  const paid = Math.max(0, input.paymentsToDate ?? 0)
  const quarterly = Math.round(required / 4)
  return {
    requiredAnnual: Math.round(required),
    quarterlyInstallment: quarterly,
    paymentsToDate: paid,
    remaining: Math.max(0, Math.round(required - paid)),
    notes: [
      'Simplified estimated tax / safe-harbor stub for staging.',
      'Does not replace Forms 1040-ES / 1120-W worksheets.',
    ],
    productionReady: false,
  }
}
