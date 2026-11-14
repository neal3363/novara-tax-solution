/**
 * Controlled staging adapter: TaxpayerProfile → IRS engine.
 * Demo Maximizer remains source of taxpayer-facing refund estimates.
 * IRS results are staging/internal only — never production cutover.
 */

import {
  applyAnswer,
  nextInterviewQuestions,
  runBenefitOptimization,
  type OptimizationReport,
  type TaxpayerProfile,
} from '../../benefitOptimizer'
import { profileToIrsInput } from '../compareDemo'
import { computeIrsFederalReturn, supportedIrsTaxYears } from '../federalReturn'
import { cutoverReady } from '../cutoverCriteria'
import { mayShowIrsToTaxpayer } from '../dualRun'
import type { IrsReturnInput, IrsReturnResult } from '../types'
import { assertNoProductionCutover, getPhase9Flags } from './config'

export interface StagingIrsVerifiedNumbers {
  /** Internal-only arithmetic from IRS engine */
  agi: number
  taxableIncome: number
  incomeTaxBeforeCredits: number
  seTax: number
  totalTax: number
  totalPayments: number
  refundOrBalanceDue: number
  ctc: number
  actc: number
  eitc: number
  cdcc: number
  educationCredits: number
  qbiDeduction: number
  taxYear: number
  filingStatus: string
  engine: string
}

export interface StagingAdapterResult {
  staging: true
  taxpayerVisible: false
  productionCutover: false
  taxYearSupported: boolean
  maximizer: OptimizationReport
  /** Present only when staging integration enabled — never replaces Maximizer UI */
  irsVerifiedNumbers: StagingIrsVerifiedNumbers | null
  irsFull: IrsReturnResult | null
  unsupportedSituations: string[]
  fullyValidated: boolean
  validationNotes: string[]
  rollback: {
    demoEngineAvailable: true
    useMaximizerForTaxpayerDisplay: true
  }
}

const SUPPORTED_YEARS = new Set(supportedIrsTaxYears())

/** Detect unsupported situations from profile + IRS result. */
export function detectUnsupportedSituations(
  profile: TaxpayerProfile,
  irs: IrsReturnResult | null,
): string[] {
  const flags: string[] = []
  if (!SUPPORTED_YEARS.has(profile.taxYear)) {
    flags.push(`unsupported_tax_year:${profile.taxYear}`)
  }
  if (profile.filingStatus === 'unknown') {
    flags.push('filing_status_unknown_mapped_to_single_for_irs')
  }
  // QSS is IRS-supported but Maximizer profile has no qss — document gap
  if ((profile as { filingStatus: string }).filingStatus === 'qss') {
    /* reachable only via synthetic IRS-side profiles */
  }
  if (profile.energyImprovements > 0) {
    flags.push('energy_credits_not_fully_mapped_to_irs_adapter')
  }
  if (profile.hsaContributions > 0) {
    flags.push('hsa_deduction_not_fully_mapped_to_irs_adapter')
  }
  if (profile.retirementContributions > 0) {
    flags.push('retirement_contribution_deduction_partial_mapping')
  }
  if (profile.tuitionPaid > 0 && !profile.answers.education_credit_type) {
    flags.push('education_credit_needs_followup_questions')
  }
  if (irs?.unsupportedCases?.length) {
    flags.push(...irs.unsupportedCases.map((c) => `irs:${c}`))
  }
  return [...new Set(flags)]
}

export function mapProfileToIrsInput(profile: TaxpayerProfile): IrsReturnInput {
  return profileToIrsInput(profile)
}

/**
 * Run Maximizer (taxpayer-facing path) + optional IRS staging calculation.
 * Does NOT replace Maximizer outputs for UI display.
 */
