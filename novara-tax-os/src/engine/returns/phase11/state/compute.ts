/**
 * Modular state tax calculation framework.
 * Unsupported states are detected explicitly — never claim nationwide support.
 */

import type { StateReturnInput, StateReturnResult, StateBracket, FilingStatusLite } from '../types'
import { getStateTables, normalizeStateCode, STATE_SUPPORTED_YEARS } from './tables'

function taxFromBrackets(income: number, brackets: StateBracket[]): number {
  if (income <= 0 || brackets.length === 0) return 0
  let tax = 0
  let prev = 0
  for (const b of brackets) {
    const slice = Math.min(income, b.upTo) - prev
    if (slice > 0) tax += slice * b.rate
    if (income <= b.upTo) break
    prev = b.upTo
  }
  return Math.round(tax)
}

function standardDeductionFor(status: FilingStatusLite, tables: NonNullable<ReturnType<typeof getStateTables>>): number {
  return tables.standardDeduction[status] ?? tables.standardDeduction.single
}

function bracketsFor(status: FilingStatusLite, tables: NonNullable<ReturnType<typeof getStateTables>>): StateBracket[] {
  if (status === 'mfj') return tables.brackets.mfj
  return tables.brackets.single
}

export function computeStateReturn(input: StateReturnInput): StateReturnResult {
  const code = normalizeStateCode(input.stateCode)
  const unsupported: string[] = []

  if (!STATE_SUPPORTED_YEARS.includes(input.taxYear as (typeof STATE_SUPPORTED_YEARS)[number])) {
    unsupported.push(`unsupported_tax_year:${input.taxYear}`)
  }

  const tables = getStateTables(code, input.taxYear)
  if (!tables) {
    unsupported.push(`unsupported_state:${code}`)
    return {
      stateCode: code,
      taxYear: input.taxYear,
      validationStatus: 'unsupported',
      residency: input.residency,
      allocatedStateIncome: 0,
      taxableIncome: 0,
      taxBeforeCredits: 0,
      credits: 0,
      taxAfterCredits: 0,
      withholding: input.stateWithholding,
      refundOrBalanceDue: 0,
      unsupportedReasons: unsupported,
      notes: [
        `State ${code} is not implemented/validated in Phase 11.`,
        'Do not claim nationwide state filing support.',
      ],
      sources: [],
      productionReady: false,
      nationwideClaim: false,
    }
  }

  const wagesIn = Math.max(0, input.wagesInState)
  const wagesOut = Math.max(0, input.wagesOutOfState)
  const otherIn = Math.max(0, input.otherIncomeInState ?? 0)
  let allocated = wagesIn + otherIn
  let ratio = 1

  if (input.residency === 'nonresident') {
    const total = wagesIn + wagesOut + otherIn
    ratio = total > 0 ? (wagesIn + otherIn) / total : 0
    allocated = wagesIn + otherIn
  } else if (input.residency === 'part_year') {
    const months = Math.min(12, Math.max(0, input.monthsResident ?? 6))
    ratio = months / 12
    // Part-year: allocate by months for out-of-state wages; keep in-state wages
    allocated = wagesIn + otherIn + Math.round(wagesOut * ratio)
  } else {
    // Full-year resident — typically all income taxable by state of residence (simplified)
    allocated = wagesIn + wagesOut + otherIn
    const total = wagesIn + wagesOut + otherIn
    ratio = total > 0 ? 1 : 0
  }

  if (!tables.hasPersonalIncomeTax) {
    const withholding = Math.max(0, input.stateWithholding)
    return {
      stateCode: tables.stateCode,
      taxYear: input.taxYear,
      validationStatus: tables.validationStatus,
      residency: input.residency,
      allocatedStateIncome: allocated,
      taxableIncome: 0,
      taxBeforeCredits: 0,
      credits: 0,
      taxAfterCredits: 0,
      withholding,
      refundOrBalanceDue: withholding, // over-withheld themes only
      multiStateAllocation: {
        inStateRatio: ratio,
        inStateIncome: wagesIn + otherIn,
        outOfStateIncome: wagesOut,
      },
      unsupportedReasons: unsupported,
      notes: tables.notes,
      sources: tables.sources,
      productionReady: false,
      nationwideClaim: false,
    }
  }

  const deduction =
    input.itemizedOrStandard === 'itemized'
      ? Math.max(0, input.itemizedDeductions ?? 0)
      : standardDeductionFor(input.filingStatus, tables)
  const exemption = tables.personalExemption ?? 0
  const taxableIncome = Math.max(0, Math.round(allocated - deduction - exemption))
  const taxBeforeCredits = taxFromBrackets(taxableIncome, bracketsFor(input.filingStatus, tables))

  let credits = 0
  for (const c of input.claimedCredits ?? []) {
    const def = tables.credits?.find((x) => x.id === c.id)
    if (!def) {
      unsupported.push(`unsupported_credit:${c.id}`)
      continue
    }
    credits += Math.min(Math.max(0, c.amount), def.maxAmount || c.amount)
  }
  credits = Math.round(credits)
  const taxAfterCredits = Math.max(0, taxBeforeCredits - credits)
  const withholding = Math.max(0, input.stateWithholding)
  const refundOrBalanceDue = Math.round(withholding - taxAfterCredits)

  return {
    stateCode: tables.stateCode,
    taxYear: input.taxYear,
    validationStatus: tables.validationStatus,
    residency: input.residency,
    allocatedStateIncome: allocated,
    taxableIncome,
    taxBeforeCredits,
    credits,
    taxAfterCredits,
    withholding,
    refundOrBalanceDue,
    multiStateAllocation: {
      inStateRatio: ratio,
      inStateIncome: wagesIn + otherIn,
      outOfStateIncome: wagesOut,
    },
    unsupportedReasons: unsupported,
    notes: tables.notes,
    sources: tables.sources,
    productionReady: false,
    nationwideClaim: false,
  }
}

export function detectUnsupportedState(stateCode: string, taxYear: number): {
  supported: boolean
  reasons: string[]
} {
  const code = normalizeStateCode(stateCode)
  const reasons: string[] = []
  if (!STATE_SUPPORTED_YEARS.includes(taxYear as (typeof STATE_SUPPORTED_YEARS)[number])) {
    reasons.push(`unsupported_tax_year:${taxYear}`)
  }
  const tables = getStateTables(code, taxYear)
  if (!tables) reasons.push(`unsupported_state:${code}`)
  return { supported: reasons.length === 0, reasons }
}
