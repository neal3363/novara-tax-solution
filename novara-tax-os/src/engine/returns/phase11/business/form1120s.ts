/**
 * Form 1120-S — S corporations (isolated staging module).
 */

import type { BusinessReturnInput, BusinessReturnResult } from '../types'
import { computeDepreciation } from './depreciation'
import { generateSCorpK1s } from './scheduleK1'
import { computeEstimatedTax } from './estimated'

export function computeForm1120S(input: BusinessReturnInput): BusinessReturnResult {
  if (!input.shareholders?.length) {
    throw new Error('Form 1120-S requires shareholders')
  }
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
  const credits = Math.max(0, input.businessCredits ?? 0)
  const k1s = generateSCorpK1s(ordinary, input.shareholders)
  const estimated = computeEstimatedTax({
    expectedTax: 0,
    paymentsToDate: input.estimatedPayments ?? 0,
  })

  return {
    form: 'Form 1120-S',
    taxYear: input.taxYear,
    ordinaryBusinessIncome: ordinary,
    depreciationAllowed: depAllowed,
    businessCreditsApplied: credits,
    estimatedTax: estimated.requiredAnnual,
    k1s,
    schedules: ['Schedule K', 'Schedule K-1', 'Form 4562 (stub)', 'Schedule M-1 (stub)'],
    notes: [
      'Isolated Form 1120-S staging module — pass-through to shareholders.',
      'Built-in gains / excess net passive income tax not modeled.',
      'Reasonable compensation themes deferred — personal return remains separate.',
      'liveBusinessEfile=false.',
    ],
    sources: [
      'IRS Form 1120-S Instructions',
      'IRS Schedule K-1 (Form 1120-S) Instructions',
    ],
    productionReady: false,
    liveEfile: false,
  }
}
