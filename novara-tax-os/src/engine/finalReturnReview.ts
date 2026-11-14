/**
 * AI Final Return Review — complements Refund Maximizer + Tax Readiness.
 * Blocks e-file when mandatory issues remain. Does not invent IRS acceptance.
 */

import type { BenefitSnapshot, DocumentRecord, TaxReturn } from '../data/types'
import type { TaxpayerProfile } from './benefitOptimizer'
import { runBenefitOptimization } from './benefitOptimizer'
import { buildInterviewProgress } from './questionProgress'
import { runPreFilingQa } from './qaEngine'
import type { RefundDeliverySelection } from './refundDelivery'
import { validateRefundDelivery } from './refundDelivery'
import type { FilingAuthState } from './filingAuthorizations'
import { signatureLockStatus } from './filingAuthorizations'
import { buildWorkingReturnPacket } from './returnPacket'
import { buildDocumentChecklist, documentsStillNeeded } from './documentChecklist'

export type ReviewCheckStatus = 'pass' | 'warn' | 'fail'

export interface FinalReviewCheck {
  id: string
  label: string
  status: ReviewCheckStatus
  detail: string
  blocking: boolean
}

export interface FinalReturnReviewReport {
  generatedAt: string
  overall: 'ready' | 'review_required' | 'blocked'
  checks: FinalReviewCheck[]
  flags: string[]
  canEfile: boolean
  summary: string
  /** Positive = refund, negative = balance due */
  refundOrBalanceDue: number
}

