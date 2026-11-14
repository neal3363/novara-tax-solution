/**
 * Form 1040-X — Amended return recalculation (isolated).
 * Runs original and corrected IrsReturnInput through the IRS engine and produces column A/B/C deltas.
 * Does NOT modify amendments UI. NOT production-ready / not wired to taxpayers.
 */

import { computeIrsFederalReturn } from '../federalReturn'
import type { IrsReturnInput, IrsReturnResult } from '../types'

export interface Form1040XInput {
  original: IrsReturnInput
  corrected: IrsReturnInput
  /** Amount paid with original / prior (optional column themes) */
  amountPaidWithOriginal?: number
  refundReceivedOnOriginal?: number
}

export interface Form1040XLineDelta {
  line: string
  original: number
  corrected: number
  netChange: number
}

export interface Form1040XResult {
  form: 'Form 1040-X'
  readiness: 'isolated-validated'
  productionReady: false
  original: Pick<
    IrsReturnResult,
    'agi' | 'taxableIncome' | 'incomeTaxBeforeCredits' | 'seTax' | 'refundOrBalanceDue' | 'totalPayments'
  >
  corrected: Pick<
    IrsReturnResult,
    'agi' | 'taxableIncome' | 'incomeTaxBeforeCredits' | 'seTax' | 'refundOrBalanceDue' | 'totalPayments'
  >
  deltas: Form1040XLineDelta[]
  /** Positive = additional refund due; negative = additional balance due (simplified) */
  netRefundOrBalanceChange: number
  notes: string[]
  sources: string[]
}

export function computeForm1040X(input: Form1040XInput): Form1040XResult {
  if (input.original.taxYear !== input.corrected.taxYear) {
    throw new Error('Form 1040-X original and corrected tax years must match')
  }

  const a = computeIrsFederalReturn(input.original)
  const b = computeIrsFederalReturn(input.corrected)

  const pick = (r: IrsReturnResult) => ({
    agi: r.agi,
    taxableIncome: r.taxableIncome,
    incomeTaxBeforeCredits: r.incomeTaxBeforeCredits,
    seTax: r.seTax,
    refundOrBalanceDue: r.refundOrBalanceDue,
    totalPayments: r.totalPayments,
  })

  const deltas: Form1040XLineDelta[] = [
    { line: 'AGI', original: a.agi, corrected: b.agi, netChange: b.agi - a.agi },
    {
      line: 'Taxable income',
      original: a.taxableIncome,
      corrected: b.taxableIncome,
      netChange: b.taxableIncome - a.taxableIncome,
    },
    {
      line: 'Income tax',
      original: a.incomeTaxBeforeCredits,
      corrected: b.incomeTaxBeforeCredits,
      netChange: b.incomeTaxBeforeCredits - a.incomeTaxBeforeCredits,
    },
    { line: 'SE tax', original: a.seTax, corrected: b.seTax, netChange: b.seTax - a.seTax },
    {
      line: 'Refund or balance due',
      original: a.refundOrBalanceDue,
      corrected: b.refundOrBalanceDue,
      netChange: b.refundOrBalanceDue - a.refundOrBalanceDue,
    },
  ]

  return {
    form: 'Form 1040-X',
    readiness: 'isolated-validated',
    productionReady: false,
    original: pick(a),
    corrected: pick(b),
    deltas,
    netRefundOrBalanceChange: b.refundOrBalanceDue - a.refundOrBalanceDue,
    notes: [
      'Isolated Form 1040-X recalc — not production-ready; amendments UI unchanged.',
      'Column A = original engine result; Column B = corrected; Column C = net change.',
      'Does not file or transmit amended returns.',
    ],
    sources: ['Form 1040-X Instructions', 'Isolated IRS engine TY' + String(input.original.taxYear)],
  }
}
