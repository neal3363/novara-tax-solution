/**
 * Amended return support extending isolated Form 1040-X.
 * Requires taxpayer authorization. Preserves originals. Staging only.
 */

import { computeForm1040X, type Form1040XInput, type Form1040XResult } from '../../../irs/forms/form1040x'
import type { IrsReturnInput } from '../../../irs/types'
import type { AmendedAuthorization } from '../types'
import {
  appendAmendmentAudit,
  getPreservedOriginal,
  preserveOriginalReturn,
  listAmendmentAudit,
} from './auditHistory'

export interface AmendedReturnRequest {
  tenantId: string
  taxpayerId: string
  actorId: string
  original: IrsReturnInput
  corrected: IrsReturnInput
  authorization: AmendedAuthorization
  amountPaidWithOriginal?: number
  refundReceivedOnOriginal?: number
  /** Prior-year amendment rules flag — years outside engine support are rejected */
  allowPriorYear?: boolean
}

export interface AmendedReturnResult {
  ok: boolean
  error?: string
  form1040x?: Form1040XResult
  authorizationRequired: true
  taxpayerAuthorized: boolean
  originalPreserved: boolean
  priorYearRulesApplied: boolean
  correctedThemes: {
    incomeChanged: boolean
    deductionsChanged: boolean
    creditsChanged: boolean
  }
  auditEntryCount: number
  productionReady: false
  liveFiling: false
}

function incomeFingerprint(i: IrsReturnInput): string {
  return JSON.stringify({
    wages: i.wages,
    se: i.selfEmploymentNetProfit,
    interest: i.taxableInterest,
    div: i.ordinaryDividends,
    stcg: i.shortTermCapitalGainLoss,
    ltcg: i.longTermCapitalGainLoss,
  })
}

function deductionFingerprint(i: IrsReturnInput): string {
  return JSON.stringify({
    itemized: i.itemizedDeductions,
    educator: i.educatorExpenses,
    studentLoan: i.studentLoanInterest,
  })
}

function creditFingerprint(i: IrsReturnInput): string {
  return JSON.stringify({
    deps: i.dependents,
    childcare: i.childcareExpenses,
    marketplace: i.marketplaceCoverage,
    aptc: i.aptcReceived,
  })
}

export function prepareAmendedReturn(req: AmendedReturnRequest): AmendedReturnResult {
  if (!req.authorization.taxpayerAuthorized) {
    appendAmendmentAudit({
      tenantId: req.tenantId,
      taxpayerId: req.taxpayerId,
      taxYear: req.original.taxYear,
      actorId: req.actorId,
      action: 'amendment_blocked_no_authorization',
      detail: {},
    })
    return {
      ok: false,
      error: 'taxpayer_authorization_required',
      authorizationRequired: true,
      taxpayerAuthorized: false,
      originalPreserved: Boolean(getPreservedOriginal(req.tenantId, req.taxpayerId, req.original.taxYear)),
      priorYearRulesApplied: false,
      correctedThemes: { incomeChanged: false, deductionsChanged: false, creditsChanged: false },
      auditEntryCount: listAmendmentAudit(req.tenantId, req.taxpayerId, req.original.taxYear).length,
      productionReady: false,
      liveFiling: false,
    }
  }

  if (req.original.taxYear !== req.corrected.taxYear) {
    return {
      ok: false,
      error: 'tax_year_mismatch',
      authorizationRequired: true,
      taxpayerAuthorized: true,
      originalPreserved: false,
      priorYearRulesApplied: false,
      correctedThemes: { incomeChanged: false, deductionsChanged: false, creditsChanged: false },
      auditEntryCount: 0,
      productionReady: false,
      liveFiling: false,
    }
  }

  const year = req.original.taxYear
  const priorYearRulesApplied = year < 2025
  if (year < 2022 || year > 2025) {
    appendAmendmentAudit({
      tenantId: req.tenantId,
      taxpayerId: req.taxpayerId,
      taxYear: year,
      actorId: req.actorId,
      action: 'amendment_unsupported_year',
      detail: { year },
    })
    return {
      ok: false,
      error: 'unsupported_amendment_year',
      authorizationRequired: true,
      taxpayerAuthorized: true,
      originalPreserved: false,
      priorYearRulesApplied,
      correctedThemes: { incomeChanged: false, deductionsChanged: false, creditsChanged: false },
      auditEntryCount: listAmendmentAudit(req.tenantId, req.taxpayerId, year).length,
      productionReady: false,
      liveFiling: false,
    }
  }

  preserveOriginalReturn({
    tenantId: req.tenantId,
    taxpayerId: req.taxpayerId,
    taxYear: year,
    originalInput: req.original,
    actorId: req.actorId,
  })

  const input: Form1040XInput = {
    original: req.original,
    corrected: req.corrected,
    amountPaidWithOriginal: req.amountPaidWithOriginal,
    refundReceivedOnOriginal: req.refundReceivedOnOriginal,
  }
  const form1040x = computeForm1040X(input)

  const correctedThemes = {
    incomeChanged: incomeFingerprint(req.original) !== incomeFingerprint(req.corrected),
    deductionsChanged: deductionFingerprint(req.original) !== deductionFingerprint(req.corrected),
    creditsChanged: creditFingerprint(req.original) !== creditFingerprint(req.corrected),
  }

  appendAmendmentAudit({
    tenantId: req.tenantId,
    taxpayerId: req.taxpayerId,
    taxYear: year,
    actorId: req.actorId,
    action: 'amendment_computed',
    detail: {
      netRefundOrBalanceChange: form1040x.netRefundOrBalanceChange,
      correctedThemes,
      authorizationMethod: req.authorization.method ?? 'staging_synthetic',
      priorYearRulesApplied,
    },
  })

  return {
    ok: true,
    form1040x,
    authorizationRequired: true,
    taxpayerAuthorized: true,
    originalPreserved: true,
    priorYearRulesApplied,
    correctedThemes,
    auditEntryCount: listAmendmentAudit(req.tenantId, req.taxpayerId, year).length,
    productionReady: false,
    liveFiling: false,
  }
}
