/**
 * Traditional IRA deduction worksheet themes (Pub 590-A) — isolated staging.
 */

export interface IraDeductionInput {
  taxYear: number
  contributions: number
  /** Filing status for phaseout — simplified */
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss'
  magi: number
  coveredByWorkplacePlan?: boolean
  annualLimit?: number
}

export interface IraDeductionResult {
  form: 'IRA Deduction Worksheet'
  deductible: number
  limit: number
  productionReady: false
  notes: string[]
  sources: string[]
  unsupportedCases: string[]
}

/** Simplified TY limits — 2024/2025 under-50 traditional IRA limit theme */
function iraLimit(taxYear: number): number {
  if (taxYear >= 2025) return 7000
  if (taxYear >= 2024) return 7000
  return 6500
}

export function computeIraDeduction(input: IraDeductionInput): IraDeductionResult {
  const limit = input.annualLimit ?? iraLimit(input.taxYear)
  const contrib = Math.max(0, Math.min(input.contributions, limit))
  const unsupported: string[] = []
  let deductible = contrib

  if (input.coveredByWorkplacePlan) {
    // Very simplified phaseout anchors (not full Pub 590-A table)
    const begin = input.filingStatus === 'mfj' || input.filingStatus === 'qss' ? 123000 : 77000
    const end = input.filingStatus === 'mfj' || input.filingStatus === 'qss' ? 143000 : 87000
    if (input.magi >= end) {
      deductible = 0
    } else if (input.magi > begin) {
      const pct = (end - input.magi) / (end - begin)
      deductible = Math.round(contrib * pct)
    }
    unsupported.push('ira_phaseout_simplified_not_full_pub590a')
  }

  return {
    form: 'IRA Deduction Worksheet',
    deductible: Math.round(deductible),
    limit,
    productionReady: false,
    notes: [
      'Isolated IRA deduction staging — spousal IRA / catch-up / Roth conversion not modeled.',
      'Partial mapping: escalate for workplace-plan phaseout edge cases.',
    ],
    sources: ['IRS Pub 590-A', `TY${input.taxYear} IRA limit themes`],
    unsupportedCases: unsupported,
  }
}
