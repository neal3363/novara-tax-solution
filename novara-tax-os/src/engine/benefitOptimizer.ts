import { BENEFIT_CATALOG_2025, BENEFIT_RULE_VERSION, type BenefitRule, type BenefitStatus } from '../data/benefitsCatalog'

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
  estimatedSavings: number
  explanation: string
  missingAnswers: string[]
  missingDocs: string[]
  ruleCitation: string
  ruleVersion: string
}

export interface OptimizationReport {
  taxYear: number
  ruleVersion: string
  baseRefund: number
  projectedRefund: number
  verifiedSavings: number
  potentialSavings: number
  findings: BenefitFinding[]
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
  if (v === undefined || v === '' || v === 'unresolved') return false
  if (key === 'childcare_amount') return p.childcarePaid > 0 || typeof v === 'number' || !!v
  if (key === 'tuition_paid') return p.tuitionPaid > 0 || !!v
  return true
}

function estimateFor(rule: BenefitRule, p: TaxpayerProfile): number {
  switch (rule.id) {
    case 'ctc': {
      const kids = p.dependents.filter((d) => d.age < 17).length || (hasChild(p) ? 1 : 0)
      return kids * 2000
    }
    case 'cdcc': {
      const care = Math.min(p.childcarePaid, 3000)
      const afterFsa = Math.max(0, care - p.employerDependentCare)
      return Math.round(afterFsa * 0.35)
    }
    case 'aotc':
      return Math.min(2500, Math.round(p.tuitionPaid * 0.4) || 2500)
    case 'llc':
      return Math.min(2000, Math.round(p.tuitionPaid * 0.2) || 800)
    case 'qbi':
      return Math.round(Math.min(p.selfEmploymentIncome, 40000) * 0.2 * 0.22)
    case 'mortgage': {
      const itemized = p.mortgageInterest + p.propertyTax + p.charitableGifts
      const standard = p.filingStatus === 'mfj' ? 29200 : 14600
      return itemized > standard ? Math.round((itemized - standard) * 0.22) : 0
    }
    case 'mileage':
      return Math.round(p.businessMileage * 0.7)
    case 'property_tax': {
      const salt = Math.min(10000, p.propertyTax)
      const itemized = p.mortgageInterest + salt + p.charitableGifts
      const standard = p.filingStatus === 'mfj' ? 30000 : 15000
      return itemized > standard ? Math.round(salt * 0.22) : 0
    }
    case 'eitc': {
      const kids = p.dependents.filter((d) => d.age < 17).length || (hasChild(p) ? 1 : 0)
      const earned = p.wages + p.selfEmploymentIncome
      if (earned <= 0 || earned > 65000) return 0
      return kids >= 2 ? 1800 : kids === 1 ? 1200 : 400
    }
    case 'student_loan':
      return Math.min(2500, p.studentLoanInterest) > 0 ? Math.round(Math.min(2500, p.studentLoanInterest) * 0.22) : rule.estimatedSavingsHint
    case 'ptc':
      return p.answers.had_marketplace === 'yes' ? rule.estimatedSavingsHint : 0
    case 'state_eitc': {
      const state = String(p.answers.filing_state || '').toLowerCase()
      if (!state || state === 'tx' || state === 'texas' || state === 'florida' || state === 'fl') return 0
      const kids = p.dependents.filter((d) => d.age < 17).length || (hasChild(p) ? 1 : 0)
      const federalish = kids >= 2 ? 1800 : kids === 1 ? 1200 : 400
      return Math.round(federalish * 0.3)
    }
    default:
      return rule.estimatedSavingsHint
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
    return {
      ruleId: rule.id,
      name: rule.name,
      shortName: rule.shortName,
      category: rule.category,
      status: 'ineligible',
      estimatedSavings: 0,
      explanation: `No current facts indicate ${rule.shortName} may apply. Engine still keeps it in the catalog for re-scan.`,
      missingAnswers: [],
      missingDocs: [],
      ruleCitation: rule.ruleCitation,
      ruleVersion: BENEFIT_RULE_VERSION,
    }
  }

  if (!triggered && softProbe) {
    return {
      ruleId: rule.id,
      name: rule.name,
      shortName: rule.shortName,
      category: rule.category,
      status: 'needs_info',
      estimatedSavings: rule.estimatedSavingsHint,
      explanation: `Not assumed ineligible. Ask follow-ups to determine whether ${rule.shortName} applies.`,
      missingAnswers: rule.requiredAnswers.slice(0, 2),
      missingDocs: rule.requiredDocs.slice(0, 1),
      ruleCitation: rule.ruleCitation,
      ruleVersion: BENEFIT_RULE_VERSION,
    }
  }

  if (missingAnswers.length > 0) {
    return {
      ruleId: rule.id,
      name: rule.name,
      shortName: rule.shortName,
      category: rule.category,
      status: 'needs_info',
      estimatedSavings: estimateFor(rule, p),
      explanation: `Potentially applicable. Additional answers required before eligibility can be verified.`,
      missingAnswers,
      missingDocs: rule.requiredDocs,
      ruleCitation: rule.ruleCitation,
      ruleVersion: BENEFIT_RULE_VERSION,
    }
  }

  if (p.answers[`${rule.id}_verified`] === 'yes') {
    return {
      ruleId: rule.id,
      name: rule.name,
      shortName: rule.shortName,
      category: rule.category,
      status: 'applied',
      estimatedSavings: estimateFor(rule, p),
      explanation: `Verified against ${rule.ruleCitation}. Included in projected refund.`,
      missingAnswers: [],
      missingDocs: [],
      ruleCitation: rule.ruleCitation,
      ruleVersion: BENEFIT_RULE_VERSION,
    }
  }

  if (p.answers[`${rule.id}_uncertain`] === 'yes') {
    return {
      ruleId: rule.id,
      name: rule.name,
      shortName: rule.shortName,
      category: rule.category,
      status: 'flagged_review',
      estimatedSavings: estimateFor(rule, p),
      explanation: `Eligibility uncertain — flagged for human review before claim.`,
      missingAnswers: [],
      missingDocs: rule.requiredDocs,
      ruleCitation: rule.ruleCitation,
      ruleVersion: BENEFIT_RULE_VERSION,
    }
  }

  return {
    ruleId: rule.id,
    name: rule.name,
    shortName: rule.shortName,
    category: rule.category,
    status: 'eligible_unverified',
    estimatedSavings: estimateFor(rule, p),
    explanation: `Facts support possible eligibility. Supporting docs and preparer confirmation still required.`,
    missingAnswers: [],
    missingDocs: rule.requiredDocs,
    ruleCitation: rule.ruleCitation,
    ruleVersion: BENEFIT_RULE_VERSION,
  }
}

