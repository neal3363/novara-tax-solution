/**
 * Form 8949 — Sales and Other Dispositions of Capital Assets (isolated).
 * Aggregates transaction details into Schedule D totals by holding period and rate group.
 * NOT production-ready.
 */

export type Form8949Box = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type CapGainRateGroup = 'ordinary' | 'preferential' | 'collectibles28' | 'unrecaptured1250'

export interface Form8949Transaction {
  description?: string
  /** Date acquired ISO; optional if inherited/various */
  dateAcquired?: string
  dateSold?: string
  proceeds: number
  costBasis: number
  adjustments?: number
  /** Override holding period; otherwise derived from dates when both present */
  longTerm?: boolean
  rateGroup?: CapGainRateGroup
  /** Box on Form 8949 (basis reported to IRS, etc.) — informational */
  box?: Form8949Box
  washSaleDisallowedLoss?: number
}

export interface Form8949Input {
  transactions: Form8949Transaction[]
}

export interface Form8949Result {
  form: 'Form 8949'
  readiness: 'isolated-validated'
  productionReady: false
  shortTermTotal: number
  longTermTotal: number
  collectibles28Gain: number
  unrecaptured1250Gain: number
  transactionCount: number
  notes: string[]
  sources: string[]
  unsupportedCases: string[]
}

function isLongTerm(t: Form8949Transaction): boolean {
  if (t.longTerm !== undefined) return t.longTerm
  if (!t.dateAcquired || !t.dateSold) return false
  const a = Date.parse(t.dateAcquired)
  const s = Date.parse(t.dateSold)
  if (Number.isNaN(a) || Number.isNaN(s)) return false
  // More than one year
  return s - a > 365.25 * 24 * 3600 * 1000
}

export function computeForm8949(input: Form8949Input): Form8949Result {
  const notes: string[] = [
    'Isolated Form 8949 — not production-ready.',
    'Does not generate IRS e-file XML; aggregates for Schedule D only.',
  ]
  const unsupportedCases: string[] = []
  let shortTermTotal = 0
  let longTermTotal = 0
  let collectibles28Gain = 0
  let unrecaptured1250Gain = 0

  for (const t of input.transactions) {
    const gain =
      Math.round(t.proceeds) -
      Math.round(t.costBasis) +
      Math.round(t.adjustments ?? 0) +
      Math.round(t.washSaleDisallowedLoss ?? 0)
    const lt = isLongTerm(t)
    const group = t.rateGroup ?? (lt ? 'preferential' : 'ordinary')

    if (group === 'collectibles28') {
      if (!lt) {
        unsupportedCases.push('Collectibles marked short-term — review required')
      }
      longTermTotal += gain
      if (gain > 0) collectibles28Gain += gain
    } else if (group === 'unrecaptured1250') {
      longTermTotal += gain
      if (gain > 0) unrecaptured1250Gain += gain
    } else if (lt || group === 'preferential') {
      longTermTotal += gain
    } else {
      shortTermTotal += gain
    }
  }

  // Unrecaptured 1250 cannot exceed net long-term / overall net capital gain — capped later in Schedule D
  return {
    form: 'Form 8949',
    readiness: 'isolated-validated',
    productionReady: false,
    shortTermTotal: Math.round(shortTermTotal),
    longTermTotal: Math.round(longTermTotal),
    collectibles28Gain: Math.round(collectibles28Gain),
    unrecaptured1250Gain: Math.round(unrecaptured1250Gain),
    transactionCount: input.transactions.length,
    notes,
    sources: ['Form 8949 Instructions', 'Schedule D Instructions'],
    unsupportedCases,
  }
}
