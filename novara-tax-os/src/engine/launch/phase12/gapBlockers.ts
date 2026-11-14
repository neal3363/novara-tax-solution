/**
 * Critical tax accuracy gap blockers for Phase 12.
 * Unsupported / partially mapped situations must never silently become "verified filing".
 * Do not invent calculations for filing-ready returns.
 */

export type GapSeverity = 'critical' | 'high' | 'medium' | 'info'
export type GapAction = 'block_filing' | 'require_review' | 'escalate' | 'disclose_only'

export interface TaxAccuracyGap {
  id: string
  area: string
  title: string
  severity: GapSeverity
  action: GapAction
  taxYears: number[]
  whatExists: string
  filingReady: false
  evidence: string
}

/** Inventory of outstanding gaps that block or escalate filing readiness. */
export const PHASE12_TAX_GAPS: TaxAccuracyGap[] = [
  {
    id: 'education-credits',
    area: 'Education credits',
    title: 'AOTC / LLC require Form 8863 eligibility follow-up before filing-ready',
    severity: 'high',
    action: 'require_review',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Isolated Form 8863 + Maximizer discovery; Phase 9 flags education_credit_needs_followup',
    filingReady: false,
    evidence: 'phase9/stagingAdapter detectUnsupportedSituations; irs/forms/form8863.ts',
  },
  {
    id: 'energy-credits',
    area: 'Energy credits',
    title: 'Residential energy credits not fully mapped to IRS adapter',
    severity: 'high',
    action: 'block_filing',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Profile field energyImprovements; not Form 5695 worksheet',
    filingReady: false,
    evidence: 'energy_credits_not_fully_mapped_to_irs_adapter',
  },
  {
    id: 'hsa-deductions',
    area: 'HSA deductions',
    title: 'HSA contribution deduction not fully mapped',
    severity: 'high',
    action: 'block_filing',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Table HSA limits exist; Form 8889 path incomplete',
    filingReady: false,
    evidence: 'hsa_deduction_not_fully_mapped_to_irs_adapter',
  },
  {
    id: 'retirement-deductions',
    area: 'Retirement contribution deductions',
    title: 'IRA / retirement contribution deduction partial mapping',
    severity: 'high',
    action: 'require_review',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Profile field; Form 8606 / IRA worksheet incomplete',
    filingReady: false,
    evidence: 'retirement_contribution_deduction_partial_mapping',
  },
  {
    id: 'state-worksheets',
    area: 'State worksheets',
    title: 'Full CA 540NR / NY IT-203 / local taxes incomplete',
    severity: 'high',
    action: 'disclose_only',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Phase 11 staging models for TX/FL/CA/NY/IL; simplified allocation',
    filingReady: false,
    evidence: 'phase11 validationStatus staging_validated; nationwideStateFiling=false',
  },
  {
    id: 'business-schedules',
    area: 'Business schedules',
    title: '1065 / 1120-S / 1120 staging only — not live e-file',
    severity: 'critical',
    action: 'block_filing',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Phase 11 isolated modules + K-1 generation',
    filingReady: false,
    evidence: 'liveBusinessEfile=false; MeF UNSUPPORTED_FORMS include Form1065/Form1120',
  },
  {
    id: 'capital-gains-edge',
    area: 'Capital gains edge cases',
    title: '§1202 / 28% collectibles / unrecaptured §1250 edge paths partial',
    severity: 'medium',
    action: 'require_review',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Schedule D / Form 8949 isolated with notes; not all edge worksheets',
    filingReady: false,
    evidence: 'irs/forms/scheduleD.ts notes; cutover unsupported-detection partial',
  },
  {
    id: 'unsupported-return-types',
    area: 'Unsupported return types',
    title: 'Estate, trust, multi-state complex, and non-supported entities',
    severity: 'critical',
    action: 'block_filing',
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'MeF unsupported form catalog; Phase 11 unsupported state detection',
    filingReady: false,
    evidence: 'mef/xml/validate.ts findUnsupportedForms',
  },
]

export interface FilingBlockDecision {
  mayMarkFilingReady: false
  blocks: TaxAccuracyGap[]
  reviews: TaxAccuracyGap[]
  escalations: TaxAccuracyGap[]
  disclosures: TaxAccuracyGap[]
  reasons: string[]
}

export interface SituationFlags {
  hasEnergyCredits?: boolean
  hasHsaContributions?: boolean
  hasRetirementContributions?: boolean
  hasEducationWithoutFollowup?: boolean
  hasBusinessEntityReturn?: boolean
  hasUnsupportedState?: boolean
  hasCapitalGainsEdge?: boolean
  hasUnsupportedReturnType?: boolean
}

/**
 * Evaluate whether a return may be marked filing-ready.
 * Always returns mayMarkFilingReady=false when any block/review gap applies —
 * Phase 12 never invents placeholder values for filing-ready claims.
 */
export function evaluateFilingReadinessBlocks(flags: SituationFlags): FilingBlockDecision {
  const blocks: TaxAccuracyGap[] = []
  const reviews: TaxAccuracyGap[] = []
  const escalations: TaxAccuracyGap[] = []
  const disclosures: TaxAccuracyGap[] = []

  const byId = (id: string) => PHASE12_TAX_GAPS.find((g) => g.id === id)!

  if (flags.hasEnergyCredits) blocks.push(byId('energy-credits'))
  if (flags.hasHsaContributions) blocks.push(byId('hsa-deductions'))
  if (flags.hasRetirementContributions) reviews.push(byId('retirement-deductions'))
  if (flags.hasEducationWithoutFollowup) reviews.push(byId('education-credits'))
  if (flags.hasBusinessEntityReturn) blocks.push(byId('business-schedules'))
  if (flags.hasUnsupportedState) {
    disclosures.push(byId('state-worksheets'))
    blocks.push({
      ...byId('state-worksheets'),
      id: 'unsupported-state-block',
      title: 'Unsupported state — block state e-file claim',
      severity: 'critical',
      action: 'block_filing',
    })
  } else if (flags.hasUnsupportedState === false) {
    disclosures.push(byId('state-worksheets'))
  }
  if (flags.hasCapitalGainsEdge) reviews.push(byId('capital-gains-edge'))
  if (flags.hasUnsupportedReturnType) blocks.push(byId('unsupported-return-types'))

  // Baseline: state worksheets always disclosed for staging scope
  if (!disclosures.some((d) => d.id === 'state-worksheets')) {
    disclosures.push(byId('state-worksheets'))
  }

  const reasons = [
    ...blocks.map((g) => `BLOCK:${g.id}`),
    ...reviews.map((g) => `REVIEW:${g.id}`),
    ...escalations.map((g) => `ESCALATE:${g.id}`),
    ...disclosures.map((g) => `DISCLOSE:${g.id}`),
  ]

  return {
    mayMarkFilingReady: false,
    blocks,
    reviews,
    escalations,
    disclosures,
    reasons,
  }
}

export function assertNoSilentVerifiedFiling(
  fullyValidatedClaim: boolean,
  unsupportedSituations: string[],
): { ok: boolean; message: string } {
  if (fullyValidatedClaim && unsupportedSituations.length > 0) {
    return {
      ok: false,
      message: 'Cannot claim fullyValidated while unsupported situations remain',
    }
  }
  return { ok: true, message: 'unsupported situations surfaced correctly' }
}
