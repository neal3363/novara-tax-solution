/**
 * Mandatory pre-filing quality assurance.
 * Critical findings block filing. Review Required needs attention.
 * Informational does not block. Rerun after corrections.
 */

import type { DocumentRecord, TaxReturn } from '../data/types'
import type { TaxpayerProfile } from './benefitOptimizer'
import { runBenefitOptimization } from './benefitOptimizer'
import { dependentsReadyForVerifiedCredits } from './dependentsEngine'
import { buildDocumentChecklist } from './documentChecklist'

export type QaSeverity = 'critical' | 'review_required' | 'informational'

export interface QaFinding {
  id: string
  severity: QaSeverity
  code: string
  title: string
  explanation: string
  action: string
}

export interface QaReport {
  taxYear: number
  checkedAt: string
  findings: QaFinding[]
  criticalCount: number
  reviewCount: number
  informationalCount: number
  canFile: boolean
  summary: string
}

export function runPreFilingQa(input: {
  profile: TaxpayerProfile
  documents: DocumentRecord[]
  taxReturn?: TaxReturn | null
  benefitReviewSigned?: boolean
  authorizedToFile?: boolean
}): QaReport {
  const findings: QaFinding[] = []
  const { profile, documents } = input
  const report = runBenefitOptimization(profile)
  const checklist = buildDocumentChecklist(profile, documents)
  const yearDocs = documents.filter((d) => d.taxYear === profile.taxYear)

  const push = (f: Omit<QaFinding, 'id'> & { id?: string }) => {
    findings.push({ id: f.id ?? `qa-${findings.length + 1}`, ...f })
  }

  // Missing W-2 when wages claimed
  if (profile.wages > 0 && !yearDocs.some((d) => d.type === 'W-2')) {
    push({
      severity: 'critical',
      code: 'MISSING_W2',
      title: 'Missing W-2',
      explanation: 'Wages are on the return but no W-2 was uploaded for this tax year.',
      action: 'Upload each employer W-2 or correct wage amounts.',
    })
  }

  // Missing 1099-NEC when SE income
  if (profile.selfEmploymentIncome > 0 && !yearDocs.some((d) => d.type === '1099-NEC' || d.type === 'P&L')) {
    push({
      severity: 'review_required',
      code: 'MISSING_SE_SUPPORT',
      title: 'Self-employment support missing',
      explanation: 'Self-employment income is present without a 1099-NEC or business P&L.',
      action: 'Upload 1099-NEC, P&L, or confirm income source.',
    })
  }

  // Duplicate income docs
  const w2names = yearDocs.filter((d) => d.type === 'W-2').map((d) => d.name.toLowerCase())
  if (new Set(w2names).size < w2names.length) {
    push({
      severity: 'review_required',
      code: 'DUPLICATE_W2',
      title: 'Possible duplicate W-2',
      explanation: 'More than one W-2 file shares the same name.',
      action: 'Remove duplicates so income is not double-counted.',
    })
  }

  // Duplicate dependents
  const depNames = profile.dependents.map((d) => d.fullLegalName.toLowerCase().trim()).filter(Boolean)
  if (new Set(depNames).size < depNames.length) {
    push({
      severity: 'critical',
      code: 'DUPLICATE_DEPENDENT',
      title: 'Duplicate dependents',
      explanation: 'Two dependents share the same name on this return.',
      action: 'Remove or rename duplicate dependent records.',
    })
  }

  // TIN issues
  profile.dependents.forEach((d, i) => {
    if (d.tinStatus === 'missing') {
      push({
        severity: 'critical',
        code: `DEP_TIN_MISSING_${i}`,
        title: `Missing tax ID for ${d.fullLegalName || 'dependent'}`,
        explanation: 'A dependent on the return has no SSN/ITIN on file.',
        action: 'Provide the dependent’s tax ID (stored masked) before filing.',
      })
    }
  })

  // Filing status
  if (profile.filingStatus === 'unknown') {
    push({
      severity: 'critical',
      code: 'FILING_STATUS_UNKNOWN',
      title: 'Filing status not established',
      explanation: 'The return cannot be filed without a confirmed filing status.',
      action: 'Complete filing-status questions.',
    })
  }

  // Dependent credits without complete interview
  if (!dependentsReadyForVerifiedCredits(profile.answers, profile.dependents) && profile.dependents.length > 0) {
    push({
      severity: 'critical',
      code: 'DEPENDENT_INTERVIEW_INCOMPLETE',
      title: 'Dependent verification incomplete',
      explanation: 'Dependent credits cannot be claimed until discovery and interviews are complete.',
      action: 'Finish the dependent interview or remove incomplete dependents.',
    })
  }

  // Unsupported / unverified benefits affecting refund
  report.findings.forEach((f) => {
    if (f.status === 'eligible_unverified' && f.affectingRefund > 0) {
      push({
        severity: 'critical',
        code: `UNVERIFIED_BENEFIT_${f.ruleId}`,
        title: `Unverified benefit affecting refund: ${f.shortName}`,
        explanation: f.explanation,
        action: 'Verify documents/answers or remove the unverified amount before filing.',
      })
    }
    if (f.status === 'needs_info' && (f.missingAnswers.length || f.missingDocs.length)) {
      push({
        severity: 'review_required',
        code: `BENEFIT_NEEDS_INFO_${f.ruleId}`,
        title: `${f.shortName} needs more information`,
        explanation: `Missing: ${[...f.missingAnswers, ...f.missingDocs].join(', ') || 'details'}`,
        action: 'Answer remaining questions or upload supporting documents.',
      })
    }
  })

  // Required checklist docs
  checklist
    .filter((c) => c.requiredForFiling && c.status === 'needed')
    .forEach((c) => {
      push({
        severity: 'critical',
        code: `DOC_NEEDED_${c.id}`,
        title: `Missing required document: ${c.name}`,
        explanation: c.reason,
        action: 'Upload the required document or resolve the related benefit.',
      })
    })

  // Business schedule
  if (input.taxReturn?.isBusiness && input.taxReturn.returnType === '1120-S' && profile.selfEmploymentIncome === 0) {
    push({
      severity: 'informational',
      code: 'BUSINESS_INCOME_CHECK',
      title: 'Business return income check',
      explanation: 'Business return selected; confirm business income schedules are complete.',
      action: 'Review business income and expense entries.',
    })
  }

  // Wrong year forms
  if (input.taxReturn && input.taxReturn.taxYear !== profile.taxYear) {
    push({
      severity: 'critical',
      code: 'TAX_YEAR_MISMATCH',
      title: 'Tax year mismatch',
      explanation: `Return year ${input.taxReturn.taxYear} does not match profile year ${profile.taxYear}.`,
      action: 'Align the active tax year before filing.',
    })
  }

  // Authorizations
  if (!input.benefitReviewSigned) {
    push({
      severity: 'critical',
      code: 'BENEFIT_REVIEW_UNSIGNED',
      title: 'Benefit review not completed',
      explanation: 'Mandatory tax-benefit audit / review has not been signed off.',
      action: 'Complete the benefit review before authorizing filing.',
    })
  }
  if (!input.authorizedToFile) {
    push({
      severity: 'critical',
      code: 'NO_FILING_AUTHORIZATION',
      title: 'Filing authorization missing',
      explanation: 'Taxpayer has not approved electronic filing.',
      action: 'Obtain required taxpayer authorization and signature.',
    })
  }

  // Calculation blockers from engine
  report.blockers.forEach((b, i) => {
    push({
      severity: 'critical',
      code: `ENGINE_BLOCKER_${i}`,
      title: 'Calculation blocker',
      explanation: b,
      action: 'Resolve the listed issue and recalculate.',
    })
  })

  if (report.refundIncomplete) {
    push({
      severity: 'critical',
      code: 'REFUND_INCOMPLETE',
      title: 'Refund estimate incomplete',
      explanation: report.refundIncompleteReason ?? 'Refund not ready for verified presentation.',
      action: 'Complete dependent/income verification before treating the refund as final.',
    })
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const reviewCount = findings.filter((f) => f.severity === 'review_required').length
  const informationalCount = findings.filter((f) => f.severity === 'informational').length
  const canFile = criticalCount === 0

  return {
    taxYear: profile.taxYear,
    checkedAt: new Date().toISOString(),
    findings,
    criticalCount,
    reviewCount,
    informationalCount,
    canFile,
    summary: canFile
      ? `QA passed with ${reviewCount} review item(s) and ${informationalCount} note(s).`
      : `Filing blocked: ${criticalCount} critical issue(s) must be resolved.`,
  }
}
