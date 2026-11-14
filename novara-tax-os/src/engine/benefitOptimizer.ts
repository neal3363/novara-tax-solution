import {
  BENEFIT_CATALOG_2025,
  BENEFIT_RULE_VERSION,
  type BenefitRule,
  type BenefitStatus,
  type DocSupportStatus,
} from '../data/benefitsCatalog'
import { answerPresent } from './benefitAnswers'
import {
  applyDependentAnswer,
  coerceDependents,
  countCdccPersons,
  countCtcEligible,
  countEitcQualifyingChildren,
  countOdcEligible,
  dependentsReadyForVerifiedCredits,
  getDiscoveryState,
  hasHohQualifyingPerson,
  type DependentRecord,
} from './dependentsEngine'
import { buildAppliedFormLines, formMappingFor } from './returnForms'

export type ProfileAnswers = Record<string, string | number | boolean | undefined>
export type { DependentRecord }

export interface TaxpayerProfile {
  taxYear: number
  wages: number
  withholding: number
  selfEmploymentIncome: number
  filingStatus: 'single' | 'mfj' | 'hoh' | 'mfs' | 'qss' | 'unknown'
  dependents: DependentRecord[]
  childcarePaid: number
  careProvider?: string
  employerDependentCare: number
  tuitionPaid: number
  studentLoanInterest: number
  retirementContributions: number
  hsaContributions: number
  mortgageInterest: number
  propertyTax: number
  energyImprovements: number
  charitableGifts: number
  medicalExpenses: number
  businessMileage: number
  seHealthPremiums: number
  isEducator: boolean
  educatorExpenses: number
  answers: ProfileAnswers
  unresolvedKeys: string[]
}

export interface BenefitFinding {
  ruleId: string
  name: string
  shortName: string
  category: BenefitRule['category']
  status: BenefitStatus
  /** Calculated allowable amount under TY rules (not a marketing hint) */
  estimatedSavings: number
  /** Amount currently affecting the working return refund/tax */
  affectingRefund: number
  explanation: string
  missingAnswers: string[]
  missingDocs: string[]
  docStatus: DocSupportStatus
  form?: string
  field?: string
  ruleCitation: string
  ruleVersion: string
  refundable?: boolean
}

export interface OptimizationReport {
  taxYear: number
  ruleVersion: string
  baseRefund: number
  projectedRefund: number
  verifiedSavings: number
  potentialSavings: number
  findings: BenefitFinding[]
  formLines: ReturnType<typeof buildAppliedFormLines>
  newlyApplied: BenefitFinding[]
  comparisonNotes: string[]
  blockers: string[]
  auditComplete: boolean
  /** False until dependent discovery + per-dependent interview complete (or explicitly zero) */
  dependentInfoComplete: boolean
  /** When true, do not present dependent-based refund as verified */
  refundIncomplete: boolean
  refundIncompleteReason?: string
}

export function defaultProfile(): TaxpayerProfile {
  return {
    taxYear: 2025,
    wages: 72400,
    withholding: 8920,
    selfEmploymentIncome: 4250,
    filingStatus: 'unknown',
    dependents: [],
    childcarePaid: 0,
    employerDependentCare: 0,
    tuitionPaid: 0,
    studentLoanInterest: 0,
    retirementContributions: 0,
    hsaContributions: 0,
    mortgageInterest: 0,
    propertyTax: 0,
    energyImprovements: 0,
    charitableGifts: 0,
    medicalExpenses: 0,
    businessMileage: 0,
    seHealthPremiums: 0,
    isEducator: false,
    educatorExpenses: 0,
    answers: {},
    unresolvedKeys: [],
  }
}

function normalizedDeps(p: TaxpayerProfile): DependentRecord[] {
  return coerceDependents(p.dependents, p.taxYear)
}

function hasChild(p: TaxpayerProfile) {
  const deps = normalizedDeps(p)
  if (dependentsReadyForVerifiedCredits(p.answers, deps)) {
    return deps.some((d) => d.ctcEligible || d.eitcQualifyingChild || (d.qualifyingChild && d.age < 17))
  }
  // Soft probe only — never invent credit amounts from this
  return p.answers.has_child === true || p.answers.has_child === 'yes' || p.answers.potential_dependents === 'yes'
}

function hasDependents(p: TaxpayerProfile) {
  const deps = normalizedDeps(p)
  const discovery = getDiscoveryState(p.answers, deps)
  if (discovery.discoveryComplete) return (discovery.declaredCount ?? 0) > 0 || deps.length > 0
  return (
    p.answers.has_dependents === true ||
    p.answers.has_dependents === 'yes' ||
    p.answers.potential_dependents === 'yes'
  )
}

function factMap(p: TaxpayerProfile): Record<string, boolean> {
  return {
    has_dependents: hasDependents(p),
    has_child: hasChild(p),
    paid_childcare: p.childcarePaid > 0 || p.answers.paid_childcare === 'yes',
    has_earned_income: p.wages + p.selfEmploymentIncome > 0,
    education_expenses: p.tuitionPaid > 0 || p.answers.education_expenses === 'yes',
    has_student: p.answers.has_student === 'yes' || p.tuitionPaid > 0,
    student_loan_interest: p.studentLoanInterest > 0 || p.answers.student_loan_interest === 'yes',
    retirement_contributions: p.retirementContributions > 0 || p.answers.retirement_contributions === 'yes',
    hsa_contributions: p.hsaContributions > 0 || p.answers.hsa_contributions === 'yes',
    owns_home: p.mortgageInterest > 0 || p.propertyTax > 0 || p.answers.owns_home === 'yes',
    mortgage_interest: p.mortgageInterest > 0,
    property_taxes: p.propertyTax > 0 || p.answers.property_taxes === 'yes',
    energy_improvements: p.energyImprovements > 0 || p.answers.energy_improvements === 'yes',
    self_employed: p.selfEmploymentIncome > 0 || p.answers.self_employed === 'yes',
    schedule_c: p.selfEmploymentIncome > 0,
    se_health_premiums: p.seHealthPremiums > 0 || p.answers.se_health_premiums_yes === 'yes',
    business_vehicle: p.businessMileage > 0 || p.answers.business_vehicle === 'yes',
    charitable_gifts: p.charitableGifts > 0 || p.answers.charitable_gifts === 'yes',
    high_medical: p.medicalExpenses > 0 || p.answers.high_medical === 'yes',
    is_educator: p.isEducator || p.answers.is_educator === 'yes',
    marketplace_coverage: p.answers.marketplace_coverage === 'yes' || p.answers.had_marketplace === 'yes',
    unmarried_or_considered: p.filingStatus === 'single' || p.filingStatus === 'hoh' || p.answers.unmarried_or_considered === 'yes',
  }
}

