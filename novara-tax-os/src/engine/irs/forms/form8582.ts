/**
 * Form 8582 — Passive Activity Loss Limitations (isolated, TY2022–2025).
 * Rental real estate special allowance, MAGI phaseout, passive income limit,
 * suspended carryforwards, entire-disposition release.
 * NOT production-ready / not wired to taxpayer UI.
 */

import type { IrsFilingStatus } from '../types'

export interface PassiveActivity {
  id: string
  /** Current-year net income (positive) or loss (negative) before Form 8582 */
  currentNet: number
  /** Prior-year suspended passive loss carryforward (positive = loss amount) */
  priorSuspendedLoss?: number
  /** Rental real estate with active participation → special allowance eligible */
  rentalRealEstateActiveParticipation?: boolean
  /** Entire interest disposed of in a fully taxable transaction this year */
  entirelyDisposed?: boolean
  /** Material participation / real estate professional → nonpassive */
  nonpassive?: boolean
  /** Publicly traded partnership — limited support */
  isPtp?: boolean
}

export interface Form8582Input {
  taxYear: number
  filingStatus: IrsFilingStatus
  /** MAGI for special-allowance phaseout (before this year's PAL deduction) */
  magi: number
  /** MFS who lived apart from spouse all year — enables half special allowance */
  mfsLivedApartAllYear?: boolean
  activities: PassiveActivity[]
}

export interface Form8582ActivityResult {
  id: string
  allowedLoss: number
  suspendedLoss: number
  /** Amount included in AGI from this activity after Form 8582 */
  includedInAgi: number
  releasedOnDisposition: number
  unsupported: boolean
  unsupportedReason?: string
}

export interface Form8582Result {
  form: 'Form 8582'
  readiness: 'isolated-validated'
  productionReady: false
  specialAllowanceAvailable: number
  specialAllowanceUsed: number
  magi: number
  totalPassiveIncome: number
  totalPassiveLossBeforeLimit: number
  totalAllowedLoss: number
  totalSuspendedCarryforward: number
  /** Sum of activity AGI inclusions (Schedule E passive portion) */
  agiInclusion: number
  activities: Form8582ActivityResult[]
  unsupportedCases: string[]
  notes: string[]
  sources: string[]
}

export function specialAllowanceParams(
  filingStatus: IrsFilingStatus,
  mfsLivedApartAllYear?: boolean,
): { maxAllowance: number; phaseoutBegin: number; phaseoutEnd: number; allowed: boolean } {
  if (filingStatus === 'mfs') {
    if (!mfsLivedApartAllYear) {
      return { maxAllowance: 0, phaseoutBegin: 0, phaseoutEnd: 0, allowed: false }
    }
    return { maxAllowance: 12500, phaseoutBegin: 50000, phaseoutEnd: 75000, allowed: true }
  }
  return { maxAllowance: 25000, phaseoutBegin: 100000, phaseoutEnd: 150000, allowed: true }
}

export function computeSpecialAllowanceCeiling(
  magi: number,
  filingStatus: IrsFilingStatus,
  mfsLivedApartAllYear?: boolean,
): number {
  const p = specialAllowanceParams(filingStatus, mfsLivedApartAllYear)
  if (!p.allowed) return 0
  if (magi >= p.phaseoutEnd) return 0
  if (magi <= p.phaseoutBegin) return p.maxAllowance
  return Math.max(0, p.maxAllowance - Math.round((magi - p.phaseoutBegin) * 0.5))
}

