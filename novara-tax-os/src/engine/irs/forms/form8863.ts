/**
 * Form 8863 — Education Credits (AOTC / LLC) isolated.
 * NOT production-ready / not wired to taxpayer UI.
 */

import { getPhase4Params } from '../phase4Params'
import type { IrsFilingStatus } from '../types'

export type EducationCreditType = 'aotc' | 'llc'

export interface Form8863Student {
  creditType: EducationCreditType
  /** Qualified education expenses (tuition/fees per Form 8863 rules — simplified) */
  qualifiedExpenses: number
  /** Student is eligible (half-time, no felony drug for AOTC, etc.) — caller asserts */
  eligible: boolean
}

export interface Form8863Input {
  taxYear: number
  filingStatus: IrsFilingStatus
  magi: number
  students: Form8863Student[]
}

export interface Form8863Result {
  form: 'Form 8863'
  readiness: 'isolated-validated'
  productionReady: false
  aotcNonrefundable: number
  aotcRefundable: number
  llcNonrefundable: number
  totalNonrefundable: number
  totalRefundable: number
  notes: string[]
  sources: string[]
}

function phaseoutFactor(
  magi: number,
  begin: number,
  end: number,
): number {
  if (magi <= begin) return 1
  if (magi >= end) return 0
  return (end - magi) / (end - begin)
}

function aotcRaw(expenses: number): number {
  const e = Math.max(0, expenses)
  const first = Math.min(2000, e)
  const second = Math.min(2000, Math.max(0, e - 2000))
  return Math.round(first * 1.0 + second * 0.25) // max 2500
}

function llcRaw(expenses: number): number {
  return Math.round(Math.min(10000, Math.max(0, expenses)) * 0.2) // max 2000
}

export function computeForm8863(input: Form8863Input): Form8863Result {
  const params = getPhase4Params(input.taxYear)
  const notes: string[] = [
    'Isolated Form 8863 — not production-ready; eligibility asserted by caller.',
    'Does not model Form 1098-T box-level adjustments or prior AOTC year counts beyond caller eligibility.',
  ]
  const sources = params?.sources.filter((s) => s.includes('8863')) ?? ['Form 8863 Instructions']
  if (!params) {
    return {
      form: 'Form 8863',
      readiness: 'isolated-validated',
      productionReady: false,
      aotcNonrefundable: 0,
      aotcRefundable: 0,
      llcNonrefundable: 0,
      totalNonrefundable: 0,
      totalRefundable: 0,
      notes: [...notes, 'Tax year not supported'],
      sources,
    }
  }

  const mfj = input.filingStatus === 'mfj' || input.filingStatus === 'qss'
  const aotcPo = mfj ? params.aotcPhaseout.mfj : params.aotcPhaseout.singleLike
  const llcPo = mfj ? params.llcPhaseout.mfj : params.llcPhaseout.singleLike
  if (input.filingStatus === 'mfs') {
    notes.push('MFS generally cannot claim education credits — returning zero.')
    return {
      form: 'Form 8863',
      readiness: 'isolated-validated',
      productionReady: false,
      aotcNonrefundable: 0,
      aotcRefundable: 0,
      llcNonrefundable: 0,
      totalNonrefundable: 0,
      totalRefundable: 0,
      notes,
      sources,
    }
  }

  let aotcTotal = 0
  let llcTotal = 0
  for (const s of input.students) {
    if (!s.eligible) continue
    if (s.creditType === 'aotc') aotcTotal += aotcRaw(s.qualifiedExpenses)
    else llcTotal += llcRaw(s.qualifiedExpenses)
  }

  const aotcFactor = phaseoutFactor(input.magi, aotcPo[0], aotcPo[1])
  const llcFactor = phaseoutFactor(input.magi, llcPo[0], llcPo[1])
  aotcTotal = Math.round(aotcTotal * aotcFactor)
  llcTotal = Math.round(llcTotal * llcFactor)

  // AOTC: 40% refundable (max $1,000), remainder nonrefundable
  const aotcRefundable = Math.min(1000, Math.round(aotcTotal * 0.4))
  const aotcNonrefundable = aotcTotal - aotcRefundable

  return {
    form: 'Form 8863',
    readiness: 'isolated-validated',
    productionReady: false,
    aotcNonrefundable,
    aotcRefundable,
    llcNonrefundable: llcTotal,
    totalNonrefundable: aotcNonrefundable + llcTotal,
    totalRefundable: aotcRefundable,
    notes,
    sources,
  }
}
