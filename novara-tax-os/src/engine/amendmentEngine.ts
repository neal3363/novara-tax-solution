/**
 * Original vs amended return support — preserves original amounts, diffs corrections,
 * evaluates refund claim windows and filing method.
 */

import { getTaxYearDefinition, resolveFilingSeason } from './taxYearCatalog'

export type FilingMode = 'original' | 'amended'

export interface OriginalReturnSnapshot {
  taxYear: number
  agiReported: number
  taxReported: number
  refundOrBalanceReported: number
  filedOn?: string
  source: 'uploaded_return' | 'transcript' | 'taxpayer_recall'
}

export interface AmendmentChange {
  field: string
  originalAmount: number
  correctedAmount: number
  difference: number
  explanation: string
}

export interface AmendmentAssessment {
  taxYear: number
  mode: FilingMode
  changes: AmendmentChange[]
  netTaxDifference: number
  amendedForm: '1040-X' | '1120-X' | '1065' | 'none'
  explanationRequired: boolean
  refundClaimOpen: boolean
  refundClaimDeadline?: string
  refundClaimWarning?: string
  filingMethod: 'efile' | 'paper' | 'unavailable'
  filingMethodNote: string
  stillMustFile: boolean
}

/** 3-year refund statute demo rule from original due date / filed date */
export function refundClaimDeadline(taxYear: number, filedOn?: string): Date {
  if (filedOn) {
    const filed = new Date(filedOn)
    const d = new Date(filed)
    d.setUTCFullYear(d.getUTCFullYear() + 3)
    return d
  }
  // Default: 3 years from original due date April 15 of taxYear+1
  return new Date(Date.UTC(taxYear + 1 + 3, 3, 15))
}

export function assessAmendment(input: {
  taxYear: number
  mode: FilingMode
  isBusiness: boolean
  original?: OriginalReturnSnapshot
  corrections?: { field: string; correctedAmount: number; explanation: string }[]
  asOf?: Date
}): AmendmentAssessment {
  const asOf = input.asOf ?? new Date()
  const def = getTaxYearDefinition(input.taxYear, resolveFilingSeason(asOf))
  const original = input.original
  const changes: AmendmentChange[] = (input.corrections ?? []).map((c) => {
    const originalAmount =
      c.field === 'agi'
        ? original?.agiReported ?? 0
        : c.field === 'tax'
          ? original?.taxReported ?? 0
          : c.field === 'refund'
            ? original?.refundOrBalanceReported ?? 0
            : 0
    return {
      field: c.field,
      originalAmount,
      correctedAmount: c.correctedAmount,
      difference: c.correctedAmount - originalAmount,
      explanation: c.explanation,
    }
  })

  const netTaxDifference = changes
    .filter((c) => c.field === 'tax' || c.field === 'refund')
    .reduce((s, c) => s + (c.field === 'tax' ? c.difference : -c.difference), 0)

  const deadline = refundClaimDeadline(input.taxYear, original?.filedOn)
  const refundClaimOpen = asOf.getTime() <= deadline.getTime()
  const wantsRefund = netTaxDifference < 0 || changes.some((c) => c.field === 'refund' && c.difference > 0)

  let filingMethod: AmendmentAssessment['filingMethod'] = 'paper'
  let filingMethodNote = 'Paper filing instructions will be generated.'
  if (input.mode === 'original') {
    if (def?.supportsEfileOriginal) {
      filingMethod = 'efile'
      filingMethodNote = 'Electronic filing supported for this original return year.'
    } else if (def?.supportsPaper) {
      filingMethod = 'paper'
      filingMethodNote = 'E-file not supported for this year — paper filing required.'
    } else {
      filingMethod = 'unavailable'
      filingMethodNote = 'This tax year is not available for production filing.'
    }
  } else {
    if (def?.supportsEfileAmended) {
      filingMethod = 'efile'
      filingMethodNote = 'Amended e-file supported for this year when the IRS channel is open.'
    } else if (def?.supportsPaper) {
      filingMethod = 'paper'
      filingMethodNote = 'Amended returns for this year generally require Form 1040-X on paper.'
    } else {
      filingMethod = 'unavailable'
      filingMethodNote = 'Amendment filing not available for this year in NOVARA yet.'
    }
  }

  return {
    taxYear: input.taxYear,
    mode: input.mode,
    changes,
    netTaxDifference,
    amendedForm: input.mode === 'amended' ? (input.isBusiness ? '1120-X' : '1040-X') : 'none',
    explanationRequired: input.mode === 'amended' && changes.length > 0,
    refundClaimOpen,
    refundClaimDeadline: deadline.toISOString().slice(0, 10),
    refundClaimWarning:
      wantsRefund && !refundClaimOpen
        ? 'Refund claim may be time-barred. NOVARA does not promise refunds for expired years.'
        : !refundClaimOpen && input.mode === 'original'
          ? 'A refund may be unavailable, but an older return may still need to be filed.'
          : undefined,
    filingMethod,
    filingMethodNote,
    stillMustFile: input.mode === 'original' || changes.length > 0,
  }
}