function kidsUnder17(p: TaxpayerProfile) {
  const deps = normalizedDeps(p)
  if (!dependentsReadyForVerifiedCredits(p.answers, deps)) return 0
  return countCtcEligible(deps)
}

/** Tax-year calculation helpers — amounts come from profile facts, not catalog hints. */
function estimateFor(rule: BenefitRule, p: TaxpayerProfile): number {
  const deps = normalizedDeps(p)
  const depsReady = dependentsReadyForVerifiedCredits(p.answers, deps)

  switch (rule.id) {
    case 'ctc':
      return depsReady ? countCtcEligible(deps) * 2000 : 0
    case 'cdcc': {
      if (!depsReady || p.childcarePaid <= 0) return 0
      // IRC §21: up to $3,000 (1 qualifying person) / $6,000 (2+); credit rate 20–35%
      const persons = Math.max(1, countCdccPersons(deps))
      const cap = persons >= 2 ? 6000 : 3000
      const care = Math.min(Math.max(0, p.childcarePaid), cap)
      const afterFsa = Math.max(0, care - Math.max(0, p.employerDependentCare))
      const earned = p.wages + p.selfEmploymentIncome
      const rate = earned < 15000 ? 0.35 : earned < 43000 ? 0.2 : 0.2
      return Math.round(afterFsa * rate)
    }
    case 'aotc': {
      if (p.tuitionPaid <= 0) return 0
      const first = Math.min(2000, p.tuitionPaid)
      const rest = Math.min(2000, Math.max(0, p.tuitionPaid - 2000)) * 0.25
      return Math.min(2500, Math.round(first + rest))
    }
    case 'llc':
      return p.tuitionPaid > 0 ? Math.min(2000, Math.round(p.tuitionPaid * 0.2)) : 0
    case 'qbi':
      return p.selfEmploymentIncome > 0
        ? Math.round(Math.min(p.selfEmploymentIncome, 40000) * 0.2 * 0.22)
        : 0
    case 'mortgage': {
      const itemized = p.mortgageInterest + Math.min(10000, p.propertyTax) + p.charitableGifts
      const standard = p.filingStatus === 'mfj' ? 30000 : 15000
      return itemized > standard ? Math.round(p.mortgageInterest * 0.22) : 0
    }
    case 'mileage':
      return p.businessMileage > 0 ? Math.round(p.businessMileage * 0.67) : 0
    case 'property_tax': {
      const salt = Math.min(10000, p.propertyTax)
      const itemized = p.mortgageInterest + salt + p.charitableGifts
      const standard = p.filingStatus === 'mfj' ? 30000 : 15000
      return itemized > standard && salt > 0 ? Math.round(salt * 0.22) : 0
    }
    case 'eitc': {
      const earned = p.wages + p.selfEmploymentIncome
      if (earned <= 0) return 0
      // Without completed dependent discovery, do not assume qualifying children
      const kids = depsReady ? countEitcQualifyingChildren(deps) : 0
      // Simplified TY2025-style phaseout bands for demo engine
      if (kids === 0 && earned > 18591) return 0
      if (kids === 1 && earned > 49084) return 0
      if (kids >= 2 && earned > 55768) return 0
      if (kids >= 3) return Math.min(7830, Math.round(earned * 0.45))
      if (kids === 2) return Math.min(6960, Math.round(earned * 0.4))
      if (kids === 1) return Math.min(4213, Math.round(earned * 0.34))
      return Math.min(632, Math.round(earned * 0.0765))
    }
    case 'student_loan': {
      const interest = Math.min(2500, p.studentLoanInterest)
      return interest > 0 ? Math.round(interest * 0.22) : 0
    }
    case 'savers':
      return p.retirementContributions > 0 ? Math.min(1000, Math.round(p.retirementContributions * 0.1)) : 0
    case 'hsa':
      return p.hsaContributions > 0 ? Math.round(Math.min(p.hsaContributions, 4300) * 0.22) : 0
    case 'energy':
      return p.energyImprovements > 0 ? Math.min(1200, Math.round(p.energyImprovements * 0.3)) : 0
    case 'se_health':
      return p.seHealthPremiums > 0 && p.selfEmploymentIncome > 0
        ? Math.round(Math.min(p.seHealthPremiums, p.selfEmploymentIncome) * 0.22)
        : 0
    case 'charity': {
      const itemized = p.mortgageInterest + Math.min(10000, p.propertyTax) + p.charitableGifts
      const standard = p.filingStatus === 'mfj' ? 30000 : 15000
      return itemized > standard && p.charitableGifts > 0 ? Math.round(p.charitableGifts * 0.22) : 0
    }
    case 'medical': {
      const floor = Math.round((p.wages + p.selfEmploymentIncome) * 0.075)
      const excess = Math.max(0, p.medicalExpenses - floor)
      const itemized = p.mortgageInterest + Math.min(10000, p.propertyTax) + p.charitableGifts + excess
      const standard = p.filingStatus === 'mfj' ? 30000 : 15000
      return itemized > standard && excess > 0 ? Math.round(excess * 0.22) : 0
    }
    case 'educator':
      return p.isEducator || p.answers.is_educator === 'yes' ? Math.min(300, p.educatorExpenses || 300) : 0
    case 'hoh':
      if (!depsReady || !hasHohQualifyingPerson(deps)) return 0
      return p.filingStatus === 'hoh' ? 1200 : 0
    case 'odc':
      return depsReady ? countOdcEligible(deps) * 500 : 0
    case 'ptc':
      return p.answers.had_marketplace === 'yes' || p.answers.marketplace_coverage === 'yes' ? 1400 : 0
    case 'state_eitc': {
      const state = String(p.answers.filing_state || '').toLowerCase()
      if (!state || state === 'tx' || state === 'texas' || state === 'florida' || state === 'fl') return 0
      const kids = kidsUnder17(p)
      const earned = p.wages + p.selfEmploymentIncome
      if (earned <= 0) return 0
      const federalish = kids >= 2 ? Math.min(6960, Math.round(earned * 0.4)) : kids === 1 ? Math.min(4213, Math.round(earned * 0.34)) : Math.min(632, Math.round(earned * 0.0765))
      return Math.round(federalish * 0.3)
    }
    default:
      return 0
  }
}

