/**
 * Additional state worksheets for staging-validated CA / NY / IL scenarios.
 * Does not claim nationwide support or production e-file readiness.
 */

import type { StateReturnInput, StateReturnResult } from '../types'
import { computeStateReturn } from './compute'

export interface Ca540NrWorksheet {
  form: 'CA Form 540 / 540NR themes'
  californiaSourceIncome: number
  nonresidentRatio: number
  taxAfterCredits: number
  notes: string[]
  productionReady: false
}

export interface NyIt203Worksheet {
  form: 'NY IT-201 / IT-203 themes'
  allocatedIncome: number
  /** NYC / Yonkers explicitly out of scope */
  localTaxIncluded: false
  taxAfterCredits: number
  notes: string[]
  productionReady: false
}

export function computeCa540Worksheet(input: StateReturnInput): {
  base: StateReturnResult
  worksheet: Ca540NrWorksheet
} {
  const base = computeStateReturn({ ...input, stateCode: 'CA' })
  const californiaSourceIncome =
    input.residency === 'resident'
      ? base.allocatedStateIncome
      : (input.wagesInState || 0) + (input.otherIncomeInState || 0)
  const total = (input.wagesInState || 0) + (input.wagesOutOfState || 0) + (input.otherIncomeInState || 0)
  return {
    base,
    worksheet: {
      form: 'CA Form 540 / 540NR themes',
      californiaSourceIncome,
      nonresidentRatio: total > 0 ? californiaSourceIncome / total : 0,
      taxAfterCredits: base.taxAfterCredits,
      notes: [
        ...(base.notes || []),
        'CA 540NR allocation uses staging ratio model — not full Schedule CA / Form 540NR worksheets.',
        'Mental Health Services Tax / local add-ons not included.',
      ],
      productionReady: false,
    },
  }
}

export function computeNyItWorksheet(input: StateReturnInput): {
  base: StateReturnResult
  worksheet: NyIt203Worksheet
} {
  const base = computeStateReturn({ ...input, stateCode: 'NY' })
  return {
    base,
    worksheet: {
      form: 'NY IT-201 / IT-203 themes',
      allocatedIncome: base.allocatedStateIncome,
      localTaxIncluded: false,
      taxAfterCredits: base.taxAfterCredits,
      notes: [
        ...(base.notes || []),
        'NYC and Yonkers local taxes are explicitly out of scope for this staging worksheet.',
        'IT-203 nonresident allocation is simplified — escalate complex multi-state cases.',
      ],
      productionReady: false,
    },
  }
}

export function computeIlFlatWorksheet(input: StateReturnInput): StateReturnResult {
  return computeStateReturn({ ...input, stateCode: 'IL' })
}
