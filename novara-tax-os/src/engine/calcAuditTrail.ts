/**
 * Deterministic calculation audit trail.
 * LLM never invents final tax amounts — this trail is built only from engine outputs.
 */

import type { OptimizationReport, TaxpayerProfile } from './benefitOptimizer'
import { BENEFIT_RULE_VERSION } from '../data/benefitsCatalog'

export interface CalcTrailEntry {
  id: string
  at: string
  taxYear: number
  ruleVersion: string
  inputSummary: string
  applicableRule: string
  calculation: string
  formLine: string
  amount: number
  source: 'base_refund' | 'benefit' | 'withholding' | 'income'
}

export interface CalcAuditTrail {
  taxYear: number
  ruleVersion: string
  generatedAt: string
  entries: CalcTrailEntry[]
  totalRefundOrBalance: number
  productionReady: boolean
  note: string
}

export function buildCalcAuditTrail(
  profile: TaxpayerProfile,
  report: OptimizationReport,
  now = new Date(),
): CalcAuditTrail {
  const at = now.toISOString()
  const entries: CalcTrailEntry[] = []
  let n = 0
  const push = (e: Omit<CalcTrailEntry, 'id' | 'at' | 'taxYear' | 'ruleVersion'>) => {
    n += 1
    entries.push({
      id: `trail-${n}`,
      at,
      taxYear: profile.taxYear,
      ruleVersion: report.ruleVersion || BENEFIT_RULE_VERSION,
      ...e,
    })
  }

  push({
    inputSummary: `Wages ${profile.wages}; SE ${profile.selfEmploymentIncome}; FS ${profile.filingStatus}`,
    applicableRule: `TY${profile.taxYear} base refund estimate (withholding vs tentative tax)`,
    calculation: 'withholding_and_base_tax_net',
    formLine: 'Form 1040 · refund/balance precursor',
    amount: report.baseRefund,
    source: 'base_refund',
  })

  push({
    inputSummary: `Federal withholding ${profile.withholding}`,
    applicableRule: 'Withholding credit',
    calculation: 'sum_box2_and_estimated_payments',
    formLine: 'Form 1040 · Line 25a (fed withholding)',
    amount: profile.withholding,
    source: 'withholding',
  })

  push({
    inputSummary: `W-2 wages ${profile.wages}`,
    applicableRule: 'Gross wages inclusion',
    calculation: 'sum_w2_box1',
    formLine: 'Form 1040 · Line 1a',
    amount: profile.wages,
    source: 'income',
  })

  if (profile.selfEmploymentIncome > 0) {
    push({
      inputSummary: `SE receipts ${profile.selfEmploymentIncome}`,
      applicableRule: 'Schedule C gross receipts / SE tax inputs',
      calculation: 'se_gross_receipts',
      formLine: 'Schedule C · Gross receipts',
      amount: profile.selfEmploymentIncome,
      source: 'income',
    })
  }

  report.findings
    .filter((f) => f.affectingRefund > 0 && (f.status === 'applied' || f.status === 'pending_verification'))
    .forEach((f) => {
      push({
        inputSummary: f.explanation.slice(0, 160),
        applicableRule: `${f.ruleCitation} · ${f.ruleVersion}`,
        calculation: `${f.ruleId}_allowable_amount`,
        formLine: f.form && f.field ? `${f.form} · ${f.field}` : f.form ?? f.shortName,
        amount: f.affectingRefund,
        source: 'benefit',
      })
    })

  const productionReady = report.auditComplete && !report.refundIncomplete && report.blockers.length === 0

  return {
    taxYear: profile.taxYear,
    ruleVersion: report.ruleVersion || BENEFIT_RULE_VERSION,
    generatedAt: at,
    entries,
    totalRefundOrBalance: report.projectedRefund,
    productionReady,
    note: productionReady
      ? 'Trail complete for verified inputs — still subject to QA and e-file provider confirmation.'
      : 'Trail is preliminary until blockers and incomplete refund items are resolved. Not production-ready for filing.',
  }
}
