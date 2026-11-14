/**
 * Form 1120 — C corporations (isolated staging module).
 * Uses flat 21% federal corporate rate (TCJA ongoing).
 */

import type { BusinessReturnInput, BusinessReturnResult } from '../types'
import { computeDepreciation } from './depreciation'
import { computeEstimatedTax } from './estimated'

const CORP_RATE = 0.21

export function computeForm1120(input: BusinessReturnInput): BusinessReturnResult {
  const gross = Math.max(0, input.grossReceipts)
  const cogs = Math.max(0, input.costOfGoodsSold ?? 0)
  const expenses = Math.max(0, input.ordinaryExpenses)
  const dep = computeDepreciation({
    costBasis: Math.max(0, input.depreciationExpense ?? 0) + Math.max(0, input.section179Expense ?? 0),
    section179Election: input.section179Expense ?? 0,
    recoveryYears: 5,
    yearInService: 1,
  })
  const depAllowed =
    input.depreciationExpense != null && input.section179Expense == null
      ? Math.max(0, input.depreciationExpense)
      : dep.total

  const ordinary = Math.round(gross - cogs - expenses - depAllowed)
  const taxable =
    input.taxableIncomeOverride != null ? Math.max(0, input.taxableIncomeOverride) : Math.max(0, ordinary)
  const credits = Math.max(0, input.businessCredits ?? 0)
  const taxBeforeCredits = Math.round(taxable * CORP_RATE)
  const entityTax = Math.max(0, taxBeforeCredits - credits)
  const estimatedPaid = Math.max(0, input.estimatedPayments ?? 0)
  const estimated = computeEstimatedTax({
    expectedTax: entityTax,
    paymentsToDate: estimatedPaid,
    useSafeHarbor: false,
  })
  const refundOrBalanceDue = estimatedPaid - entityTax

  return {
    form: 'Form 1120',
    taxYear: input.taxYear,
    ordinaryBusinessIncome: ordinary,
    taxableIncome: taxable,
    entityTax,
    estimatedTax: estimated.requiredAnnual,
    refundOrBalanceDue,
    depreciationAllowed: depAllowed,
    businessCreditsApplied: Math.min(credits, taxBeforeCredits),
    k1s: [],
    schedules: ['Schedule J', 'Schedule K', 'Schedule L (stub)', 'Form 1120-W (estimated stub)', 'Form 4562 (stub)'],
    notes: [
      'Isolated Form 1120 staging module — flat 21% corporate rate.',
      'AMT / foreign tax / consolidated returns not modeled.',
      'No Schedule K-1 for C-corps.',
      'liveBusinessEfile=false — no MeF transmission.',
      'Separated from personal Form 1040 calculations.',
    ],
    sources: [
      'IRS Form 1120 Instructions',
      'IRC §11 corporate tax rate (21%)',
      'IRS Form 1120-W estimated tax themes',
    ],
    productionReady: false,
    liveEfile: false,
  }
}
