/**
 * Form 5695 — Residential Energy Credits (isolated staging partial).
 * Maps qualified improvement spend to a capped nonrefundable credit estimate
 * using published credit-rate themes — NOT a full 5695 worksheet.
 */

export interface Form5695Input {
  taxYear: number
  qualifiedImprovementSpend: number
  /** Energy Efficient Home Improvement Credit rate theme (IRA) — staging default 30% */
  creditRate?: number
  annualCap?: number
}

export interface Form5695Result {
  form: 'Form 5695'
  creditBeforeTaxLimit: number
  productionReady: false
  fullyMapped: false
  notes: string[]
  sources: string[]
  unsupportedCases: string[]
}

export function computeForm5695(input: Form5695Input): Form5695Result {
  const rate = input.creditRate ?? 0.3
  const cap = input.annualCap ?? 1200 // staging annual product/category cap theme
  const spend = Math.max(0, input.qualifiedImprovementSpend)
  const raw = Math.round(spend * rate)
  const credit = Math.min(cap, raw)
  const unsupported: string[] = []
  if (spend > 0) {
    unsupported.push('form_5695_partial_mapping_needs_product_category_breakdown')
  }
  return {
    form: 'Form 5695',
    creditBeforeTaxLimit: credit,
    productionReady: false,
    fullyMapped: false,
    notes: [
      'Partial Form 5695 staging model — product categories / lifetime caps / EV charger nuances incomplete.',
      'Credit must not be treated as verified filing output until full worksheet + docs.',
    ],
    sources: ['IRS Form 5695 Instructions (IRA energy credit themes)', `TY${input.taxYear}`],
    unsupportedCases: unsupported,
  }
}
