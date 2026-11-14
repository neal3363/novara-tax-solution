/**
 * Simplified depreciation helpers for staging business returns.
 * Not a full Form 4562 / MACRS engine.
 */

export interface DepreciationInput {
  costBasis: number
  /** MACRS recovery years — staging supports 5 or 7 */
  recoveryYears?: 5 | 7
  /** Year in service (1-based) */
  yearInService?: number
  section179Election?: number
  /** Bonus depreciation rate 0–1 (staging default 0 for predictability) */
  bonusRate?: number
}

export interface DepreciationResult {
  section179: number
  bonus: number
  macrs: number
  total: number
  notes: string[]
  productionReady: false
}

/** Half-year convention MACRS percentages (simplified IRS Pub 946 themes) */
const MACRS_5 = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576]
const MACRS_7 = [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446]

export function computeDepreciation(input: DepreciationInput): DepreciationResult {
  const basis = Math.max(0, input.costBasis)
  const sec179 = Math.min(basis, Math.max(0, input.section179Election ?? 0))
  const after179 = basis - sec179
  const bonusRate = Math.min(1, Math.max(0, input.bonusRate ?? 0))
  const bonus = Math.round(after179 * bonusRate)
  const remaining = after179 - bonus
  const years = input.recoveryYears ?? 5
  const table = years === 7 ? MACRS_7 : MACRS_5
  const y = Math.min(table.length, Math.max(1, input.yearInService ?? 1)) - 1
  const macrs = Math.round(remaining * table[y])
  return {
    section179: Math.round(sec179),
    bonus,
    macrs,
    total: Math.round(sec179 + bonus + macrs),
    notes: [
      'Isolated depreciation helper — not full Form 4562.',
      'Half-year MACRS percentages from IRS Pub 946 themes (staging).',
      'Do not activate business e-file without schema support.',
    ],
    productionReady: false,
  }
}