function docsOnFile(rule: BenefitRule, p: TaxpayerProfile): boolean {
  if (p.answers[`${rule.id}_docs`] === 'yes') return true
  if (rule.id === 'cdcc' && (p.answers.care_provider === 'yes' || p.childcarePaid > 0)) {
    // Provider identity answered — receipt can still be uploaded later
    return p.answers.cdcc_docs === 'yes'
  }
  if (rule.id === 'ctc' && p.answers.id_on_file === 'yes') return true
  if (rule.id === 'mortgage' && p.mortgageInterest > 0) return true
  if (rule.id === 'property_tax' && p.propertyTax > 0) return true
  if ((rule.id === 'aotc' || rule.id === 'llc') && p.tuitionPaid > 0) return true
  if (rule.id === 'student_loan' && p.studentLoanInterest > 0) return true
  if (rule.id === 'eitc' && p.wages + p.selfEmploymentIncome > 0) return true
  // Mileage: taxpayer attestation of a log is not verified documentation — stay pending_verification
  if (rule.id === 'mileage' && p.answers.mileage_docs === 'yes') return true
  return false
}

function baseFinding(
  rule: BenefitRule,
  patch: Partial<BenefitFinding> & Pick<BenefitFinding, 'status' | 'estimatedSavings' | 'explanation'>,
): BenefitFinding {
  const map = formMappingFor(rule.id)
  return {
    ruleId: rule.id,
    name: rule.name,
    shortName: rule.shortName,
    category: rule.category,
    affectingRefund: 0,
    missingAnswers: [],
    missingDocs: [],
    docStatus: 'not_required',
    form: map.form,
    field: map.field,
    ruleCitation: rule.ruleCitation,
    ruleVersion: BENEFIT_RULE_VERSION,
    refundable: rule.refundable,
    ...patch,
  }
}

/** Explicit questionnaire “No” / disqualifying answers — never invent eligibility. */
function disqualifiedByAnswers(rule: BenefitRule, p: TaxpayerProfile): string | null {
  const a = p.answers
  const no = (k: string) => a[k] === 'no' || a[k] === false
  const yes = (k: string) => a[k] === 'yes' || a[k] === true
  switch (rule.id) {
    case 'mileage':
      if (no('business_vehicle')) return 'You indicated you did not use a vehicle for qualifying business purposes.'
      if (no('self_employed')) return 'Business mileage requires self-employment or a trade or business.'
      break
    case 'qbi':
      if (no('self_employed')) return 'No self-employment or pass-through income was reported for QBI.'
      break
    case 'se_health':
      if (no('self_employed')) return 'Self-employed health insurance requires self-employment.'
      if (no('se_health_premiums_yes')) return 'No self-employed health insurance premiums were paid.'
      if (yes('se_health_employer_eligible')) return 'Eligible employer coverage months generally disqualify this deduction.'
      break
    case 'ctc':
      if (no('has_child')) return 'No qualifying child under 17 was indicated.'
      if (no('child_lived_with') || no('child_support') || yes('another_claimant'))
        return 'Child Tax Credit residency/support/claimant tests were not met.'
      break
    case 'eitc':
      if (no('has_earned_income_q')) return 'No earned income was indicated for EITC.'
      if (no('eitc_investment_ok') || a.eitc_investment_ok === 'No') return 'Investment income appears above the EITC limit.'
      break
    case 'cdcc':
      if (no('has_child') || no('paid_childcare')) return 'No qualifying childcare expenses were indicated.'
      break
    case 'aotc':
      if (no('education_expenses')) return 'No college tuition expenses were indicated.'
      if (no('aotc_half_time_first4')) return 'Student does not meet AOTC half-time / first-four-years tests.'
      if (yes('felony_drug')) return 'A felony drug conviction disqualifies the American Opportunity Credit.'
      break
    case 'llc':
      if (no('education_expenses')) return 'No qualified education expenses were indicated.'
      break
    case 'student_loan':
      if (no('student_loan_interest')) return 'No student loan interest was paid.'
      break
    case 'mortgage':
      if (no('owns_home') || no('mortgage_interest_paid')) return 'No mortgage interest was indicated.'
      break
    case 'property_tax':
      if (no('owns_home') || no('property_taxes')) return 'No property taxes were indicated.'
      break
    case 'charity':
      if (no('charitable_gifts')) return 'No charitable gifts were indicated.'
      break
    case 'medical':
      if (no('high_medical')) return 'No large medical expenses were indicated.'
      break
    case 'savers':
      if (no('retirement_contributions')) return 'No retirement contributions were indicated.'
      break
    case 'energy':
      if (no('energy_improvements')) return 'No qualifying energy improvements were indicated.'
      break
    case 'hsa':
      if (no('hsa_contributions') || no('hdhp_coverage')) return 'HSA contribution or HDHP coverage was not indicated.'
      break
    case 'ptc':
      if (no('had_marketplace')) return 'No Marketplace coverage was indicated.'
      break
    case 'educator':
      if (no('is_educator')) return 'Not an eligible educator for this deduction.'
      break
    case 'hoh':
      if (no('unmarried_or_considered') || no('has_qualifying_person') || no('maintained_home'))
        return 'Head of Household tests were not met.'
      break
    case 'odc':
      if (no('has_other_dependent') || no('other_dependent_qualifies')) return 'No other qualifying dependent was indicated.'
      break
    default:
      break
  }
  return null
}

const DEPENDENT_CREDIT_RULES = new Set(['ctc', 'eitc', 'cdcc', 'odc', 'hoh'])