export function computeForm8582(input: Form8582Input): Form8582Result {
  const notes: string[] = [
    'Isolated Form 8582 — not production-ready; not connected to Refund Maximizer.',
  ]
  const unsupportedCases: string[] = []
  const sources = [
    `Form 8582 Instructions (TY${input.taxYear})`,
    'Pub 925 — Passive Activity and At-Risk Rules',
    'IRC §469 rental real estate special allowance',
  ]

  const allowanceCeiling = computeSpecialAllowanceCeiling(
    input.magi,
    input.filingStatus,
    input.mfsLivedApartAllYear,
  )
  if (input.filingStatus === 'mfs' && !input.mfsLivedApartAllYear) {
    notes.push('MFS without lived-apart-all-year: special allowance is $0 (Form 8582).')
  }

  const results: Form8582ActivityResult[] = []
  type Bucket = {
    act: PassiveActivity
    current: number
    prior: number
    totalLoss: number
    income: number
    allowed: number
    remaining: number
    unsupported: boolean
    reason?: string
  }

  const passiveBuckets: Bucket[] = []
  let totalPassiveIncome = 0
  let totalPassiveLossBeforeLimit = 0
  let totalAllowedLoss = 0
  let totalSuspended = 0
  let specialAllowanceUsed = 0

  for (const act of input.activities) {
    const current = Math.round(act.currentNet)
    const prior = Math.max(0, Math.round(act.priorSuspendedLoss ?? 0))
    const currentLoss = current < 0 ? -current : 0
    const income = current > 0 ? current : 0
    const totalLoss = currentLoss + prior

    if (act.isPtp) {
      unsupportedCases.push(`PTP activity ${act.id}: cross-activity PTP netting not fully modeled`)
    }

    // Entire disposition — release all losses
    if (act.entirelyDisposed) {
      const released = totalLoss
      // AGI: current net minus prior carryforward (prior now deductible)
      const included = current - prior
      results.push({
        id: act.id,
        allowedLoss: released,
        suspendedLoss: 0,
        includedInAgi: included,
        releasedOnDisposition: released,
        unsupported: !!act.isPtp,
        unsupportedReason: act.isPtp ? 'PTP disposition path simplified' : undefined,
      })
      totalAllowedLoss += released
      notes.push(`Activity ${act.id}: entire disposition — suspended losses released.`)
      continue
    }

    // Nonpassive (e.g. real estate professional)
    if (act.nonpassive) {
      const unsupported = prior > 0
      if (unsupported) {
        unsupportedCases.push(
          `Activity ${act.id}: prior suspended PAL with nonpassive conversion — review required`,
        )
      }
      results.push({
        id: act.id,
        allowedLoss: currentLoss,
        suspendedLoss: prior,
        includedInAgi: current,
        releasedOnDisposition: 0,
        unsupported,
        unsupportedReason: unsupported
          ? 'Prior suspended loss on nonpassive activity not auto-released'
          : undefined,
      })
      totalSuspended += prior
      continue
    }

    totalPassiveIncome += income
    totalPassiveLossBeforeLimit += totalLoss
    passiveBuckets.push({
      act,
      current,
      prior,
      totalLoss,
      income,
      allowed: 0,
      remaining: totalLoss,
      unsupported: !!act.isPtp,
      reason: act.isPtp ? 'PTP netting limited' : undefined,
    })
  }

  // Step 1: passive income offsets losses (pro-rata)
  const lossTotal = passiveBuckets.reduce((s, b) => s + b.remaining, 0)
  let incomePool = totalPassiveIncome
  if (incomePool > 0 && lossTotal > 0) {
    const offsetBudget = Math.min(incomePool, lossTotal)
    let allocated = 0
    for (let i = 0; i < passiveBuckets.length; i++) {
      const b = passiveBuckets[i]
      if (b.remaining <= 0) continue
      const raw = (b.remaining / lossTotal) * offsetBudget
      const use =
        i === passiveBuckets.length - 1
          ? offsetBudget - allocated
          : Math.min(b.remaining, Math.round(raw))
      b.allowed += use
      b.remaining -= use
      allocated += use
    }
    incomePool -= allocated
  }

  // Step 2: special allowance for active-participation rental real estate
  let remainingAllowance = allowanceCeiling
  for (const b of passiveBuckets) {
    if (b.remaining <= 0 || remainingAllowance <= 0) continue
    if (!b.act.rentalRealEstateActiveParticipation) continue
    const use = Math.min(b.remaining, remainingAllowance)
    b.allowed += use
    b.remaining -= use
    remainingAllowance -= use
    specialAllowanceUsed += use
  }

  for (const b of passiveBuckets) {
    // includedInAgi = max(current,0) - allowedLoss
    const included = b.income - b.allowed
    results.push({
      id: b.act.id,
      allowedLoss: b.allowed,
      suspendedLoss: b.remaining,
      includedInAgi: included,
      releasedOnDisposition: 0,
      unsupported: b.unsupported,
      unsupportedReason: b.reason,
    })
    totalAllowedLoss += b.allowed
    totalSuspended += b.remaining
  }

  const agiInclusion = results.reduce((s, r) => s + r.includedInAgi, 0)

  return {
    form: 'Form 8582',
    readiness: 'isolated-validated',
    productionReady: false,
    specialAllowanceAvailable: allowanceCeiling,
    specialAllowanceUsed,
    magi: Math.round(input.magi),
    totalPassiveIncome: Math.round(totalPassiveIncome),
    totalPassiveLossBeforeLimit: Math.round(totalPassiveLossBeforeLimit),
    totalAllowedLoss: Math.round(totalAllowedLoss),
    totalSuspendedCarryforward: Math.round(totalSuspended),
    agiInclusion: Math.round(agiInclusion),
    activities: results,
    unsupportedCases: [...new Set(unsupportedCases)],
    notes,
    sources,
  }
}
