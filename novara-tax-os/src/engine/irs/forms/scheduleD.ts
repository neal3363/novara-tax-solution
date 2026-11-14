/**
 * Schedule D — Capital Gains and Losses + Qualified Dividends / LTCG worksheet (isolated).
 * Supports net ST/LT, $3,000 ordinary loss limit, and preferential rate worksheet themes.
 * NOT production-ready. Does not model Form 8949 detail lines, 28% rate gains, or unrecaptured 1250.
 */

import type { IrsFilingStatus, TaxBracket, YearTaxTables } from '../types'
import { taxFromBrackets } from '../taxMath'

export interface ScheduleDInput {
  filingStatus: IrsFilingStatus
  shortTermGainLoss: number
  longTermGainLoss: number
  /** Capital loss carryover (positive number = loss available) */
  shortTermCarryover?: number
  longTermCarryover?: number
  qualifiedDividends?: number
  /** Taxable income before preferential worksheet (ordinary TI including net capital gain) */
  taxableIncome: number
  tables: YearTaxTables
}

export interface ScheduleDResult {
  form: 'Schedule D'
  readiness: 'isolated-validated'
  productionReady: false
  netShortTerm: number
  netLongTerm: number
  netCapitalGainLoss: number
  /** Loss allowed against ordinary income (max 3000 / 1500 MFS) */
  ordinaryLossAllowed: number
  /** Net capital gain eligible for preferential rates (if positive LT) */
  netCapitalGain: number
  /** Tax on taxable income using QD/LTCG worksheet (replaces ordinary-only tax when NCG > 0) */
  taxWithPreferentialRates: number
  notes: string[]
  sources: string[]
}

/** 0% / 15% / 20% LTCG breakpoints (taxable income) — approximate RP amounts by year via tables. */
function ltcgBreakpoints(
  taxYear: number,
  status: IrsFilingStatus,
): { zero: number; fifteen: number } {
  // Anchored to Rev. Proc. preferential rate thresholds (rounded)
  const map: Record<number, Record<'single' | 'mfj' | 'mfs' | 'hoh', { zero: number; fifteen: number }>> = {
    2022: {
      single: { zero: 41675, fifteen: 459750 },
      mfj: { zero: 83350, fifteen: 517200 },
      mfs: { zero: 41675, fifteen: 258600 },
      hoh: { zero: 55800, fifteen: 488500 },
    },
    2023: {
      single: { zero: 44625, fifteen: 492300 },
      mfj: { zero: 89250, fifteen: 553850 },
      mfs: { zero: 44625, fifteen: 276900 },
      hoh: { zero: 59750, fifteen: 523050 },
    },
    2024: {
      single: { zero: 47025, fifteen: 518900 },
      mfj: { zero: 94050, fifteen: 583750 },
      mfs: { zero: 47025, fifteen: 291850 },
      hoh: { zero: 63000, fifteen: 551350 },
    },
    2025: {
      single: { zero: 48350, fifteen: 533400 },
      mfj: { zero: 96700, fifteen: 600050 },
      mfs: { zero: 48350, fifteen: 300000 },
      hoh: { zero: 64750, fifteen: 566700 },
    },
  }
  const year = map[taxYear] ?? map[2025]
  const key = status === 'qss' ? 'mfj' : status
  return year[key]
}

function preferentialTax(
  taxableIncome: number,
  netCapitalGain: number,
  qualifiedDividends: number,
  status: IrsFilingStatus,
  taxYear: number,
  ordinaryBrackets: TaxBracket[],
): number {
  const ncg = Math.max(0, Math.min(taxableIncome, netCapitalGain + qualifiedDividends))
  const ordinaryTI = Math.max(0, taxableIncome - ncg)
  const ordinaryTax = taxFromBrackets(ordinaryTI, ordinaryBrackets)
  const bp = ltcgBreakpoints(taxYear, status)

  // Stack NCG on top of ordinary TI for rate buckets
  let taxed = 0
  let tax = 0
  const start = ordinaryTI
  const end = taxableIncome
  // 0% slice
  const zeroEnd = Math.min(end, Math.max(start, bp.zero))
  if (zeroEnd > start) {
    taxed += zeroEnd - start
  }
  // 15% slice
  const fifteenStart = Math.max(start, bp.zero)
  const fifteenEnd = Math.min(end, Math.max(fifteenStart, bp.fifteen))
  if (fifteenEnd > fifteenStart) {
    tax += (fifteenEnd - fifteenStart) * 0.15
    taxed += fifteenEnd - fifteenStart
  }
  // 20% remainder of NCG
  const twentyStart = Math.max(start, bp.fifteen)
  if (end > twentyStart) {
    tax += (end - twentyStart) * 0.2
  }
  void taxed
  return Math.round(ordinaryTax + tax)
}

export function computeScheduleD(input: ScheduleDInput): ScheduleDResult {
  const notes: string[] = [
    'Isolated Schedule D — not production-ready.',
    'Form 8949 detail, 28% rate gain, and unrecaptured §1250 not modeled.',
  ]
  const st =
    Math.round(input.shortTermGainLoss) - Math.max(0, Math.round(input.shortTermCarryover ?? 0))
  const lt =
    Math.round(input.longTermGainLoss) - Math.max(0, Math.round(input.longTermCarryover ?? 0))
  const net = st + lt
  const lossLimit = input.filingStatus === 'mfs' ? 1500 : 3000
  let ordinaryLossAllowed = 0
  let netCapitalGain = 0
  if (net < 0) {
    ordinaryLossAllowed = Math.min(lossLimit, -net)
  } else if (lt > 0 && net > 0) {
    // Net capital gain ≈ lesser of net LT and overall net (simplified)
    netCapitalGain = Math.min(lt, net)
  }

  const qd = Math.max(0, Math.round(input.qualifiedDividends ?? 0))
  const taxWithPreferentialRates =
    netCapitalGain + qd > 0
      ? preferentialTax(
          input.taxableIncome,
          netCapitalGain,
          qd,
          input.filingStatus,
          input.tables.taxYear,
          input.tables.brackets[input.filingStatus],
        )
      : taxFromBrackets(input.taxableIncome, input.tables.brackets[input.filingStatus])

  return {
    form: 'Schedule D',
    readiness: 'isolated-validated',
    productionReady: false,
    netShortTerm: st,
    netLongTerm: lt,
    netCapitalGainLoss: net,
    ordinaryLossAllowed,
    netCapitalGain,
    taxWithPreferentialRates,
    notes,
    sources: [
      'Schedule D (Form 1040) Instructions',
      'Qualified Dividends and Capital Gain Tax Worksheet (Form 1040 Instructions)',
    ],
  }
}
