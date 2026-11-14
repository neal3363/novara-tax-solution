/**
 * Schedule D — Capital Gains and Losses + Form 8949 aggregates + Sch D Tax Worksheet themes.
 * Supports ST/LT, carryforwards, QD/LTCG 0/15/20%, unrecaptured §1250 (25%), collectibles (28%).
 * NOT production-ready.
 */

import type { IrsFilingStatus, TaxBracket, YearTaxTables } from '../types'
import { taxFromBrackets } from '../taxMath'
import type { Form8949Result } from './form8949'

export interface ScheduleDInput {
  filingStatus: IrsFilingStatus
  shortTermGainLoss: number
  longTermGainLoss: number
  shortTermCarryover?: number
  longTermCarryover?: number
  qualifiedDividends?: number
  /** Unrecaptured §1250 gain (positive) — capped by net LT / NCG in worksheet */
  unrecaptured1250Gain?: number
  /** Collectibles / 28% rate gain (positive) */
  collectibles28Gain?: number
  /** Optional Form 8949 aggregate — overrides ST/LT totals when provided */
  form8949?: Form8949Result
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
  ordinaryLossAllowed: number
  netCapitalGain: number
  unrecaptured1250Applied: number
  collectibles28Applied: number
  capitalLossCarryforward: { shortTerm: number; longTerm: number }
  taxWithPreferentialRates: number
  unsupportedCases: string[]
  notes: string[]
  sources: string[]
}

function ltcgBreakpoints(
  taxYear: number,
  status: IrsFilingStatus,
): { zero: number; fifteen: number } {
  const map: Record<
    number,
    Record<'single' | 'mfj' | 'mfs' | 'hoh', { zero: number; fifteen: number }>
  > = {
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

/** Preferential stack: ordinary → §1250@25% → collectibles@28% → 0/15/20% remainder. */
function scheduleDTaxWorksheet(
  taxableIncome: number,
  netCapitalGain: number,
  qualifiedDividends: number,
  unrec1250: number,
  collectibles28: number,
  status: IrsFilingStatus,
  taxYear: number,
  ordinaryBrackets: TaxBracket[],
): number {
  const preferentialBucket = Math.max(0, Math.min(taxableIncome, netCapitalGain + qualifiedDividends))
  const ordinaryTI = Math.max(0, taxableIncome - preferentialBucket)
  let tax = taxFromBrackets(ordinaryTI, ordinaryBrackets)

  let cursor = ordinaryTI
  const end = taxableIncome
  let remainingPref = preferentialBucket

  // Unrecaptured §1250 at 25% (capped to remaining pref)
  const u = Math.min(unrec1250, remainingPref)
  if (u > 0) {
    tax += u * 0.25
    cursor += u
    remainingPref -= u
  }

  // Collectibles at 28%
  const c = Math.min(collectibles28, remainingPref)
  if (c > 0) {
    tax += c * 0.28
    cursor += c
    remainingPref -= c
  }

  // Remaining at 0/15/20%
  const bp = ltcgBreakpoints(taxYear, status)
  const remStart = cursor
  const remEnd = remStart + remainingPref
  const fifteenStart = Math.max(remStart, bp.zero)
  const fifteenEnd = Math.min(remEnd, Math.max(fifteenStart, bp.fifteen))
  if (fifteenEnd > fifteenStart) tax += (fifteenEnd - fifteenStart) * 0.15
  const twentyStart = Math.max(remStart, bp.fifteen)
  if (remEnd > twentyStart) tax += (remEnd - twentyStart) * 0.2

  void end
  return Math.round(tax)
}

export function computeScheduleD(input: ScheduleDInput): ScheduleDResult {
  const notes: string[] = [
    'Isolated Schedule D — not production-ready.',
    'Sch D Tax Worksheet themes: §1250@25%, collectibles@28%, then 0/15/20%.',
  ]
  const unsupportedCases: string[] = []
  if (input.form8949?.unsupportedCases.length) {
    unsupportedCases.push(...input.form8949.unsupportedCases)
  }

  const stBase = input.form8949 ? input.form8949.shortTermTotal : Math.round(input.shortTermGainLoss)
  const ltBase = input.form8949 ? input.form8949.longTermTotal : Math.round(input.longTermGainLoss)
  const stCo = Math.max(0, Math.round(input.shortTermCarryover ?? 0))
  const ltCo = Math.max(0, Math.round(input.longTermCarryover ?? 0))
  const st = stBase - stCo
  const lt = ltBase - ltCo
  const net = st + lt
  const lossLimit = input.filingStatus === 'mfs' ? 1500 : 3000

  let ordinaryLossAllowed = 0
  let netCapitalGain = 0
  let cfSt = 0
  let cfLt = 0

  if (net < 0) {
    ordinaryLossAllowed = Math.min(lossLimit, -net)
    const unused = -net - ordinaryLossAllowed
    // Carryforward: apply against ST first then LT (simplified IRS ordering themes)
    if (st < 0 && lt >= 0) {
      cfSt = unused
    } else if (lt < 0 && st >= 0) {
      cfLt = unused
    } else {
      // both negative or mixed resulting in net loss
      const stLoss = st < 0 ? -st : 0
      const appliedToSt = Math.min(stLoss, ordinaryLossAllowed)
      const remOrdinary = ordinaryLossAllowed - appliedToSt
      cfSt = Math.max(0, stLoss - appliedToSt)
      const ltLoss = lt < 0 ? -lt : 0
      cfLt = Math.max(0, ltLoss - remOrdinary)
    }
  } else if (lt > 0 && net > 0) {
    netCapitalGain = Math.min(lt, net)
  }

  let unrec = Math.max(
    0,
    Math.round(input.unrecaptured1250Gain ?? input.form8949?.unrecaptured1250Gain ?? 0),
  )
  let coll = Math.max(
    0,
    Math.round(input.collectibles28Gain ?? input.form8949?.collectibles28Gain ?? 0),
  )
  // Cap special rate gains by net capital gain
  unrec = Math.min(unrec, netCapitalGain)
  coll = Math.min(coll, Math.max(0, netCapitalGain - unrec))

  const qd = Math.max(0, Math.round(input.qualifiedDividends ?? 0))
  const taxWithPreferentialRates =
    netCapitalGain + qd > 0
      ? scheduleDTaxWorksheet(
          input.taxableIncome,
          netCapitalGain,
          qd,
          unrec,
          coll,
          input.filingStatus,
          input.tables.taxYear,
          input.tables.brackets[input.filingStatus],
        )
      : taxFromBrackets(input.taxableIncome, input.tables.brackets[input.filingStatus])

  if (unrec > 0 || coll > 0) {
    notes.push('Applied unrecaptured §1250 and/or 28% rate gain stacking.')
  }

  // Complex unsupported: installment sales, §1202 exclusion, carryback election
  notes.push('§1202 QSBS exclusion and installment-sale capital gain timing not modeled.')

  return {
    form: 'Schedule D',
    readiness: 'isolated-validated',
    productionReady: false,
    netShortTerm: st,
    netLongTerm: lt,
    netCapitalGainLoss: net,
    ordinaryLossAllowed,
    netCapitalGain,
    unrecaptured1250Applied: unrec,
    collectibles28Applied: coll,
    capitalLossCarryforward: { shortTerm: Math.round(cfSt), longTerm: Math.round(cfLt) },
    taxWithPreferentialRates,
    unsupportedCases,
    notes,
    sources: [
      'Schedule D (Form 1040) Instructions',
      'Form 8949 Instructions',
      'Qualified Dividends and Capital Gain Tax Worksheet / Schedule D Tax Worksheet',
    ],
  }
}