function evaluateRule(rule: BenefitRule, p: TaxpayerProfile, facts: Record<string, boolean>): BenefitFinding {
  const dq = disqualifiedByAnswers(rule, p)
  if (dq) {
    return baseFinding(rule, {
      status: 'ineligible',
      estimatedSavings: 0,
      explanation: `${rule.shortName}: not eligible. ${dq}`,
    })
  }

  const deps = normalizedDeps(p)
  const depsReady = dependentsReadyForVerifiedCredits(p.answers, deps)

  const triggered = rule.triggerFacts.some((t) => facts[t])
  // Per-dependent interview replaces legacy CTC/EITC questionnaire keys when complete
  let missingAnswers = rule.requiredAnswers.filter((k) => !answerPresent(p, k))
  if (DEPENDENT_CREDIT_RULES.has(rule.id) && depsReady) {
    missingAnswers = missingAnswers.filter(
      (k) =>
        !(
          k === 'has_child' ||
          k === 'child_lived_with' ||
          k === 'child_support' ||
          k === 'another_claimant' ||
          k === 'has_other_dependent' ||
          k === 'other_dependent_qualifies' ||
          k === 'unmarried_or_considered' ||
          k === 'has_qualifying_person' ||
          k === 'maintained_home' ||
          k === 'complete_dependent_interview'
        ),
    )
  }
  const softProbe =
    !triggered &&
    rule.triggerFacts.some((t) =>
      [
        'has_child',
        'has_dependents',
        'education_expenses',
        'owns_home',
        'self_employed',
        'marketplace_coverage',
        'has_earned_income',
        'property_taxes',
        'charitable_gifts',
        'high_medical',
        'student_loan_interest',
        'business_vehicle',
        'retirement_contributions',
        'hsa_contributions',
        'energy_improvements',
        'is_educator',
        'se_health_premiums',
      ].includes(t),
    )

  if (!triggered && !softProbe) {
    return baseFinding(rule, {
      status: 'ineligible',
      estimatedSavings: 0,
      explanation: `${rule.shortName} does not appear to apply based on current return facts.`,
    })
  }

  if (!triggered && softProbe) {
    // Prospective scenario only — not applied until facts/answers confirm eligibility.
    const prospective = Math.max(0, rule.estimatedSavingsHint || 0)
    return baseFinding(rule, {
      status: 'needs_info',
      estimatedSavings: prospective,
      affectingRefund: 0,
      explanation: `If you qualify, ${rule.shortName} could add about $${prospective.toLocaleString()} — answer a few questions so NOVARA can confirm. Not included in your current estimated refund.`,
      missingAnswers: rule.requiredAnswers.slice(0, 2),
      missingDocs: rule.requiredDocs.slice(0, 1),
      docStatus: 'requested',
    })
  }

  if (missingAnswers.length > 0) {
    return baseFinding(rule, {
      status: 'needs_info',
      estimatedSavings: estimateFor(rule, p),
      explanation: `More information needed before ${rule.shortName} can be calculated and applied.`,
      missingAnswers,
      missingDocs: rule.requiredDocs,
      docStatus: 'requested',
    })
  }

  if (p.answers[`${rule.id}_uncertain`] === 'yes') {
    const amount = estimateFor(rule, p)
    return baseFinding(rule, {
      status: 'flagged_review',
      estimatedSavings: amount,
      affectingRefund: 0,
      explanation: `${rule.shortName} is flagged for human review before it can change your refund.`,
      missingDocs: rule.requiredDocs,
      docStatus: 'requested',
    })
  }

  const amount = estimateFor(rule, p)
  if (amount <= 0) {
    return baseFinding(rule, {
      status: 'ineligible',
      estimatedSavings: 0,
      explanation: `${rule.shortName} was evaluated under ${rule.ruleCitation}, but the allowable amount is $0 for this return.`,
    })
  }

  const hasDocs = docsOnFile(rule, p)
  const map = formMappingFor(rule.id)
  // Auto-apply to the working return when eligibility answers are complete.
  // Missing optional receipts → pending_verification, still affecting refund.
  if (hasDocs || p.answers[`${rule.id}_verified`] === 'yes') {
    return baseFinding(rule, {
      status: 'applied',
      estimatedSavings: amount,
      affectingRefund: amount,
      explanation: `Applied to your return (${map.form} · ${map.field}). Calculated under ${rule.ruleCitation}.`,
      docStatus: hasDocs ? 'on_file' : 'optional_later',
      form: map.form,
      field: map.field,
    })
  }

  return baseFinding(rule, {
    status: 'pending_verification',
    estimatedSavings: amount,
    affectingRefund: amount,
    explanation: `Applied to your working return as pending verification. Upload supporting documents when available — missing receipts do not erase this calculated benefit.`,
    missingDocs: rule.requiredDocs,
    docStatus: 'optional_later',
    form: map.form,
    field: map.field,
  })
}

function resolveIncompatibilities(findings: BenefitFinding[]): BenefitFinding[] {
  const byId = new Map(findings.map((f) => [f.ruleId, f]))
  const onReturn = (s: BenefitStatus) => s === 'applied' || s === 'pending_verification'
  const active = (s: BenefitStatus) =>
    onReturn(s) || s === 'eligible_unverified' || s === 'needs_info' || s === 'flagged_review'

  BENEFIT_CATALOG_2025.forEach((rule) => {
    const primary = byId.get(rule.id)
    if (!primary || !rule.incompatibleWith?.length || !active(primary.status)) return
    rule.incompatibleWith.forEach((otherId) => {
      const other = byId.get(otherId)
      if (!other || !active(other.status)) return
      const primaryWins = primary.estimatedSavings >= other.estimatedSavings
      const winner = primaryWins ? primary : other
      const loserId = primaryWins ? otherId : rule.id
      const loser = primaryWins ? other : primary
      byId.set(loserId, {
        ...loser,
        status: 'ineligible',
        estimatedSavings: 0,
        affectingRefund: 0,
        explanation: `Not stacked with ${winner.shortName} for the same expenses. NOVARA applied the higher legally allowable option (${winner.shortName}).`,
      })
    })
  })

  const ctc = byId.get('ctc')
  const odc = byId.get('odc')
  if (ctc && odc && onReturn(ctc.status) && ctc.affectingRefund > 0 && active(odc.status) && odc.affectingRefund === 0) {
    byId.set('odc', {
      ...odc,
      status: 'ineligible',
      estimatedSavings: 0,
      affectingRefund: 0,
      explanation:
        'Other Dependents Credit is only for dependents who are not Child Tax Credit children under 17.',
    })
  }

  return Array.from(byId.values())
}

export function computeBaseRefund(p: TaxpayerProfile): number {
  const seTaxApprox = Math.round(p.selfEmploymentIncome * 0.9235 * 0.153)
  const standard = p.filingStatus === 'mfj' ? 30000 : 15000
  const taxableApprox = Math.max(0, p.wages + p.selfEmploymentIncome - standard)
  const taxApprox = Math.round(taxableApprox * 0.12) + seTaxApprox
  return p.withholding - taxApprox
}

