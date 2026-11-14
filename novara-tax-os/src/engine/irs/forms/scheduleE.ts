/**
 * Schedule E — Supplemental Income and Loss (isolated).
 * Rental/royalty net and K-1 ordinary income. Passive loss limitation is NOT fully modeled.
 * readiness: isolated-partial
 * NOT production-ready.
 */

export interface ScheduleEProperty {
  rentsReceived: number
  royaltiesReceived?: number
  expenses: number
  /** If true, loss may be limited — currently losses allowed only up to income unless activelyParticipating flag */
  activelyParticipating?: boolean
}

export interface ScheduleEK1 {
  ordinaryIncome: number
  /** Passive flag — losses currently disallowed against non-passive (simplified) */
  passive?: boolean
}

export interface ScheduleEInput {
  properties?: ScheduleEProperty[]
  k1s?: ScheduleEK1[]
}

export interface ScheduleEResult {
  form: 'Schedule E'
  readiness: 'isolated-partial'
  productionReady: false
  rentalNet: number
  royaltyNet: number
  k1Ordinary: number
  /** Amount included in AGI */
  agiInclusion: number
  suspendedPassiveLoss: number
  notes: string[]
  sources: string[]
}

export function computeScheduleE(input: ScheduleEInput): ScheduleEResult {
  const notes: string[] = [
    'Isolated Schedule E — not production-ready.',
    'Full Form 8582 passive activity limitation worksheet is NOT implemented (isolated-partial).',
  ]
  let rentalNet = 0
  let royaltyNet = 0
  let suspended = 0

  for (const p of input.properties ?? []) {
    const rent = Math.max(0, p.rentsReceived)
    const roy = Math.max(0, p.royaltiesReceived ?? 0)
    const exp = Math.max(0, p.expenses)
    // Allocate expenses to rent first (simplified single property net)
    const gross = rent + roy
    const net = gross - exp
    if (net >= 0) {
      // Split net proportionally
      if (gross > 0) {
        rentalNet += Math.round(net * (rent / gross))
        royaltyNet += Math.round(net * (roy / gross))
      }
    } else if (p.activelyParticipating) {
      // Allow loss (special $25k allowance not fully modeled — allow full for isolated tests with note)
      rentalNet += net
      notes.push('Active participation loss allowed without Form 8582 phaseout (partial model).')
    } else {
      suspended += -net
      notes.push('Passive rental loss suspended (simplified — not full Form 8582).')
    }
  }

  let k1Ordinary = 0
  for (const k of input.k1s ?? []) {
    if (k.ordinaryIncome < 0 && k.passive) {
      suspended += -k.ordinaryIncome
      notes.push('Passive K-1 loss suspended (simplified).')
    } else {
      k1Ordinary += Math.round(k.ordinaryIncome)
    }
  }

  const agiInclusion = Math.round(rentalNet + royaltyNet + k1Ordinary)

  return {
    form: 'Schedule E',
    readiness: 'isolated-partial',
    productionReady: false,
    rentalNet: Math.round(rentalNet),
    royaltyNet: Math.round(royaltyNet),
    k1Ordinary: Math.round(k1Ordinary),
    agiInclusion,
    suspendedPassiveLoss: Math.round(suspended),
    notes,
    sources: ['Schedule E (Form 1040) Instructions', 'Form 8582 themes (unsupported full worksheet)'],
  }
}
