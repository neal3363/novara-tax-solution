import {
  BENEFIT_CATALOG_2025,
  BENEFIT_RULE_VERSION,
  type BenefitRule,
  type BenefitStatus,
  type DocSupportStatus,
} from '../data/benefitsCatalog'
import { buildAppliedFormLines, formMappingFor } from './returnForms'

export type ProfileAnswers = Record<string, string | number | boolean | undefined>

export interface TaxpayerProfile {
  taxYear: number
  wages: number
  withholding: number
  selfEmploymentIncome: number
  filingStatus: 'single' | 'mfj' | 'hoh' | 'mfs' | 'unknown'
  dependents: { name: string; age: number; relationship: string }[]
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

function hasChild(p: TaxpayerProfile) {
  return p.dependents.some((d) => d.age < 17) || p.answers.has_child === true || p.answers.has_child === 'yes'
}

function hasDependents(p: TaxpayerProfile) {
  return p.dependents.length > 0 || p.answers.has_dependents === true || p.answers.has_dependents === 'yes'
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
    se_health_premiums: p.seHealthPremiums > 0,
    business_vehicle: p.businessMileage > 0 || p.answers.business_vehicle === 'yes',
    charitable_gifts: p.charitableGifts > 0 || p.answers.charitable_gifts === 'yes',
    high_medical: p.medicalExpenses > 0 || p.answers.high_medical === 'yes',
    is_educator: p.isEducator || p.answers.is_educator === 'yes',
    marketplace_coverage: p.answers.marketplace_coverage === 'yes' || p.answers.had_marketplace === 'yes',
    unmarried_or_considered: p.filingStatus === 'single' || p.filingStatus === 'hoh' || p.answers.unmarried_or_considered === 'yes',
  }
}

function answerPresent(p: TaxpayerProfile, key: string) {
  const v = p.answers[key]
  if (key === 'childcare_amount') return p.childcarePaid > 0 || typeof v === 'number' || !!v
  if (key === 'tuition_paid') return p.tuitionPaid > 0 || !!v
  if (key === 'child_age') return p.dependents.some((d) => d.age >= 0) || v !== undefined
  if (key === 'mortgage_interest_paid') return p.mortgageInterest > 0 || !!v
  if (key === 'property_tax_amount') return p.propertyTax > 0 || !!v
  if (key === 'loan_interest_paid') return p.studentLoanInterest > 0 || !!v
  if (key === 'filing_status') return p.filingStatus !== 'unknown' || !!v
  if (key === 'earned_income_band') return p.wages + p.selfEmploymentIncome > 0 || !!v
  if (v === undefined || v === '' || v === 'unresolved') return false
  return true
}

function kidsUnder17(p: TaxpayerProfile) {
  return p.dependents.filter((d) => d.age < 17).length || (hasChild(p) ? 1 : 0)
}