export function runStagingAdapter(profile: TaxpayerProfile): StagingAdapterResult {
  assertNoProductionCutover()
  const flags = getPhase9Flags()

  const maximizer = runBenefitOptimization(profile)
  const taxYearSupported = SUPPORTED_YEARS.has(profile.taxYear)
  const validationNotes: string[] = []

  if (!flags.stagingIntegrationEnabled) {
    return {
      staging: true,
      taxpayerVisible: false,
      productionCutover: false,
      taxYearSupported,
      maximizer,
      irsVerifiedNumbers: null,
      irsFull: null,
      unsupportedSituations: taxYearSupported ? [] : [`unsupported_tax_year:${profile.taxYear}`],
      fullyValidated: false,
      validationNotes: ['stagingIntegrationEnabled=false — IRS path not run'],
      rollback: { demoEngineAvailable: true, useMaximizerForTaxpayerDisplay: true },
    }
  }

  if (!taxYearSupported) {
    validationNotes.push('Tax year outside TY2022–2025 — IRS engine not run')
    return {
      staging: true,
      taxpayerVisible: false,
      productionCutover: false,
      taxYearSupported: false,
      maximizer,
      irsVerifiedNumbers: null,
      irsFull: null,
      unsupportedSituations: [`unsupported_tax_year:${profile.taxYear}`],
      fullyValidated: false,
      validationNotes,
      rollback: { demoEngineAvailable: true, useMaximizerForTaxpayerDisplay: true },
    }
  }

  const input = mapProfileToIrsInput(profile)
  const irs = computeIrsFederalReturn(input)
  const unsupported = detectUnsupportedSituations(profile, irs)
  if (unsupported.length) {
    validationNotes.push('Unsupported situations detected — do not represent as fully validated')
  }
  if (cutoverReady()) {
    validationNotes.push('UNEXPECTED: cutoverReady true — Phase 9 must not auto-cutover')
  }
  if (mayShowIrsToTaxpayer()) {
    validationNotes.push('UNEXPECTED: mayShowIrsToTaxpayer true')
  }

  const irsVerifiedNumbers: StagingIrsVerifiedNumbers = {
    agi: irs.agi,
    taxableIncome: irs.taxableIncome,
    incomeTaxBeforeCredits: irs.incomeTaxBeforeCredits,
    seTax: irs.seTax,
    totalTax: irs.totalTaxBeforeCredits,
    totalPayments: irs.totalPayments,
    refundOrBalanceDue: irs.refundOrBalanceDue,
    ctc: irs.ctc,
    actc: irs.actc,
    eitc: irs.eitc,
    cdcc: irs.cdcc,
    educationCredits: (irs.educationNonrefundable ?? 0) + (irs.educationRefundable ?? 0),
    qbiDeduction: irs.qbiDeduction,
    taxYear: irs.taxYear,
    filingStatus: irs.filingStatus,
    engine: irs.engine,
  }

  return {
    staging: true,
    taxpayerVisible: false,
    productionCutover: false,
    taxYearSupported: true,
    maximizer,
    irsVerifiedNumbers,
    irsFull: irs,
    unsupportedSituations: unsupported,
    fullyValidated: unsupported.length === 0,
    validationNotes: [
      ...validationNotes,
      'Maximizer remains taxpayer-facing display source',
      'IRS numbers are staging/internal only',
      `hypothetical_vs_verified: potential=${maximizer.potentialSavings} verified=${maximizer.verifiedSavings}`,
    ],
    rollback: { demoEngineAvailable: true, useMaximizerForTaxpayerDisplay: true },
  }
}

/** Preserve Maximizer interview/recalc contracts for staging tests. */
export function stagingMaximizerRecalc(
  profile: TaxpayerProfile,
  mapsTo: string,
  value: string | number | boolean,
): { profile: TaxpayerProfile; report: OptimizationReport; nextQuestions: ReturnType<typeof nextInterviewQuestions> } {
  const next = applyAnswer(profile, mapsTo, value)
  const report = runBenefitOptimization(next)
  return { profile: next, report, nextQuestions: nextInterviewQuestions(next, report) }
}