function resolveIncompatibilities(findings: BenefitFinding[]): BenefitFinding[] {
  const byId = new Map(findings.map((f) => [f.ruleId, f]))
  const active = (s: BenefitStatus) => ['applied', 'eligible_unverified', 'needs_info', 'flagged_review'].includes(s)

  BENEFIT_CATALOG_2025.forEach((rule) => {
    const primary = byId.get(rule.id)
    if (!primary || !rule.incompatibleWith?.length || !active(primary.status)) return
    rule.incompatibleWith.forEach((otherId) => {
      const other = byId.get(otherId)
      if (!other || !active(other.status)) return
      // Prefer the higher estimated savings when both are unverified; if one is applied, drop the other
      if (primary.status === 'applied') {
        byId.set(otherId, {
          ...other,
          status: 'ineligible',
          estimatedSavings: 0,
          explanation: `Not stacked with ${primary.shortName} for the same expenses (${rule.ruleCitation}).`,
        })
      } else if (other.status === 'applied') {
        byId.set(rule.id, {
          ...primary,
          status: 'ineligible',
          estimatedSavings: 0,
          explanation: `Not stacked with ${other.shortName} for the same expenses.`,
        })
      } else if (primary.estimatedSavings >= other.estimatedSavings) {
        byId.set(otherId, {
          ...other,
          explanation: `Compare with ${primary.shortName} before claiming — do not double-count the same expenses.`,
        })
      }
    })
  })

  const ctc = byId.get('ctc')
  const odc = byId.get('odc')
  if (ctc && odc && active(ctc.status) && ctc.estimatedSavings > 0 && active(odc.status)) {
    byId.set('odc', {
      ...odc,
      explanation:
        'Other Dependents Credit is for dependents who are not Child Tax Credit children. Keep CTC for qualifying kids under 17.',
      estimatedSavings: Math.min(odc.estimatedSavings, 500),
    })
  }

  return Array.from(byId.values())
}