/** Tax-year calculation helpers — amounts come from profile facts, not catalog hints. */
function estimateFor(rule: BenefitRule, p: TaxpayerProfile): number {
  switch (rule.id) {
    case 'ctc':
      return kidsUnder17(p) * 2000
    case 'cdcc': {
      // IRC §21: up to $3,000 (1 qualifying person) / $6,000 (2+); credit rate 20–35% (demo uses 20% floor + AGI-ish bump)
      const persons = Math.max(1, kidsUnder17(p))
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
      const kids = kidsUnder17(p)
      const earned = p.wages + p.selfEmploymentIncome
      if (earned <= 0) return 0
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
      return p.filingStatus === 'hoh' ? 1200 : 0
    case 'odc': {
      const other = p.dependents.filter((d) => d.age >= 17).length
      return other * 500
    }
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

function evaluateRule(rule: BenefitRule, p: TaxpayerProfile, facts: Record<string, boolean>): BenefitFinding {
  const triggered = rule.triggerFacts.some((t) => facts[t])
  const missingAnswers = rule.requiredAnswers.filter((k) => !answerPresent(p, k))
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
    return baseFinding(rule, {
      status: 'needs_info',
      estimatedSavings: 0,
      explanation: `More information needed to evaluate ${rule.shortName}.`,
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
  const facts = factMap(p)
  let findings = BENEFIT_CATALOG_2025.map((rule) => evaluateRule(rule, p, facts))
  findings = resolveIncompatibilities(findings)

  const baseRefund = computeBaseRefund(p)
  const onReturn = findings.filter((f) => f.status === 'applied' || f.status === 'pending_verification')
  const verifiedSavings = onReturn.reduce((s, f) => s + f.affectingRefund, 0)
  const potentialSavings = findings
    .filter((f) => f.status === 'needs_info' || f.status === 'flagged_review')
    .reduce((s, f) => s + Math.max(0, f.estimatedSavings), 0)

  const comparisonNotes: string[] = []
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

  const blockers: string[] = []
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
    projectedRefund: baseRefund + verifiedSavings,
    verifiedSavings,
    potentialSavings,
    findings: findings.sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.affectingRefund - a.affectingRefund),
    formLines: buildAppliedFormLines(findings),
    newlyApplied: [],
    comparisonNotes,
    blockers,
    auditComplete: !openNeeds && !unresolved,
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

  if (!answered('has_dependents')) {
    qs.push({
      id: 'has_dependents',
      prompt: 'Do you have any dependents?',
      kind: 'yesno',
      mapsTo: 'has_dependents',
      benefitIds: ['ctc', 'eitc', 'odc', 'hoh', 'cdcc'],
    })
  }

  if ((p.answers.has_dependents === 'yes' || hasDependents(p)) && !answered('has_child')) {
    qs.push({
      id: 'has_child',
      prompt: 'Do you have a child under 17 who lived with you?',
      kind: 'yesno',
      mapsTo: 'has_child',
      benefitIds: ['ctc', 'cdcc', 'eitc'],
    })
  }

  if (hasChild(p) || p.answers.has_child === 'yes') {
    ;[
      {
        id: 'child_lived_with',
        prompt: 'Did your child live with you for more than half the year?',
        mapsTo: 'child_lived_with',
      },
      {
        id: 'child_support',
        prompt: 'Did you pay more than half of your child’s support?',
        mapsTo: 'child_support',
      },
      {
        id: 'another_claimant',
        prompt: 'Could someone else claim this child on their taxes?',
        mapsTo: 'another_claimant',
      },
      {
        id: 'paid_childcare',
        prompt: 'Did you pay for childcare so you could work?',
        mapsTo: 'paid_childcare',
      },
    ].forEach((q) => {
      if (!answered(q.mapsTo)) {
        qs.push({ ...q, kind: 'yesno', benefitIds: ['ctc', 'cdcc'] })
      }
    })
  }

  if ((p.answers.paid_childcare === 'yes' || p.childcarePaid > 0) && !answered('childcare_amount')) {
    qs.push({
      id: 'childcare_amount',
      prompt: 'About how much did you pay for childcare?',
      kind: 'number',
      mapsTo: 'childcare_amount',
      benefitIds: ['cdcc'],
    })
  }

  if ((p.answers.paid_childcare === 'yes' || p.childcarePaid > 0) && !answered('care_provider')) {
    qs.push({
      id: 'care_provider',
      prompt: 'Do you have your childcare provider’s name and tax ID?',
      kind: 'yesno',
      mapsTo: 'care_provider',
      benefitIds: ['cdcc'],
    })
  }

  if ((p.answers.paid_childcare === 'yes' || p.childcarePaid > 0) && !answered('employer_dependent_care')) {
    qs.push({
      id: 'employer_dependent_care',
      prompt: 'Did your job help pay for childcare (a dependent-care benefit)?',
      kind: 'yesno',
      mapsTo: 'employer_dependent_care',
      benefitIds: ['cdcc'],
    })
  }

  if (!answered('education_expenses')) {
    qs.push({
      id: 'education_expenses',
      prompt: 'Did you or a dependent pay college tuition?',
      kind: 'yesno',
      mapsTo: 'education_expenses',
      benefitIds: ['aotc', 'llc'],
    })
  }

  if (!answered('student_loan_interest') && p.studentLoanInterest <= 0) {
    qs.push({
      id: 'student_loan_interest',
      prompt: 'Did you pay student loan interest?',
      kind: 'yesno',
      mapsTo: 'student_loan_interest',
      benefitIds: ['student_loan'],
    })
  }

  if (!answered('retirement_contributions')) {
    qs.push({
      id: 'retirement_contributions',
      prompt: 'Did you put money into a retirement account (IRA or 401k)?',
      kind: 'yesno',
      mapsTo: 'retirement_contributions',
      benefitIds: ['savers'],
    })
  }

  if (!answered('self_employed') && p.selfEmploymentIncome <= 0) {
    qs.push({
      id: 'self_employed',
      prompt: 'Did you earn money from your own business or freelancing?',
      kind: 'yesno',
      mapsTo: 'self_employed',
      benefitIds: ['qbi', 'mileage', 'se_health'],
    })
  }

  if (!answered('owns_home')) {
    qs.push({
      id: 'owns_home',
      prompt: 'Do you own a home?',
      kind: 'yesno',
      mapsTo: 'owns_home',
      benefitIds: ['mortgage', 'property_tax', 'energy'],
    })
  }

  if (!answered('had_marketplace')) {
    qs.push({
      id: 'had_marketplace',
      prompt: 'Did you get health insurance through the Marketplace (Healthcare.gov)?',
      kind: 'yesno',
      mapsTo: 'had_marketplace',
      benefitIds: ['ptc'],
    })
  }

  if (!answered('charitable_gifts')) {
    qs.push({
      id: 'charitable_gifts',
      prompt: 'Did you make charitable donations you can document?',
      kind: 'yesno',
      mapsTo: 'charitable_gifts',
      benefitIds: ['charity'],
    })
  }

  if (!answered('high_medical')) {
    qs.push({
      id: 'high_medical',
      prompt: 'Did you have large medical bills this year?',
      kind: 'yesno',
      mapsTo: 'high_medical',
      benefitIds: ['medical'],
    })
  }

  if (!answered('filing_state')) {
    qs.push({
      id: 'filing_state',
      prompt: 'Which state was your main home for tax purposes?',
      kind: 'choice',
      choices: ['Texas', 'California', 'New York', 'Florida', 'Other'],
      mapsTo: 'filing_state',
      benefitIds: ['state_eitc'],
    })
  }

  // Prioritize questions tied to open needs_info findings
  const needed = new Set(report.findings.filter((f) => f.status === 'needs_info').flatMap((f) => f.missingAnswers))
  return qs
    .filter((q) => !answered(q.mapsTo))
    .sort((a, b) => Number(needed.has(b.mapsTo)) - Number(needed.has(a.mapsTo)))
    .slice(0, 6)
}

export function applyAnswer(p: TaxpayerProfile, mapsTo: string, value: string | number | boolean): TaxpayerProfile {
  const next: TaxpayerProfile = {
    ...p,
    answers: { ...p.answers, [mapsTo]: value },
    unresolvedKeys: p.unresolvedKeys.filter((k) => k !== mapsTo),
  }

  if (mapsTo === 'has_child' && (value === 'yes' || value === true) && next.dependents.length === 0) {
    next.dependents = [{ name: 'Dependent child', age: 8, relationship: 'child' }]
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
    next.tuitionPaid = 4000
  }
  if (mapsTo === 'retirement_contributions' && (value === 'yes' || value === true) && next.retirementContributions === 0) {
    next.retirementContributions = 3000
  }
  if (mapsTo === 'self_employed' && (value === 'yes' || value === true) && next.selfEmploymentIncome === 0) {
    next.selfEmploymentIncome = 5000
  }
  if (mapsTo === 'owns_home' && (value === 'yes' || value === true) && next.mortgageInterest === 0) {
    next.mortgageInterest = 8500
    next.propertyTax = 4200
  }
  if (mapsTo === 'had_marketplace' && (value === 'yes' || value === true)) {
    next.answers.marketplace_coverage = 'yes'
  }
  if (mapsTo === 'charitable_gifts' && (value === 'yes' || value === true) && next.charitableGifts === 0) {
    next.charitableGifts = 500
  }
  if (mapsTo === 'high_medical' && (value === 'yes' || value === true) && next.medicalExpenses === 0) {
    next.medicalExpenses = 9000
  }
  if (mapsTo === 'student_loan_interest' && (value === 'yes' || value === true) && next.studentLoanInterest === 0) {
    next.studentLoanInterest = 780
  }
  if (mapsTo === 'filing_state') {
    next.answers.filing_state = String(value)
  }
  return next
}
