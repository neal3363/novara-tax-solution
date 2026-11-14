/**
 * Schedule B — Interest and Ordinary Dividends (isolated).
 * Aggregates taxable interest and ordinary dividends; foreign-account flags as data only.
 * NOT production-ready.
 */

export interface ScheduleBInput {
  taxableInterest: number
  taxExemptInterest?: number
  ordinaryDividends: number
  qualifiedDividends?: number
  /** Part III — foreign accounts / trusts (informational) */
  foreignAccounts?: boolean
  foreignTrusts?: boolean
}

export interface ScheduleBResult {
  form: 'Schedule B'
  readiness: 'isolated-validated'
  productionReady: false
  taxableInterest: number
  taxExemptInterest: number
  ordinaryDividends: number
  qualifiedDividends: number
  /** Amount included in AGI (taxable interest + ordinary dividends) */
  agiInclusion: number
  requiresScheduleB: boolean
  foreignAccounts: boolean
  foreignTrusts: boolean
  notes: string[]
  sources: string[]
}

export function computeScheduleB(input: ScheduleBInput): ScheduleBResult {
  const taxableInterest = Math.max(0, Math.round(input.taxableInterest))
  const taxExemptInterest = Math.max(0, Math.round(input.taxExemptInterest ?? 0))
  const ordinaryDividends = Math.max(0, Math.round(input.ordinaryDividends))
  const qualifiedDividends = Math.min(
    ordinaryDividends,
    Math.max(0, Math.round(input.qualifiedDividends ?? 0)),
  )
  const agiInclusion = taxableInterest + ordinaryDividends
  const requiresScheduleB =
    taxableInterest > 1500 ||
    ordinaryDividends > 1500 ||
    !!input.foreignAccounts ||
    !!input.foreignTrusts

  return {
    form: 'Schedule B',
    readiness: 'isolated-validated',
    productionReady: false,
    taxableInterest,
    taxExemptInterest,
    ordinaryDividends,
    qualifiedDividends,
    agiInclusion,
    requiresScheduleB,
    foreignAccounts: !!input.foreignAccounts,
    foreignTrusts: !!input.foreignTrusts,
    notes: [
      'Isolated Schedule B — not production-ready.',
      'Qualified dividends tracked for Schedule D / QD-LTCG worksheet; do not double-count in AGI.',
    ],
    sources: ['Schedule B (Form 1040) Instructions'],
  }
}
