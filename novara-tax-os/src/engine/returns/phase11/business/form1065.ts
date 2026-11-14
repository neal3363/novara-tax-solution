/**
 * Form 1065 — Partnerships (isolated staging module).
 * Pass-through ordinary business income → Schedule K-1.
 * Do not activate business e-filing without IRS authorization and schema support.
 */

import type { BusinessReturnInput, BusinessReturnResult } from '../types'
import { computeDepreciation } from './depreciation'
import { generatePartnershipK1s } from './scheduleK1'
import { computeEstimatedTax } from './estimated'

export function computeForm1065(input: BusinessReturnInput): BusinessReturnResult {
  if (!input.partners?.length) {
    throw new Error('Form 1065 requires partners')
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
  // If caller passed depreciationExpense as the allowed amount directly, prefer that path
  const depAllowed =
    input.depreciationExpense != null && input.section179Expense == null
      ? Math.max(0, input.depreciationExpense)
      : dep.total

  const ordinary = Math.round(gross - cogs - expenses - depAllowed)
  const credits = Math.max(0, input.businessCredits ?? 0)
  const k1s = generatePartnershipK1s(ordinary, input.partners)
  const estimated = computeEstimatedTax({
    expectedTax: 0, // partnerships generally do not pay entity-level income tax
    paymentsToDate: input.estimatedPayments ?? 0,
  })

  return {
    form: 'Form 1065',
    taxYear: input.taxYear,
    ordinaryBusinessIncome: ordinary,
    depreciationAllowed: depAllowed,
    businessCreditsApplied: credits,
    estimatedTax: estimated.requiredAnnual,
    k1s,
    schedules: ['Schedule K', 'Schedule K-1', 'Form 4562 (stub)', 'Schedule B (stub)'],
    notes: [
      'Isolated Form 1065 staging module — pass-through only.',
      'Entity-level tax is generally $0; partners report K-1 amounts on personal returns.',
      'Business credits listed informationally; partner-level credit allocation simplified.',
      'liveBusinessEfile=false — no MeF transmission.',
      'Personal and business calculations remain separated.',
    ],
    sources: [
      'IRS Form 1065 Instructions',
      'IRS Schedule K-1 (Form 1065) Instructions',
      'IRS Pub 946 (depreciation themes)',
    ],
    productionReady: false,
    liveEfile: false,
  }
}
