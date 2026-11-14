/**
 * Feature-flagged dual-run: demo benefitOptimizer vs isolated IRS engine.
 * IRS results are for internal comparison only — never shown to taxpayers
 * until migration is approved.
 */

import { runBenefitOptimization, type TaxpayerProfile } from '../benefitOptimizer'
import { compareDemoToIrs, profileToIrsInput } from './compareDemo'
import { computeIrsFederalReturn } from './federalReturn'
import type { IrsReturnResult } from './types'

export type DualRunAudience = 'internal_only' | 'taxpayer_visible'

/** Default OFF — IRS path hidden from taxpayer UI. */
export interface DualRunFlag {
  enabled: boolean
  /** Must remain internal_only until cutover approval */
  audience: DualRunAudience
  /** Include line-item diffs in report */
  verbose: boolean
}

export const DEFAULT_DUAL_RUN_FLAG: DualRunFlag = {
  enabled: false,
  audience: 'internal_only',
  verbose: true,
}

export interface DualRunLineDiff {
  field: string
  demo: number | string | null
  irs: number | string | null
  delta: number | null
}

export interface DualRunReport {
  flag: DualRunFlag
  taxpayerVisible: false
  label: string
  taxYear: number
  demo: {
    projectedRefund: number
    baseRefund: number
    verifiedSavings: number
    ruleVersion: string
  }
  irs: Pick<
    IrsReturnResult,
    | 'agi'
    | 'taxableIncome'
    | 'incomeTaxBeforeCredits'
    | 'seTax'
    | 'amt'
    | 'niit'
    | 'nonrefundableCredits'
    | 'refundableCredits'
    | 'totalPayments'
    | 'refundOrBalanceDue'
    | 'ctc'
    | 'actc'
    | 'eitc'
    | 'cdcc'
    | 'ptc'
    | 'excessAptcRepayment'
    | 'educationNonrefundable'
    | 'educationRefundable'
    | 'qbiDeduction'
  >
  diffs: DualRunLineDiff[]
  summary: string
}

let runtimeFlag: DualRunFlag = { ...DEFAULT_DUAL_RUN_FLAG }

export function getDualRunFlag(): DualRunFlag {
  return { ...runtimeFlag }
}

/** Test/admin only — does not expose IRS to UI. */
export function setDualRunFlagForTests(flag: Partial<DualRunFlag>): DualRunFlag {
  runtimeFlag = {
    ...runtimeFlag,
    ...flag,
    audience: 'internal_only', // hard-lock: never taxpayer_visible in this module
  }
  return getDualRunFlag()
}

export function resetDualRunFlag(): void {
  runtimeFlag = { ...DEFAULT_DUAL_RUN_FLAG }
}

/**
 * Run both engines. Safe to call from tests/admin tooling.
 * Returns null when flag disabled.
 */
export function runDualComparison(
  profile: TaxpayerProfile,
  label = 'dual-run',
  flag: DualRunFlag = getDualRunFlag(),
): DualRunReport | null {
  if (!flag.enabled) return null

  const demo = runBenefitOptimization(profile)
  const irs = computeIrsFederalReturn(profileToIrsInput(profile))
  const cmp = compareDemoToIrs(profile, label)

  const diffs: DualRunLineDiff[] = [
    {
      field: 'final_refund_or_balance',
      demo: demo.projectedRefund,
      irs: irs.refundOrBalanceDue,
      delta: demo.projectedRefund - irs.refundOrBalanceDue,
    },
    {
      field: 'demo_base_vs_irs_income_tax_sign',
      demo: demo.baseRefund,
      irs: -irs.incomeTaxBeforeCredits,
      delta: null,
    },
    { field: 'agi', demo: null, irs: irs.agi, delta: null },
    { field: 'taxable_income', demo: null, irs: irs.taxableIncome, delta: null },
    { field: 'income_tax', demo: null, irs: irs.incomeTaxBeforeCredits, delta: null },
    { field: 'se_tax', demo: null, irs: irs.seTax, delta: null },
    { field: 'amt', demo: null, irs: irs.amt, delta: null },
    { field: 'niit', demo: null, irs: irs.niit, delta: null },
    {
      field: 'credits_nonrefundable',
      demo: null,
      irs: irs.nonrefundableCredits,
      delta: null,
    },
    {
      field: 'credits_refundable',
      demo: null,
      irs: irs.refundableCredits,
      delta: null,
    },
    { field: 'withholding', demo: profile.withholding, irs: irs.totalPayments, delta: 0 },
    { field: 'ctc', demo: null, irs: irs.ctc, delta: null },
    { field: 'actc', demo: null, irs: irs.actc, delta: null },
    { field: 'eitc', demo: null, irs: irs.eitc, delta: null },
    { field: 'cdcc', demo: null, irs: irs.cdcc, delta: null },
    { field: 'ptc', demo: null, irs: irs.ptc, delta: null },
    { field: 'excess_aptc', demo: null, irs: irs.excessAptcRepayment, delta: null },
    { field: 'education_nonref', demo: null, irs: irs.educationNonrefundable, delta: null },
    { field: 'education_ref', demo: null, irs: irs.educationRefundable, delta: null },
    { field: 'qbi', demo: null, irs: irs.qbiDeduction, delta: null },
  ]

  return {
    flag: { ...flag, audience: 'internal_only' },
    taxpayerVisible: false,
    label,
    taxYear: profile.taxYear,
    demo: {
      projectedRefund: demo.projectedRefund,
      baseRefund: demo.baseRefund,
      verifiedSavings: demo.verifiedSavings,
      ruleVersion: demo.ruleVersion,
    },
    irs: {
      agi: irs.agi,
      taxableIncome: irs.taxableIncome,
      incomeTaxBeforeCredits: irs.incomeTaxBeforeCredits,
      seTax: irs.seTax,
      amt: irs.amt,
      niit: irs.niit,
      nonrefundableCredits: irs.nonrefundableCredits,
      refundableCredits: irs.refundableCredits,
      totalPayments: irs.totalPayments,
      refundOrBalanceDue: irs.refundOrBalanceDue,
      ctc: irs.ctc,
      actc: irs.actc,
      eitc: irs.eitc,
      cdcc: irs.cdcc,
      ptc: irs.ptc,
      excessAptcRepayment: irs.excessAptcRepayment,
      educationNonrefundable: irs.educationNonrefundable,
      educationRefundable: irs.educationRefundable,
      qbiDeduction: irs.qbiDeduction,
    },
    diffs: flag.verbose ? diffs : diffs.slice(0, 1),
    summary: `Internal dual-run TY${profile.taxYear}: demo ${cmp.demoProjectedRefund} vs IRS ${cmp.irsRefundOrBalanceDue} (Δ ${cmp.delta}). Hidden from taxpayers.`,
  }
}

/** Guard for UI layers — always false until explicit cutover approval module exists. */
export function mayShowIrsToTaxpayer(): false {
  return false
}