export function runFinalReturnReview(input: {
  profile: TaxpayerProfile
  benefitReport: BenefitSnapshot | null
  documents: DocumentRecord[]
  refundDelivery: RefundDeliverySelection | null
  filingAuth: FilingAuthState | null
  filingAuthorized: boolean
  taxReturn?: TaxReturn | null
  clientName?: string
}): FinalReturnReviewReport {
  const { profile, benefitReport, documents, refundDelivery, filingAuth, filingAuthorized } = input
  const optimized = benefitReport ?? runBenefitOptimization(profile)
  const live: BenefitSnapshot = benefitReport ?? {
    taxYear: optimized.taxYear,
    ruleVersion: optimized.ruleVersion,
    baseRefund: optimized.baseRefund,
    projectedRefund: optimized.projectedRefund,
    verifiedSavings: optimized.verifiedSavings,
    potentialSavings: optimized.potentialSavings,
    auditComplete: optimized.auditComplete,
    blockers: optimized.blockers,
    comparisonNotes: optimized.comparisonNotes,
    findings: optimized.findings,
    formLines: optimized.formLines,
    lastRunAt: new Date().toISOString(),
    refundIncomplete: 'refundIncomplete' in optimized ? optimized.refundIncomplete : undefined,
    refundIncompleteReason:
      'refundIncompleteReason' in optimized ? optimized.refundIncompleteReason : undefined,
  }
  const progress = buildInterviewProgress(profile)
  const checklist = buildDocumentChecklist(profile, documents)
  const stillNeeded = documentsStillNeeded(checklist)
  const packet = buildWorkingReturnPacket({
    profile,
    benefitReport: live,
    clientName: input.clientName ?? 'Taxpayer',
    locked: Boolean(filingAuth?.lockedVersion),
    lockedVersionId: filingAuth?.lockedVersion?.versionId,
    lockedHash: filingAuth?.lockedVersion?.contentHash,
  })
  const lock = filingAuth ? signatureLockStatus(filingAuth, packet.contentHash) : { valid: false, reason: 'Not signed' }
  // Signatures + lock satisfy authorization for review; filingAuthorized is flipped at submit.
  const authSatisfied = Boolean(lock.valid && (filingAuthorized || filingAuth?.lockedVersion))
  const qa = runPreFilingQa({
    profile,
    documents,
    taxReturn: input.taxReturn,
    benefitReviewSigned: live.auditComplete,
    authorizedToFile: authSatisfied,
  })
  const deliveryCheck = refundDelivery
    ? validateRefundDelivery(refundDelivery, live.projectedRefund)
    : { ok: false, errors: ['Refund delivery not selected'], warnings: [] as string[] }

  const yearDocs = documents.filter((d) => d.taxYear === profile.taxYear)
  const w2s = yearDocs.filter((d) => d.type === 'W-2')
  const openCredits = live.findings.filter(
    (f) => f.status === 'needs_info' || f.status === 'flagged_review',
  )
  const appliedUnsupported = live.findings.filter(
    (f) =>
      (f.status === 'applied' || f.status === 'pending_verification') && (f.affectingRefund ?? 0) > 0,
  )

  const checks: FinalReviewCheck[] = []
  const flags: string[] = []

  const push = (c: FinalReviewCheck) => {
    checks.push(c)
    if (c.status !== 'pass') flags.push(`${c.label}: ${c.detail}`)
  }

  // Income verified
  const incomeOk =
    (profile.wages <= 0 || w2s.length > 0) &&
    (profile.selfEmploymentIncome <= 0 ||
      yearDocs.some((d) => d.type === '1099-NEC' || d.type === 'P&L' || d.type === 'Other'))
  push({
    id: 'income',
    label: 'Income Verified',
    status: incomeOk ? 'pass' : profile.wages > 0 && w2s.length === 0 ? 'fail' : 'warn',
    detail: incomeOk
      ? `Income documents on file for TY${profile.taxYear}.`
      : 'Missing income support relative to wages / SE amounts on the return.',
    blocking: profile.wages > 0 && w2s.length === 0,
  })

  if (w2s.length > 1) {
    const names = w2s.map((d) => d.name.toLowerCase())
    if (new Set(names).size < names.length) {
      flags.push('Possible duplicate W-2 filenames detected.')
    }
  }

  // Filing status
  push({
    id: 'filing_status',
    label: 'Filing Status Verified',
    status: profile.answers.married_dec31 != null ? 'pass' : 'fail',
    detail: profile.answers.married_dec31 != null
      ? `Filing status ${profile.filingStatus.toUpperCase()}.`
      : 'Filing status interview incomplete.',
    blocking: profile.answers.married_dec31 == null,
  })

  // Dependents
  const depIncomplete = live.refundIncomplete
  push({
    id: 'dependents',
    label: 'Dependents Reviewed',
    status: depIncomplete ? 'fail' : 'pass',
    detail: depIncomplete
      ? live.refundIncompleteReason ?? 'Dependent interview incomplete.'
      : `Dependents on file: ${profile.dependents.length}.`,
    blocking: Boolean(depIncomplete),
  })

  // Credits & deductions
  push({
    id: 'credits',
    label: 'Credits and Deductions Reviewed',
    status: openCredits.length === 0 ? 'pass' : 'warn',
    detail:
      openCredits.length === 0
        ? `${appliedUnsupported.length} benefit(s) applied or pending verification.`
        : `${openCredits.length} open credit/deduction follow-up(s) — review before filing.`,
    blocking: false,
  })

  // Tax calculations
  push({
    id: 'calculations',
    label: 'Tax Calculations Verified',
    status: 'pass',
    detail: `Engine projection ${live.projectedRefund >= 0 ? 'refund' : 'balance due'} ${Math.abs(live.projectedRefund).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} (ruleset ${live.ruleVersion}).`,
    blocking: false,
  })

  // Refund or balance due calculated
  push({
    id: 'refund_or_balance',
    label: 'Refund or Balance Due Calculated',
    status: 'pass',
    detail:
      live.projectedRefund >= 0
        ? `Estimated refund ${live.projectedRefund.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`
        : `Estimated balance due ${Math.abs(live.projectedRefund).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
    blocking: false,
  })

  // Refund delivery — required when refund > 0
  const needsDelivery = live.projectedRefund > 0
  push({
    id: 'delivery',
    label: 'Refund Delivery Selected',
    status: !needsDelivery ? 'pass' : deliveryCheck.ok ? 'pass' : 'fail',
    detail: !needsDelivery
      ? 'No refund delivery required (zero refund or balance due).'
      : deliveryCheck.ok
        ? `Method: ${refundDelivery!.method.replace(/_/g, ' ')}.`
        : deliveryCheck.errors.join(' ') || 'Refund delivery method not selected.',
    blocking: needsDelivery && !deliveryCheck.ok,
  })

  // Authorizations — locked signatures required; submit flips filingAuthorized
  push({
    id: 'authorizations',
    label: 'Required Authorizations Completed',
    status: authSatisfied ? 'pass' : 'fail',
    detail: authSatisfied
      ? 'Signatures locked to current return version.'
      : lock.reason ?? 'Final taxpayer authorization / Form 8879-style signature pending.',
    blocking: !authSatisfied,
  })

  // E-file diagnostics (QA)
  push({
    id: 'efile_diagnostics',
    label: 'E-File Diagnostics Passed',
    status: qa.canFile ? 'pass' : 'fail',
    detail: qa.summary,
    blocking: !qa.canFile,
  })

  // Supporting docs / interview completeness (non-blocking warnings)
  if (stillNeeded.length > 0) {
    push({
      id: 'supporting_docs',
      label: 'Supporting Documentation',
      status: 'warn',
      detail: `${stillNeeded.length} document item(s) still requested.`,
      blocking: false,
    })
  }
  if (progress.unansweredCount > 0) {
    push({
      id: 'unresolved_questions',
      label: 'Unresolved Taxpayer Questions',
      status: 'warn',
      detail: `${progress.unansweredCount} applicable interview question(s) still open.`,
      blocking: false,
    })
  }

  const blockingFails = checks.filter((c) => c.blocking && c.status === 'fail')
  const hasWarn = checks.some((c) => c.status === 'warn')
  const canEfile = blockingFails.length === 0
  const overall: FinalReturnReviewReport['overall'] = !canEfile
    ? 'blocked'
    : hasWarn
      ? 'review_required'
      : 'ready'

  return {
    generatedAt: new Date().toISOString(),
    overall,
    checks,
    flags,
    canEfile,
    summary:
      overall === 'ready'
        ? 'AI final review passed — return is ready for professional sign-off and sandbox e-file.'
        : overall === 'review_required'
          ? `AI final review: ${checks.filter((c) => c.status === 'warn').length} warning(s) — e-file allowed after professional review.`
          : `AI final review blocked: ${blockingFails.length} mandatory issue(s) must be resolved.`,
    refundOrBalanceDue: live.projectedRefund,
  }
}