export function runBenefitOptimization(p: TaxpayerProfile): OptimizationReport {
  const deps = normalizedDeps(p)
  const discovery = getDiscoveryState(p.answers, deps)
  const dependentInfoComplete = dependentsReadyForVerifiedCredits(p.answers, deps)
  const refundIncomplete = !dependentInfoComplete
  const refundIncompleteReason = refundIncomplete
    ? 'Refund calculation incomplete — dependent information needed.'
    : undefined

  const facts = factMap(p)
  let findings = BENEFIT_CATALOG_2025.map((rule) => {
    const finding = evaluateRule(rule, p, facts)
    // Block unsupported dependent-based projections until discovery + interview complete
    if (DEPENDENT_CREDIT_RULES.has(rule.id) && !dependentInfoComplete) {
      // Keep prospective potential (never applied) so the maximizer can show missed family credits.
      const prospective = Math.max(finding.estimatedSavings, rule.estimatedSavingsHint || 0)
      return {
        ...finding,
        status: 'needs_info' as const,
        estimatedSavings: prospective,
        affectingRefund: 0,
        explanation:
          refundIncompleteReason! +
          ` Potential ${finding.shortName} scenario (~$${prospective.toLocaleString()}) stays separate until dependents are verified.`,
        missingAnswers: discovery.askedPotential
          ? discovery.countAnswered
            ? ['complete_dependent_interview']
            : ['dependent_count']
          : ['potential_dependents'],
        docStatus: 'requested' as const,
      }
    }
    return finding
  })
  findings = resolveIncompatibilities(findings)

  const baseRefund = computeBaseRefund(p)
  const onReturn = findings.filter((f) => f.status === 'applied' || f.status === 'pending_verification')
  const verifiedSavings = onReturn.reduce((s, f) => s + f.affectingRefund, 0)
  const potentialSavings = findings
    .filter((f) => f.status === 'needs_info' || f.status === 'flagged_review')
    .reduce((s, f) => s + Math.max(0, f.estimatedSavings), 0)

  const comparisonNotes: string[] = []
  if (refundIncomplete) {
    comparisonNotes.push(refundIncompleteReason!)
  }
  const itemized =
    p.mortgageInterest +
    Math.min(10000, p.propertyTax) +
    p.charitableGifts +
    Math.max(0, p.medicalExpenses - Math.round((p.wages + p.selfEmploymentIncome) * 0.075))
  const standard = p.filingStatus === 'mfj' ? 30000 : 15000
  comparisonNotes.push(
    itemized > standard
      ? `Itemizing appears higher than standard deduction (${itemized.toLocaleString()} vs ${standard.toLocaleString()}).`
      : `Standard deduction currently exceeds estimated itemized total (${standard.toLocaleString()} vs ${itemized.toLocaleString()}).`,
  )
  if (p.tuitionPaid > 0 || p.answers.education_expenses === 'yes') {
    comparisonNotes.push('Education credits: AOTC vs Lifetime Learning — only the higher allowable option is applied.')
  }
  if (dependentInfoComplete && deps.length > 0) {
    comparisonNotes.push(
      `Dependents on file: ${deps.length}. CTC-eligible: ${countCtcEligible(deps)}; ODC-eligible: ${countOdcEligible(deps)}; EITC qualifying children: ${countEitcQualifyingChildren(deps)}.`,
    )
  }

  const blockers: string[] = []
  if (refundIncomplete) blockers.unshift(refundIncompleteReason!)
  findings
    .filter((f) => f.status === 'needs_info')
    .forEach((f) => blockers.push(`${f.shortName}: answer ${f.missingAnswers.join(', ') || 'follow-ups'}`))
  findings
    .filter((f) => f.status === 'flagged_review')
    .forEach((f) => blockers.push(`${f.shortName}: human review required`))
  findings
    .filter((f) => f.status === 'pending_verification')
    .forEach((f) =>
      blockers.push(`${f.shortName}: applied provisionally — supporting document recommended before e-file`),
    )

  const openNeeds = findings.some((f) => f.status === 'needs_info' || f.status === 'flagged_review')
  const unresolved = p.unresolvedKeys.length > 0

  return {
    taxYear: p.taxYear,
    ruleVersion: BENEFIT_RULE_VERSION,
    baseRefund,
    // Only non-dependent verified benefits + base until dependent interview is complete
    projectedRefund: baseRefund + verifiedSavings,
    verifiedSavings,
    potentialSavings,
    findings: findings.sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.affectingRefund - a.affectingRefund),
    formLines: buildAppliedFormLines(findings),
    newlyApplied: [],
    comparisonNotes,
    blockers,
    auditComplete: !openNeeds && !unresolved && dependentInfoComplete,
    dependentInfoComplete,
    refundIncomplete,
    refundIncompleteReason,
  }
}

function statusRank(s: BenefitStatus) {
  const order: BenefitStatus[] = [
    'needs_info',
    'flagged_review',
    'pending_verification',
    'eligible_unverified',
    'identified',
    'applied',
    'ineligible',
  ]
  return order.indexOf(s)
}

export interface InterviewQuestion {
  id: string
  prompt: string
  kind: 'yesno' | 'choice' | 'number' | 'text'
  choices?: string[]
  mapsTo: string
  benefitIds: string[]
}

