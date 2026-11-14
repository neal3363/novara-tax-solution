/**
 * Form 8995-A — Qualified Business Income Deduction (isolated).
 * Implements wage/UBIA limitation and SSTB phase-out in the phase-in range.
 * NOT production-ready / not wired to taxpayer UI.
 */

import { getPhase4Params } from '../phase4Params'
import type { IrsFilingStatus, YearTaxTables } from '../types'

export interface Form8995AInput {
  taxYear: number
  filingStatus: IrsFilingStatus
  /** Qualified business income (before QBI deduction) */
  qbi: number
  /** Taxable income before QBI deduction */
  taxableIncomeBeforeQbi: number
  /** Qualified REIT/PTP dividends (optional Component 3 themes) */
  reitPtp?: number
  w2Wages: number
  ubia: number
  isSstb: boolean
  tables: YearTaxTables
}

export interface Form8995AResult {
  form: 'Form 8995-A'
  readiness: 'isolated-validated'
  productionReady: false
  qbiDeduction: number
  appliedPath: 'below_threshold' | 'phase_in' | 'above_phase_in' | 'sstb_zeroed'
  notes: string[]
  sources: string[]
}

export function computeForm8995A(input: Form8995AInput): Form8995AResult {
  const params = getPhase4Params(input.taxYear)
  const notes: string[] = [
    'Isolated Form 8995-A — not production-ready; not connected to Refund Maximizer.',
  ]
  const sources = params?.sources.filter((s) => s.includes('8995')) ?? ['Form 8995-A Instructions']
  const threshold =
    input.filingStatus === 'mfj' || input.filingStatus === 'qss'
      ? input.tables.qbiThreshold.mfj
      : input.tables.qbiThreshold.singleLike
  const range =
    input.filingStatus === 'mfj' || input.filingStatus === 'qss'
      ? (params?.qbiPhaseInRange.mfj ?? 100000)
      : (params?.qbiPhaseInRange.singleLike ?? 50000)

  const qbi = Math.max(0, input.qbi)
  const reit = Math.max(0, input.reitPtp ?? 0)
  const tiBefore = Math.max(0, input.taxableIncomeBeforeQbi)
  const overallLimit = Math.round(tiBefore * input.tables.qbiDeductionRate)

  if (qbi <= 0 && reit <= 0) {
    return {
      form: 'Form 8995-A',
      readiness: 'isolated-validated',
      productionReady: false,
      qbiDeduction: 0,
      appliedPath: 'below_threshold',
      notes,
      sources,
    }
  }

  // Below threshold — full 20% of QBI (+ REIT), capped by 20% of TI
  if (tiBefore <= threshold) {
    if (input.isSstb) {
      notes.push('SSTB below threshold — QBI still allowed (Form 8995-A).')
    }
    const ded = Math.min(Math.round(qbi * 0.2 + reit * 0.2), overallLimit)
    return {
      form: 'Form 8995-A',
      readiness: 'isolated-validated',
      productionReady: false,
      qbiDeduction: ded,
      appliedPath: 'below_threshold',
      notes,
      sources,
    }
  }

  const excess = tiBefore - threshold
  const phaseInRatio = Math.min(1, excess / range)

  // Fully above phase-in range
  if (phaseInRatio >= 1) {
    if (input.isSstb) {
      notes.push('SSTB fully phased out above threshold + phase-in range.')
      return {
        form: 'Form 8995-A',
        readiness: 'isolated-validated',
        productionReady: false,
        qbiDeduction: Math.min(Math.round(reit * 0.2), overallLimit),
        appliedPath: 'sstb_zeroed',
        notes,
        sources,
      }
    }
    const wageLimit = Math.max(
      Math.round(input.w2Wages * 0.5),
      Math.round(input.w2Wages * 0.25 + input.ubia * 0.025),
    )
    const limitedQbi = Math.min(Math.round(qbi * 0.2), wageLimit)
    const ded = Math.min(limitedQbi + Math.round(reit * 0.2), overallLimit)
    notes.push('Above phase-in: W-2 wage / UBIA limitation applied (Form 8995-A).')
    return {
      form: 'Form 8995-A',
      readiness: 'isolated-validated',
      productionReady: false,
      qbiDeduction: ded,
      appliedPath: 'above_phase_in',
      notes,
      sources,
    }
  }

  // Phase-in range
  const reductionRatio = phaseInRatio
  let applicableQbi = qbi
  if (input.isSstb) {
    applicableQbi = Math.round(qbi * (1 - reductionRatio))
    notes.push(`SSTB phase-in: applicable QBI reduced by ${(reductionRatio * 100).toFixed(1)}%.`)
  }

  const tentative = Math.round(applicableQbi * 0.2)
  const wageLimit = Math.max(
    Math.round(input.w2Wages * 0.5),
    Math.round(input.w2Wages * 0.25 + input.ubia * 0.025),
  )
  const excessOverWage = Math.max(0, tentative - wageLimit)
  const reduction = Math.round(excessOverWage * reductionRatio)
  const afterWage = tentative - reduction
  const ded = Math.min(afterWage + Math.round(reit * 0.2), overallLimit)
  notes.push('Phase-in range: blended wage/UBIA limitation applied.')

  return {
    form: 'Form 8995-A',
    readiness: 'isolated-validated',
    productionReady: false,
    qbiDeduction: Math.max(0, ded),
    appliedPath: 'phase_in',
    notes,
    sources,
  }
}
