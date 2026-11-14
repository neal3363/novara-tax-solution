/**
 * AI Tax Preparation Completion Score — readiness for review/filing.
 * Complements the Refund Maximizer; does not invent IRS status.
 */

import type { BenefitSnapshot, DocumentRecord } from '../data/types'
import type { TaxpayerProfile } from './benefitOptimizer'
import { buildInterviewProgress } from './questionProgress'
import { runPreFilingQa } from './qaEngine'
import type { RefundDeliverySelection } from './refundDelivery'
import { validateRefundDelivery } from './refundDelivery'
import type { FilingAuthState } from './filingAuthorizations'
import { signatureLockStatus } from './filingAuthorizations'
import { buildWorkingReturnPacket } from './returnPacket'

export type ReadinessItemStatus = 'complete' | 'attention' | 'pending' | 'blocked'

export interface ReadinessItem {
  id: string
  label: string
  status: ReadinessItemStatus
  detail: string
}

export interface TaxPreparationCompletionScore {
  percent: number
  label: string
  items: ReadinessItem[]
  readyForReview: boolean
  readyToFile: boolean
  blockers: string[]
}

export function buildTaxPreparationCompletionScore(input: {
  profile: TaxpayerProfile
  benefitReport: BenefitSnapshot | null
  documents: DocumentRecord[]
  refundDelivery: RefundDeliverySelection | null
  filingAuth: FilingAuthState | null
  filingAuthorized: boolean
  clientName?: string
  taxReturn?: import('../data/types').TaxReturn | null
}): TaxPreparationCompletionScore {
  const { profile, benefitReport, documents, refundDelivery, filingAuth, filingAuthorized } = input
  const progress = buildInterviewProgress(profile)
  const openFindings =
    benefitReport?.findings.filter(
      (f) => f.status === 'needs_info' || f.status === 'flagged_review' || f.status === 'eligible_unverified',
    ) ?? []
  const incomeDocs = documents.filter((d) => d.type === 'W-2' || d.type.startsWith('1099'))
  const incomeReviewed = incomeDocs.some((d) => d.status === 'verified' || d.status === 'extracted')

  const packet = buildWorkingReturnPacket({
    profile,
    benefitReport,
    clientName: input.clientName ?? 'Taxpayer',
    locked: Boolean(filingAuth?.lockedVersion),
    lockedVersionId: filingAuth?.lockedVersion?.versionId,
    lockedHash: filingAuth?.lockedVersion?.contentHash,
  })
  const qa = runPreFilingQa({
    profile,
    documents,
    taxReturn: input.taxReturn,
    benefitReviewSigned: benefitReport?.auditComplete,
    authorizedToFile: filingAuthorized,
  })

  const deliveryOk =
    refundDelivery != null &&
    validateRefundDelivery(refundDelivery, benefitReport?.projectedRefund ?? 0).ok

  const lockOk = filingAuth ? signatureLockStatus(filingAuth, packet.contentHash).valid : false

  const items: ReadinessItem[] = [
    {
      id: 'income_docs',
      label: 'Income documents reviewed',
      status: incomeReviewed ? 'complete' : incomeDocs.length ? 'attention' : 'pending',
      detail: incomeReviewed
        ? `${incomeDocs.length} income document(s) on file.`
        : 'Upload and review W-2 / 1099 documents.',
    },
    {
      id: 'filing_status',
      label: 'Filing status verified',
      status: profile.filingStatus && profile.answers.married_dec31 != null ? 'complete' : 'pending',
      detail: profile.filingStatus ? `Status: ${profile.filingStatus.toUpperCase()}` : 'Complete filing-status questions.',
    },
    {
      id: 'interview',
      label: 'Tax interview progress',
      status: progress.percentComplete >= 80 ? 'complete' : progress.answeredCount > 0 ? 'attention' : 'pending',
      detail: `${progress.answeredCount} of ${progress.applicableTotal} questions answered (${progress.percentComplete}%).`,
    },
    {
      id: 'credits_review',
      label: openFindings.length
        ? `${openFindings.length} potential credit(s) / deduction(s) need review`
        : 'Credits & deductions reviewed',
      status: openFindings.length === 0 ? 'complete' : 'attention',
      detail:
        openFindings.length === 0
          ? 'No open benefit follow-ups.'
          : openFindings
              .slice(0, 4)
              .map((f) => f.shortName)
              .join(', ') + (openFindings.length > 4 ? '…' : ''),
    },
    {
      id: 'refund_delivery',
      label: 'Refund delivery method',
      status: deliveryOk ? 'complete' : 'blocked',
      detail: deliveryOk
        ? `Selected: ${refundDelivery!.method.replace(/_/g, ' ')}`
        : 'Refund delivery method not selected.',
    },
    {
      id: 'authorization',
      label: 'Final authorization / Form 8879',
      status: filingAuthorized && lockOk ? 'complete' : 'pending',
      detail: filingAuthorized
        ? lockOk
          ? 'Signatures locked to current return version.'
          : 'Signatures need re-authorization after return changes.'
        : 'Final authorization pending.',
    },
    {
      id: 'qa',
      label: 'Pre-filing QA',
      status: qa.canFile ? 'complete' : 'blocked',
      detail: qa.summary,
    },
  ]

  const weights: number[] = items.map((i) => (i.status === 'complete' ? 1 : i.status === 'attention' ? 0.45 : 0))
  const percent = Math.round((weights.reduce((a, b) => a + b, 0) / items.length) * 100)
  const blockers = items
    .filter((i) => i.status === 'blocked' || i.status === 'pending')
    .map((i) => `${i.label}: ${i.detail}`)

  return {
    percent,
    label: `Tax Return Readiness — ${percent}% of required checks complete`,
    items,
    readyForReview: percent >= 50 && incomeReviewed,
    readyToFile: Boolean(qa.canFile && deliveryOk && filingAuthorized && lockOk),
    blockers,
  }
}