export function nextInterviewQuestions(p: TaxpayerProfile, report: OptimizationReport): InterviewQuestion[] {
  const qs: InterviewQuestion[] = []
  const answered = (id: string) => answerPresent(p, id) || p.unresolvedKeys.includes(id)
  const depsAlreadyKnown =
    answered('potential_dependents') ||
    answered('has_dependents') ||
    answered('has_qualifying_person') ||
    p.dependents.length > 0

  // Income type first — simple Yes/No; skipped when docs already filled wages/1099/SE.
  if (!answered('had_w2') && p.wages <= 0) {
    qs.push({
      id: 'had_w2',
      prompt: 'Got a W-2 from a job?',
      kind: 'yesno',
      mapsTo: 'had_w2',
      benefitIds: ['eitc', 'ctc'],
    })
  }

  if (!answered('had_1099') && p.selfEmploymentIncome <= 0 && p.answers.has_interest_income !== 'yes') {
    qs.push({
      id: 'had_1099',
      prompt: 'Got a 1099?',
      kind: 'yesno',
      mapsTo: 'had_1099',
      benefitIds: ['qbi', 'mileage', 'se_health'],
    })
  }

  if (!answered('self_employed') && p.selfEmploymentIncome <= 0) {
    qs.push({
      id: 'self_employed',
      prompt: 'Self-employed or side hustle?',
      kind: 'yesno',
      mapsTo: 'self_employed',
      benefitIds: ['qbi', 'mileage', 'se_health'],
    })
  }

  // Only ask dependents once — skip if filing/household already answered.
  if (!depsAlreadyKnown) {
    qs.push({
      id: 'has_dependents',
      prompt: 'Any kids or dependents?',
      kind: 'yesno',
      mapsTo: 'has_dependents',
      benefitIds: ['ctc', 'eitc', 'odc', 'hoh', 'cdcc'],
    })
  }

  if ((p.answers.has_dependents === 'yes' || hasDependents(p)) && !answered('has_child')) {
    const knownChild = p.dependents.some((d) => d.age >= 0 && d.age < 17)
    const knownNoChild = p.dependents.length > 0 && p.dependents.every((d) => d.age >= 17)
    if (!knownChild && !knownNoChild) {
      qs.push({
        id: 'has_child',
        prompt: 'Any child under 17 living with you?',
        kind: 'yesno',
        mapsTo: 'has_child',
        benefitIds: ['ctc', 'cdcc', 'eitc'],
      })
    }
  }

  const depTestsDone = p.dependents.some(
    (d) =>
      (d.monthsLivedWith != null && d.monthsLivedWith >= 0) ||
      d.providedOwnSupport != null ||
      d.anotherMayClaim != null,
  )

  if (hasChild(p) || p.answers.has_child === 'yes') {
    ;[
      {
        id: 'child_lived_with',
        prompt: 'Child lived with you over half the year?',
        mapsTo: 'child_lived_with',
        skipIfDepTests: true,
      },
      {
        id: 'child_support',
        prompt: 'Did you pay most of their support?',
        mapsTo: 'child_support',
        skipIfDepTests: true,
      },
      {
        id: 'another_claimant',
        prompt: 'Could someone else claim this child?',
        mapsTo: 'another_claimant',
        skipIfDepTests: true,
      },
      {
        id: 'paid_childcare',
        prompt: 'Paid for childcare so you could work?',
        mapsTo: 'paid_childcare',
        skipIfDepTests: false,
      },
    ].forEach((q) => {
      if (q.skipIfDepTests && depTestsDone) return
      if (!answered(q.mapsTo)) {
        qs.push({ id: q.id, prompt: q.prompt, mapsTo: q.mapsTo, kind: 'yesno', benefitIds: ['ctc', 'cdcc'] })
      }
    })
  }

  if ((p.answers.paid_childcare === 'yes' || p.childcarePaid > 0) && !answered('childcare_amount')) {
    qs.push({
      id: 'childcare_amount',
      prompt: 'How much for childcare?',
      kind: 'number',
      mapsTo: 'childcare_amount',
      benefitIds: ['cdcc'],
    })
  }

  if ((p.answers.paid_childcare === 'yes' || p.childcarePaid > 0) && !answered('care_provider')) {
    qs.push({
      id: 'care_provider',
      prompt: 'Have daycare name and tax ID?',
      kind: 'yesno',
      mapsTo: 'care_provider',
      benefitIds: ['cdcc'],
    })
  }

  if ((p.answers.paid_childcare === 'yes' || p.childcarePaid > 0) && !answered('employer_dependent_care')) {
    qs.push({
      id: 'employer_dependent_care',
      prompt: 'Job help pay for childcare?',
      kind: 'yesno',
      mapsTo: 'employer_dependent_care',
      benefitIds: ['cdcc'],
    })
  }

  if (!answered('education_expenses')) {
    qs.push({
      id: 'education_expenses',
      prompt: 'Any college tuition?',
      kind: 'yesno',
      mapsTo: 'education_expenses',
      benefitIds: ['aotc', 'llc'],
    })
  }

  if (!answered('student_loan_interest') && p.studentLoanInterest <= 0) {
    qs.push({
      id: 'student_loan_interest',
      prompt: 'Paid student loan interest?',
      kind: 'yesno',
      mapsTo: 'student_loan_interest',
      benefitIds: ['student_loan'],
    })
  }

  if (!answered('retirement_contributions')) {
    qs.push({
      id: 'retirement_contributions',
      prompt: 'Put money in IRA or 401k?',
      kind: 'yesno',
      mapsTo: 'retirement_contributions',
      benefitIds: ['savers'],
    })
  }

  const isSelfEmployed =
    p.answers.self_employed === 'yes' ||
    p.answers.self_employed === 'Yes' ||
    p.selfEmploymentIncome > 0

  // Business follow-ups — mirror childcare chaining so the Business tab is not empty after SE = yes.
  if (isSelfEmployed) {
    if (!answered('business_structure')) {
      qs.push({
        id: 'business_structure',
        prompt: 'How is your business organized for tax purposes?',
        kind: 'choice',
        choices: [
          'Sole proprietorship / Schedule C',
          'Single-member LLC (Schedule C)',
          'Partnership',
          'S corporation',
          'C corporation',
          'Not sure',
        ],
        mapsTo: 'business_structure',
        benefitIds: ['qbi', 'mileage', 'se_health'],
      })
    }
    if (!answered('qbi_amount') && p.selfEmploymentIncome <= 0) {
      qs.push({
        id: 'qbi_amount',
        prompt: 'About how much was your net business profit (Schedule C / self-employment income)?',
        kind: 'number',
        mapsTo: 'qbi_amount',
        benefitIds: ['qbi'],
      })
    }
    if (!answered('business_vehicle')) {
      qs.push({
        id: 'business_vehicle',
        prompt: 'Did you use a vehicle for qualifying business purposes during the tax year?',
        kind: 'yesno',
        mapsTo: 'business_vehicle',
        benefitIds: ['mileage'],
      })
    }
    const usedVehicle =
      p.answers.business_vehicle === 'yes' ||
      p.answers.business_vehicle === 'Yes' ||
      p.businessMileage > 0
    if (usedVehicle && !answered('total_miles')) {
      qs.push({
        id: 'total_miles',
        prompt: 'About how many total miles did you drive during the year?',
        kind: 'number',
        mapsTo: 'total_miles',
        benefitIds: ['mileage'],
      })
    }
    if (usedVehicle && answered('total_miles') && !answered('business_miles') && p.businessMileage <= 0) {
      qs.push({
        id: 'business_miles',
        prompt: 'How many of those miles were qualifying business miles?',
        kind: 'number',
        mapsTo: 'business_miles',
        benefitIds: ['mileage'],
      })
    }
    if (usedVehicle && (answered('business_miles') || p.businessMileage > 0)) {
      if (!answered('mileage_log')) {
        qs.push({
          id: 'mileage_log',
          prompt: 'Do you have a mileage log or other adequate supporting records?',
          kind: 'yesno',
          mapsTo: 'mileage_log',
          benefitIds: ['mileage'],
        })
      }
      if (!answered('actual_expense_method')) {
        qs.push({
          id: 'actual_expense_method',
          prompt:
            'Did you have vehicle expenses that may qualify for an actual-expense deduction instead of standard mileage?',
          kind: 'yesno',
          mapsTo: 'actual_expense_method',
          benefitIds: ['mileage'],
        })
      }
      if (!answered('prior_vehicle_depreciation')) {
        qs.push({
          id: 'prior_vehicle_depreciation',
          prompt:
            'Have you previously claimed depreciation or another vehicle expense method that affects this year’s deduction?',
          kind: 'yesno',
          mapsTo: 'prior_vehicle_depreciation',
          benefitIds: ['mileage'],
        })
      }
    }
    if (!answered('equipment_depreciation')) {
      qs.push({
        id: 'equipment_depreciation',
        prompt:
          'Did you buy business equipment, computers, or other property you may depreciate or expense (Section 179 / bonus)?',
        kind: 'yesno',
        mapsTo: 'equipment_depreciation',
        benefitIds: ['qbi'],
      })
    }
    if (
      (p.answers.equipment_depreciation === 'yes' || p.answers.equipment_depreciation === 'Yes') &&
      !answered('equipment_depreciation_amount')
    ) {
      qs.push({
        id: 'equipment_depreciation_amount',
        prompt: 'About how much did you spend on depreciable business equipment this year?',
        kind: 'number',
        mapsTo: 'equipment_depreciation_amount',
        benefitIds: ['qbi'],
      })
    }
    if (!answered('home_office')) {
      qs.push({
        id: 'home_office',
        prompt: 'Did you use part of your home regularly and exclusively for this business?',
        kind: 'yesno',
        mapsTo: 'home_office',
        benefitIds: ['qbi'],
      })
    }
    if (!answered('se_health_premiums_yes')) {
      qs.push({
        id: 'se_health_premiums_yes',
        prompt: 'Did you pay health insurance premiums for yourself while self-employed?',
        kind: 'yesno',
        mapsTo: 'se_health_premiums_yes',
        benefitIds: ['se_health'],
      })
    }
    if (
      (p.answers.se_health_premiums_yes === 'yes' ||
        p.answers.se_health_premiums_yes === 'Yes' ||
        p.answers.se_health_premiums === 'yes') &&
      !answered('se_health_premium_amount') &&
      p.seHealthPremiums <= 0
    ) {
      qs.push({
        id: 'se_health_premium_amount',
        prompt: 'About how much did you pay in self-employed health insurance premiums?',
        kind: 'number',
        mapsTo: 'se_health_premium_amount',
        benefitIds: ['se_health'],
      })
    }
  }

  if (!answered('owns_home')) {
    qs.push({
      id: 'owns_home',
      prompt: 'Own a home?',
      kind: 'yesno',
      mapsTo: 'owns_home',
      benefitIds: ['mortgage', 'property_tax', 'energy'],
    })
  }

  if (!answered('had_marketplace')) {
    qs.push({
      id: 'had_marketplace',
      prompt: 'Health insurance from Healthcare.gov?',
      kind: 'yesno',
      mapsTo: 'had_marketplace',
      benefitIds: ['ptc'],
    })
  }

  if (!answered('charitable_gifts')) {
    qs.push({
      id: 'charitable_gifts',
      prompt: 'Any charity donations?',
      kind: 'yesno',
      mapsTo: 'charitable_gifts',
      benefitIds: ['charity'],
    })
  }

  if (!answered('high_medical')) {
    qs.push({
      id: 'high_medical',
      prompt: 'Big medical bills this year?',
      kind: 'yesno',
      mapsTo: 'high_medical',
      benefitIds: ['medical'],
    })
  }

  if (!answered('filing_state')) {
    qs.push({
      id: 'filing_state',
      prompt: 'Which state do you live in?',
      kind: 'choice',
      choices: ['Texas', 'California', 'New York', 'Florida', 'Other'],
      mapsTo: 'filing_state',
      benefitIds: ['state_eitc'],
    })
  }

  // Prioritize needs_info — but never silently drop unlocked follow-ups (old .slice(0,6) starved the queue).
  const needed = new Set(report.findings.filter((f) => f.status === 'needs_info').flatMap((f) => f.missingAnswers))
  return qs
    .filter((q) => !answered(q.mapsTo))
    .sort((a, b) => Number(needed.has(b.mapsTo)) - Number(needed.has(a.mapsTo)))
}

