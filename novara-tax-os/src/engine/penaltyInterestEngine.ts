/**
 * Tax-year-aware IRS penalty and interest *estimates*.
 * Clearly labeled as estimates unless verified from an official IRS assessment.
 * Never mix with NOVARA service fees.
 */

export interface PenaltyInterestEstimate {
  taxYear: number
  asOf: string
  items: {
    id: string
    label: string
    amount: number
    basis: string
    estimate: true
  }[]
  totalEstimate: number
  disclaimer: string
  verifiedFromIrs: false
}

/** Underpayment interest demo rate — not a live IRS feed */
const DEMO_ANNUAL_INTEREST_RATE = 0.08

/**
 * Estimate failure-to-file / failure-to-pay / interest for unpaid tax.
 * Uses simplified IRC-style formulas for demo education — not an official assessment.
 */
export function estimatePenaltiesAndInterest(input: {
  taxYear: number
  taxDue: number
  amountPaidByDueDate: number
  filedOn?: string
  /** Original due date default April 15 of taxYear+1 */
  dueDate?: string
  extensionFiled?: boolean
  asOf?: Date
}): PenaltyInterestEstimate {
  const asOf = input.asOf ?? new Date()
  const due = input.dueDate ? new Date(input.dueDate) : new Date(Date.UTC(input.taxYear + 1, 3, 15))
  const unpaid = Math.max(0, input.taxDue - input.amountPaidByDueDate)
  const items: PenaltyInterestEstimate['items'] = []

  if (unpaid <= 0) {
    return {
      taxYear: input.taxYear,
      asOf: asOf.toISOString(),
      items: [],
      totalEstimate: 0,
      disclaimer:
        'No estimated IRS penalties or interest on the unpaid balance modeled. Estimates only — not an IRS assessment. Separate from NOVARA service fees.',
      verifiedFromIrs: false,
    }
  }

  const monthsLateFile = input.filedOn
    ? Math.max(0, monthDiff(due, new Date(input.filedOn)))
    : Math.max(0, monthDiff(due, asOf))
  // Failure to file: 5% per month up to 25% of unpaid tax (simplified)
  if (!input.filedOn || new Date(input.filedOn) > due) {
    const months = Math.min(5, Math.max(1, monthsLateFile || monthDiff(due, asOf)))
    const ftf = Math.min(unpaid * 0.25, unpaid * 0.05 * months)
    if (ftf > 0) {
      items.push({
        id: 'failure-to-file',
        label: 'Failure-to-file penalty (estimate)',
        amount: round2(ftf),
        basis: `${months} month(s) × 5% of unpaid tax, capped at 25%`,
        estimate: true,
      })
    }
  }

  // Failure to pay: 0.5% per month up to 25%
  const monthsUnpaid = Math.min(50, Math.max(1, monthDiff(due, asOf)))
  const ftp = Math.min(unpaid * 0.25, unpaid * 0.005 * monthsUnpaid)
  items.push({
    id: 'failure-to-pay',
    label: 'Failure-to-pay penalty (estimate)',
    amount: round2(ftp),
    basis: `${monthsUnpaid} month(s) × 0.5% of unpaid tax, capped at 25%`,
    estimate: true,
  })

  // Interest — simple annualized demo
  const years = Math.max(0, (asOf.getTime() - due.getTime()) / (365.25 * 24 * 3600 * 1000))
  const interest = unpaid * DEMO_ANNUAL_INTEREST_RATE * years
  if (interest > 0) {
    items.push({
      id: 'statutory-interest',
      label: 'Statutory interest (estimate)',
      amount: round2(interest),
      basis: `${(DEMO_ANNUAL_INTEREST_RATE * 100).toFixed(1)}% annualized demo rate × ${years.toFixed(2)} years`,
      estimate: true,
    })
  }

  if (input.extensionFiled) {
    items.push({
      id: 'extension-note',
      label: 'Extension on file',
      amount: 0,
      basis: 'Extension may affect failure-to-file timing; interest and failure-to-pay can still accrue on unpaid tax.',
      estimate: true,
    })
  }

  const totalEstimate = round2(items.reduce((s, i) => s + i.amount, 0))
  return {
    taxYear: input.taxYear,
    asOf: asOf.toISOString(),
    items,
    totalEstimate,
    disclaimer:
      'These IRS penalty and interest figures are estimates only unless verified from an official IRS assessment or account transcript. They are never combined with NOVARA preparation fees.',
    verifiedFromIrs: false,
  }
}

function monthDiff(from: Date, to: Date): number {
  return Math.max(0, (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth()))
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
