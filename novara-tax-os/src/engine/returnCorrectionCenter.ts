/**
 * Return Correction & Amendment Center — additive workspace.
 * Calls into amendmentEngine; never silently overwrites an accepted return.
 */

import type { TaxReturn } from '../data/types'
import {
  assessAmendment,
  type AmendmentAssessment,
  type OriginalReturnSnapshot,
} from './amendmentEngine'
import { buildRefundTrackingSnapshot } from './refundTracking'
import type { RefundDeliverySelection } from './refundDelivery'
import type { BankProductApplication } from './bankProducts'

export type RejectionCodeInfo = {
  code: string
  title: string
  explanation: string
  typicalFix: string
}

/** Common IRS reject codes — educational sandbox explanations only. */
export const IRS_REJECTION_CODES: RejectionCodeInfo[] = [
  {
    code: 'R0000-500-01',
    title: 'TIN / name mismatch',
    explanation: 'The taxpayer identification number and name combination did not match IRS records.',
    typicalFix: 'Verify SSN/ITIN and legal name; correct and resubmit after reauthorization.',
  },
  {
    code: 'R0000-504-02',
    title: 'Duplicate return',
    explanation: 'A return for this TIN and tax year was already accepted.',
    typicalFix: 'Use Form 1040-X amendment workflow — do not overwrite the accepted original.',
  },
  {
    code: 'IND-181-01',
    title: 'Dependent TIN issue',
    explanation: 'A dependent TIN failed validation or was claimed on another return.',
    typicalFix: 'Review dependent identity documents and due-diligence answers, then correct.',
  },
  {
    code: 'F1040-525',
    title: 'Withholding / income inconsistency',
    explanation: 'Reported withholding or income does not align with expected document totals.',
    typicalFix: 'Reconcile W-2/1099 amounts; upload corrected forms if the payer issued corrections.',
  },
]

export interface ReturnVersionEntry {
  versionId: string
  contentHash: string
  label: string
  at: string
  projectedRefund: number
  preserved: boolean
}

export interface CorrectionCenterReport {
  canEnterCorrection: boolean
  rejectionReason?: string
  rejectionCodes: RejectionCodeInfo[]
  amendment: AmendmentAssessment | null
  versions: ReturnVersionEntry[]
  changeLog: string[]
  reauthorizationRequired: boolean
  aiExplanation: string
  preserveOriginalNote: string
}

export function explainRejection(reason?: string): RejectionCodeInfo[] {
  if (!reason) return []
  const upper = reason.toUpperCase()
  const matched = IRS_REJECTION_CODES.filter(
    (c) => upper.includes(c.code) || upper.includes(c.title.split(' ')[0].toUpperCase()),
  )
  if (matched.length) return matched
  return [
    {
      code: 'GENERAL',
      title: 'IRS rejection (sandbox)',
      explanation: reason,
      typicalFix: 'Open the questionnaire, correct the flagged items, obtain reauthorization, and resubmit.',
    },
  ]
}

export function buildCorrectionCenterReport(input: {
  taxReturn?: TaxReturn | null
  verifiedRefund: number
  delivery: RefundDeliverySelection | null
  bankApp: BankProductApplication | null
  original?: OriginalReturnSnapshot
  corrections?: { field: string; correctedAmount: number; explanation: string }[]
  lockedVersion?: { versionId: string; contentHash: string; lockedAt: string; projectedRefund: number } | null
  priorVersions?: ReturnVersionEntry[]
  isBusiness?: boolean
}): CorrectionCenterReport {
  const snap = buildRefundTrackingSnapshot({
    taxReturn: input.taxReturn,
    verifiedRefund: input.verifiedRefund,
    delivery: input.delivery,
    bankApp: input.bankApp,
  })
  const taxYear = input.taxReturn?.taxYear ?? input.original?.taxYear ?? new Date().getUTCFullYear() - 1
  const amendment =
    input.taxReturn?.filingMode === 'amended' || (input.corrections && input.corrections.length > 0)
      ? assessAmendment({
          taxYear,
          mode: 'amended',
          isBusiness: Boolean(input.isBusiness),
          original: input.original,
          corrections: input.corrections,
        })
      : input.taxReturn?.state === 'Rejected'
        ? assessAmendment({
            taxYear,
            mode: 'amended',
            isBusiness: Boolean(input.isBusiness),
            original: input.original ?? {
              taxYear,
              agiReported: 0,
              taxReported: 0,
              refundOrBalanceReported: input.verifiedRefund,
              source: 'taxpayer_recall',
            },
            corrections: input.corrections ?? [],
          })
        : null

  const versions: ReturnVersionEntry[] = [...(input.priorVersions ?? [])]
  if (input.lockedVersion) {
    versions.unshift({
      versionId: input.lockedVersion.versionId,
      contentHash: input.lockedVersion.contentHash,
      label: 'Current locked version',
      at: input.lockedVersion.lockedAt,
      projectedRefund: input.lockedVersion.projectedRefund,
      preserved: true,
    })
  }
  if (input.taxReturn?.state === 'Accepted' || input.taxReturn?.state === 'Rejected') {
    const exists = versions.some((v) => v.label.includes('Filed'))
    if (!exists) {
      versions.push({
        versionId: `filed-${input.taxReturn.id}`,
        contentHash: 'preserved-original',
        label: `Original filed return (${input.taxReturn.state})`,
        at: input.taxReturn.updatedAt,
        projectedRefund: input.taxReturn.refundOrOwe,
        preserved: true,
      })
    }
  }

  const changeLog: string[] = []
  if (amendment) {
    for (const c of amendment.changes) {
      changeLog.push(
        `${c.field}: ${c.originalAmount} → ${c.correctedAmount} (Δ ${c.difference}) — ${c.explanation}`,
      )
    }
    if (!amendment.changes.length) {
      changeLog.push('No field corrections recorded yet — compare documents and interview answers.')
    }
  }
  if (snap.rejectionReason) {
    changeLog.unshift(`Rejection: ${snap.rejectionReason}`)
  }

  const reauthorizationRequired =
    Boolean(snap.canCorrect) || Boolean(amendment) || versions.some((v) => v.preserved)

  const aiExplanation = amendment
    ? amendment.changes.length
      ? `Changes affect tax by ${amendment.netTaxDifference}. Use ${amendment.amendedForm}. ${amendment.filingMethodNote}`
      : 'Amendment workspace ready — identify what changed versus the original filed amounts.'
    : snap.canCorrect
      ? 'Rejected return can be corrected. Preserve the original filing record; collect signatures again before resubmit.'
      : 'No active rejection or amendment in progress.'

  return {
    canEnterCorrection: Boolean(snap.canCorrect || amendment),
    rejectionReason: snap.rejectionReason ?? undefined,
    rejectionCodes: explainRejection(snap.rejectionReason ?? undefined),
    amendment,
    versions,
    changeLog,
    reauthorizationRequired,
    aiExplanation,
    preserveOriginalNote:
      'Accepted and previously filed returns are preserved. Corrections create a new version — never silently overwrite.',
  }
}