export function computeBaseRefund(p: TaxpayerProfile): number {
  const seTaxApprox = Math.round(p.selfEmploymentIncome * 0.9235 * 0.153)
  const taxableApprox = Math.max(0, p.wages + p.selfEmploymentIncome - 14600)
  const taxApprox = Math.round(taxableApprox * 0.12) + seTaxApprox
  return p.withholding - taxApprox
}

export function runBenefitOptimization(p: TaxpayerProfile): OptimizationReport {
  const facts = factMap(p)
  let findings = BENEFIT_CATALOG_2025.map((rule) => evaluateRule(rule, p, facts))
  findings = resolveIncompatibilities(findings)

  const baseRefund = computeBaseRefund(p)
  const verifiedSavings = findings.filter((f) => f.status === 'applied').reduce((s, f) => s + f.estimatedSavings, 0)
  const potentialSavings = findings
    .filter((f) => ['needs_info', 'eligible_unverified', 'flagged_review'].includes(f.status))
    .reduce((s, f) => s + f.estimatedSavings, 0)

  const comparisonNotes: string[] = []
  const itemized = p.mortgageInterest + p.propertyTax + p.charitableGifts + Math.max(0, p.medicalExpenses - Math.round((p.wages + p.selfEmploymentIncome) * 0.075))
  const standard = p.filingStatus === 'mfj' ? 29200 : 14600
  comparisonNotes.push(
    itemized > standard
      ? `Itemizing appears higher than standard deduction (${itemized.toLocaleString()} vs ${standard.toLocaleString()}).`
      : `Standard deduction currently exceeds estimated itemized total (${standard.toLocaleString()} vs ${itemized.toLocaleString()}).`,
  )
  if (p.tuitionPaid > 0 || p.answers.education_expenses === 'yes') {
    comparisonNotes.push('Education credits: compare AOTC vs Lifetime Learning; do not double-claim the same expenses.')
  }
  if (hasDependents(p) && p.filingStatus === 'single') {
    comparisonNotes.push('Evaluate Head of Household only if unmarried (or considered unmarried) and a qualifying person test is met.')
  }

  const blockers: string[] = []
  findings
    .filter((f) => f.status === 'needs_info')
    .forEach((f) => blockers.push(`${f.shortName}: answer ${f.missingAnswers.join(', ') || 'follow-ups'}`))
  findings
    .filter((f) => f.status === 'flagged_review')
    .forEach((f) => blockers.push(`${f.shortName}: human review required`))

  const openNeeds = findings.some((f) => f.status === 'needs_info' || f.status === 'flagged_review' || f.status === 'eligible_unverified')
  const unresolved = p.unresolvedKeys.length > 0

  return {
    taxYear: p.taxYear,
    ruleVersion: BENEFIT_RULE_VERSION,
    baseRefund,
    projectedRefund: baseRefund + verifiedSavings,
    verifiedSavings,
    potentialSavings,
    findings: findings.sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.estimatedSavings - a.estimatedSavings),
    comparisonNotes,
    blockers,
    auditComplete: !openNeeds && !unresolved,
  }
}

function statusRank(s: BenefitStatus) {
  const order: BenefitStatus[] = ['needs_info', 'flagged_review', 'eligible_unverified', 'identified', 'applied', 'ineligible']
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
  if (mapsTo === 'childcare_amount') {
    next.childcarePaid = typeof value === 'number' ? value : Number(value) || 0
  }
  if (mapsTo === 'employer_dependent_care' && (value === 'yes' || value === true)) {
    next.employerDependentCare = next.employerDependentCare || 1000
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