function normalizeYesNo(value: string | number | boolean): string | number | boolean {
  if (typeof value !== 'string') return value
  const t = value.trim().toLowerCase()
  if (t === 'yes' || t === 'y') return 'yes'
  if (t === 'no' || t === 'n') return 'no'
  return value
}

export function applyAnswer(p: TaxpayerProfile, mapsTo: string, value: string | number | boolean): TaxpayerProfile {
  const normalized = normalizeYesNo(value)
  const next: TaxpayerProfile = {
    ...p,
    answers: { ...p.answers, [mapsTo]: normalized },
    unresolvedKeys: p.unresolvedKeys.filter((k) => k !== mapsTo),
  }
  value = normalized

  if (mapsTo === 'has_child' && (value === 'yes' || value === true || value === 'Yes')) {
    // Do not invent a dependent — open the dependent interview instead
    next.answers.potential_dependents = next.answers.potential_dependents ?? 'yes'
    next.answers.has_dependents = next.answers.has_dependents ?? 'yes'
  }
  if (mapsTo === 'has_child' && (value === 'no' || value === false || value === 'No')) {
    next.answers.potential_dependents = next.answers.potential_dependents ?? 'no'
  }
  if (mapsTo === 'has_dependents' && (value === 'yes' || value === true || value === 'Yes')) {
    next.answers.potential_dependents = next.answers.potential_dependents ?? 'yes'
  }
  if (mapsTo === 'has_dependents' && (value === 'no' || value === false || value === 'No')) {
    next.answers.potential_dependents = 'no'
    next.answers.dependent_count = 0
    next.dependents = []
  }
  if (mapsTo === 'had_w2' && (value === 'yes' || value === true || value === 'Yes')) {
    next.answers.has_earned_income = 'yes'
  }
  // had_1099 yes → checklist asks for the form; self_employed stays its own Yes/No.
  if (mapsTo === 'potential_dependents' || mapsTo === 'dependent_count' || mapsTo.startsWith('dep_')) {
    const applied = applyDependentAnswer(next.answers, next.dependents, mapsTo, value, next.taxYear)
    next.answers = applied.answers
    next.dependents = applied.dependents
  }
  if (mapsTo === 'paid_childcare' && (value === 'yes' || value === true)) {
    next.answers.worked_or_looked = 'yes'
  }
  if (mapsTo === 'childcare_amount') {
    next.childcarePaid = typeof value === 'number' ? value : Number(value) || 0
    next.answers.paid_childcare = 'yes'
    next.answers.worked_or_looked = 'yes'
  }
  if (mapsTo === 'employer_dependent_care') {
    if (value === 'yes' || value === true) next.employerDependentCare = next.employerDependentCare || 1000
    else next.employerDependentCare = 0
  }
  if (mapsTo === 'education_expenses' && (value === 'yes' || value === true) && next.tuitionPaid === 0) {
    // Amount comes from tuition_paid follow-up — don't invent a tuition figure here
  }
  if (mapsTo === 'tuition_paid') {
    next.tuitionPaid = typeof value === 'number' ? value : Number(value) || 0
    next.answers.education_expenses = 'yes'
  }
  if (mapsTo === 'retirement_contributions' && (value === 'yes' || value === true) && next.retirementContributions === 0) {
    // wait for amount
  }
  if (mapsTo === 'retirement_contribution_amount') {
    next.retirementContributions = typeof value === 'number' ? value : Number(value) || 0
    next.answers.retirement_contributions = 'yes'
  }
  // Do not invent self-employment income on Yes — amount comes from documents or qbi_amount / Schedule C follow-ups.
  if (mapsTo === 'self_employed' && (value === 'no' || value === false)) {
    // Keep document-extracted SE income; explicit No only stores the interview answer.
  }
  if (mapsTo === 'business_vehicle' && (value === 'yes' || value === true)) {
    next.answers.business_vehicle = 'yes'
  }
  if (mapsTo === 'business_miles') {
    next.businessMileage = typeof value === 'number' ? value : Number(value) || 0
    next.answers.business_vehicle = 'yes'
  }
  if (mapsTo === 'qbi_amount') {
    const n = typeof value === 'number' ? value : Number(value) || 0
    next.selfEmploymentIncome = Math.max(next.selfEmploymentIncome, n)
    next.answers.self_employed = 'yes'
  }
  if (mapsTo === 'se_health_premium_amount') {
    next.seHealthPremiums = typeof value === 'number' ? value : Number(value) || 0
    next.answers.se_health_premiums_yes = 'yes'
  }
  if (mapsTo === 'se_health_premiums_yes' && (value === 'yes' || value === true)) {
    next.answers.se_health_premiums = 'yes'
  }
  if (mapsTo === 'owns_home' && (value === 'yes' || value === true) && next.mortgageInterest === 0 && next.propertyTax === 0) {
    // amounts from follow-ups
  }
  if (mapsTo === 'mortgage_interest_amount') {
    next.mortgageInterest = typeof value === 'number' ? value : Number(value) || 0
    next.answers.owns_home = 'yes'
    next.answers.mortgage_interest_paid = 'yes'
  }
  if (mapsTo === 'property_tax_amount') {
    next.propertyTax = typeof value === 'number' ? value : Number(value) || 0
    next.answers.owns_home = 'yes'
    next.answers.property_taxes = 'yes'
  }
  if (mapsTo === 'had_marketplace' && (value === 'yes' || value === true)) {
    next.answers.marketplace_coverage = 'yes'
  }
  if (mapsTo === 'charitable_gift_amount') {
    next.charitableGifts = typeof value === 'number' ? value : Number(value) || 0
    next.answers.charitable_gifts = 'yes'
  }
  if (mapsTo === 'charitable_gifts' && (value === 'yes' || value === true) && next.charitableGifts === 0) {
    // wait for amount
  }
  if (mapsTo === 'medical_amount') {
    next.medicalExpenses = typeof value === 'number' ? value : Number(value) || 0
    next.answers.high_medical = 'yes'
  }
  if (mapsTo === 'high_medical' && (value === 'yes' || value === true) && next.medicalExpenses === 0) {
    // wait for amount
  }
  if (mapsTo === 'loan_interest_paid') {
    next.studentLoanInterest = typeof value === 'number' ? value : Number(value) || 0
    next.answers.student_loan_interest = 'yes'
  }
  if (mapsTo === 'student_loan_interest' && (value === 'yes' || value === true) && next.studentLoanInterest === 0) {
    // wait for amount
  }
  if (mapsTo === 'energy_improvement_amount') {
    next.energyImprovements = typeof value === 'number' ? value : Number(value) || 0
    next.answers.energy_improvements = 'yes'
  }
  if (mapsTo === 'hsa_amount') {
    next.hsaContributions = typeof value === 'number' ? value : Number(value) || 0
    next.answers.hsa_contributions = 'yes'
  }
  if (mapsTo === 'is_educator' && (value === 'yes' || value === true)) {
    next.isEducator = true
  }
  if (mapsTo === 'educator_expenses') {
    next.educatorExpenses = typeof value === 'number' ? value : Number(value) || 0
    next.isEducator = true
  }
  if (mapsTo === 'has_earned_income_q' && (value === 'yes' || value === true)) {
    next.answers.has_earned_income = 'yes'
  }
  if (mapsTo === 'has_other_dependent' && (value === 'yes' || value === true)) {
    next.answers.has_dependents = 'yes'
    next.answers.potential_dependents = next.answers.potential_dependents ?? 'yes'
  }
  if (mapsTo === 'maintained_home' && (value === 'yes' || value === true)) {
    next.filingStatus = 'hoh'
  }
  if (mapsTo === 'filing_state') {
    next.answers.filing_state = String(value)
  }
  return next
}
