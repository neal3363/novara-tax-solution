/**
 * Schedule E — Supplemental Income and Loss (isolated).
 * Integrates Form 8582 for passive rental / K-1 limitations.
 * NOT production-ready.
 */

import {
  computeForm8582,
  type Form8582Result,
  type PassiveActivity,
} from './form8582'
import type { IrsFilingStatus } from '../types'

export interface ScheduleEProperty {
  id?: string
  rentsReceived: number
  royaltiesReceived?: number
  expenses: number
  activelyParticipating?: boolean
  realEstateProfessional?: boolean
  priorSuspendedPassiveLoss?: number
  entirelyDisposed?: boolean
  isPtp?: boolean
}

export interface ScheduleEK1 {
  id?: string
  ordinaryIncome: number
  /** default true when omitted for loss-bearing K-1s — set false for nonpassive */
  passive?: boolean
  priorSuspendedPassiveLoss?: number
  entirelyDisposed?: boolean
  isPtp?: boolean
}

export interface ScheduleEInput {
  taxYear: number
  filingStatus: IrsFilingStatus
  magiBeforePassiveLosses: number
  mfsLivedApartAllYear?: boolean
  properties?: ScheduleEProperty[]
  k1s?: ScheduleEK1[]
}

export interface ScheduleEResult {
  form: 'Schedule E'
  readiness: 'isolated-validated'
  productionReady: false
  rentalNet: number
  royaltyNet: number
  k1Ordinary: number
  agiInclusion: number
  suspendedPassiveLoss: number
  form8582?: Form8582Result
  unsupportedCases: string[]
  notes: string[]
  sources: string[]
}

export function computeScheduleE(input: ScheduleEInput): ScheduleEResult {
  const notes: string[] = [
    'Isolated Schedule E with Form 8582 — not production-ready.',
  ]
  const unsupportedCases: string[] = []
  const activities: PassiveActivity[] = []
  let idx = 0
  let royaltyReported = 0

  for (const p of input.properties ?? []) {
    const rent = Math.max(0, p.rentsReceived)
    const roy = Math.max(0, p.royaltiesReceived ?? 0)
    const exp = Math.max(0, p.expenses)
    const net = Math.round(rent + roy - exp)
    royaltyReported += roy
    activities.push({
      id: p.id ?? `rental-${idx++}`,
      currentNet: net,
      priorSuspendedLoss: p.priorSuspendedPassiveLoss,
      rentalRealEstateActiveParticipation: !!p.activelyParticipating && !p.realEstateProfessional,
      entirelyDisposed: p.entirelyDisposed,
      nonpassive: !!p.realEstateProfessional,
      isPtp: p.isPtp,
    })
  }

  for (const k of input.k1s ?? []) {
    const passive = k.passive !== false // default passive unless explicitly nonpassive
    activities.push({
      id: k.id ?? `k1-${idx++}`,
      currentNet: Math.round(k.ordinaryIncome),
      priorSuspendedLoss: k.priorSuspendedPassiveLoss,
      rentalRealEstateActiveParticipation: false,
      entirelyDisposed: k.entirelyDisposed,
      nonpassive: !passive,
      isPtp: k.isPtp,
    })
  }

  if (activities.length === 0) {
    return {
      form: 'Schedule E',
      readiness: 'isolated-validated',
      productionReady: false,
      rentalNet: 0,
      royaltyNet: 0,
      k1Ordinary: 0,
      agiInclusion: 0,
      suspendedPassiveLoss: 0,
      unsupportedCases: [],
      notes,
      sources: ['Schedule E (Form 1040) Instructions', 'Form 8582 Instructions'],
    }
  }

  const form8582 = computeForm8582({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    magi: input.magiBeforePassiveLosses,
    mfsLivedApartAllYear: input.mfsLivedApartAllYear,
    activities,
  })
  notes.push(...form8582.notes)
  unsupportedCases.push(...form8582.unsupportedCases)

  let rentalNet = 0
  let k1Ordinary = 0
  for (const r of form8582.activities) {
    if (r.id.startsWith('k1')) k1Ordinary += r.includedInAgi
    else rentalNet += r.includedInAgi
  }

  return {
    form: 'Schedule E',
    readiness: 'isolated-validated',
    productionReady: false,
    rentalNet: Math.round(rentalNet),
    royaltyNet: Math.round(royaltyReported),
    k1Ordinary: Math.round(k1Ordinary),
    agiInclusion: Math.round(form8582.agiInclusion),
    suspendedPassiveLoss: form8582.totalSuspendedCarryforward,
    form8582,
    unsupportedCases: [...new Set(unsupportedCases)],
    notes,
    sources: [
      'Schedule E (Form 1040) Instructions',
      'Form 8582 Instructions',
      'Pub 925 — Passive Activity and At-Risk Rules',
    ],
  }
}
