import type { TaxpayerProfile } from './benefitOptimizer'
import { answerPresent as profileHas } from './benefitAnswers'

export type QKind = 'yesno' | 'choice' | 'number' | 'text'

export interface BenefitQuestion {
  id: string
  prompt: string
  kind: QKind
  choices?: string[]
  mapsTo: string
  /** Show only when true (defaults to always) */
  when?: (p: TaxpayerProfile) => boolean
  /** Answering No ends this benefit as not eligible */
  eligibilityGate?: boolean
}

export interface BenefitQuestionnaire {
  ruleId: string
  title: string
  intro: string
  questions: BenefitQuestion[]
}

function yes(p: TaxpayerProfile, key: string) {
  const v = p.answers[key]
  if (v === 'yes' || v === 'Yes' || v === true) return true
  // Profile facts already on the return count as Yes so follow-ups are not skipped
  if (key === 'self_employed' && p.selfEmploymentIncome > 0) return true
  if (key === 'has_child' && p.dependents.some((d) => d.age < 17)) return true
  if (key === 'business_vehicle' && p.businessMileage > 0) return true
  if (key === 'education_expenses' && p.tuitionPaid > 0) return true
  if (key === 'paid_childcare' && p.childcarePaid > 0) return true
  if (key === 'owns_home' && (p.mortgageInterest > 0 || p.propertyTax > 0)) return true
  if (key === 'mortgage_interest_paid' && p.mortgageInterest > 0) return true
  if (key === 'property_taxes' && p.propertyTax > 0) return true
  if (key === 'student_loan_interest' && p.studentLoanInterest > 0) return true
  if (key === 'charitable_gifts' && p.charitableGifts > 0) return true
  if (key === 'high_medical' && p.medicalExpenses > 0) return true
  if (key === 'retirement_contributions' && p.retirementContributions > 0) return true
  if (key === 'hsa_contributions' && p.hsaContributions > 0) return true
  if (key === 'energy_improvements' && p.energyImprovements > 0) return true
  if (key === 'is_educator' && p.isEducator) return true
  return false
}

function answered(p: TaxpayerProfile, key: string) {
  return profileHas(p, key)
}

/** Per-benefit questionnaires — plain-English, conditional follow-ups. */
export const BENEFIT_QUESTIONNAIRES: BenefitQuestionnaire[] = [
  {
    ruleId: 'mileage',
    title: 'Business mileage',
    intro: 'We’ll check whether vehicle miles for your business create an allowable deduction.',
    questions: [
      {
        id: 'biz_vehicle_use',
        prompt: 'Did you use a vehicle for qualifying business purposes during the tax year?',
        kind: 'yesno',
        mapsTo: 'business_vehicle',
        eligibilityGate: true,
      },
      {
        id: 'self_employed_gate',
        prompt: 'Were you self-employed, an independent contractor, or operating a business?',
        kind: 'yesno',
        mapsTo: 'self_employed',
        when: (p) => yes(p, 'business_vehicle'),
        eligibilityGate: true,
      },
      {
        id: 'which_vehicle',
        prompt: 'Which vehicle did you use for business?',
        kind: 'choice',
        choices: ['Personal car', 'Truck / SUV', 'Van', 'Other'],
        mapsTo: 'vehicle_type',
        when: (p) => yes(p, 'business_vehicle') && yes(p, 'self_employed'),
      },
      {
        id: 'total_miles',
        prompt: 'About how many total miles did you drive during the year?',
        kind: 'number',
        mapsTo: 'total_miles',
        when: (p) => yes(p, 'business_vehicle') && yes(p, 'self_employed'),
      },
      {
        id: 'business_miles',
        prompt: 'How many of those miles were qualifying business miles?',
        kind: 'number',
        mapsTo: 'business_miles',
        when: (p) => yes(p, 'business_vehicle') && answered(p, 'total_miles'),
      },
      {
        id: 'vehicle_start',
        prompt: 'When did you begin using the vehicle for business?',
        kind: 'choice',
        choices: ['This tax year', 'A prior year', 'Not sure'],
        mapsTo: 'vehicle_business_start',
        when: (p) => answered(p, 'business_miles'),
      },
      {
        id: 'mileage_log',
        prompt: 'Do you have a mileage log or other adequate supporting records?',
        kind: 'yesno',
        mapsTo: 'mileage_log',
        when: (p) => answered(p, 'business_miles'),
      },
      {
        id: 'actual_expense',
        prompt: 'Did you have vehicle expenses that may qualify for an actual-expense deduction instead of standard mileage?',
        kind: 'yesno',
        mapsTo: 'actual_expense_method',
        when: (p) => answered(p, 'business_miles'),
      },
      {
        id: 'prior_depr',
        prompt: 'Have you previously claimed depreciation or another vehicle expense method that affects this year’s deduction?',
        kind: 'yesno',
        mapsTo: 'prior_vehicle_depreciation',
        when: (p) => answered(p, 'business_miles'),
      },
    ],
  },
  {
    ruleId: 'qbi',
    title: 'Qualified Business Income (§199A)',
    intro: 'We’ll see if your self-employment or pass-through income qualifies for the QBI deduction.',
    questions: [
      {
        id: 'qbi_se',
        prompt: 'Did you have self-employment or pass-through business income this year?',
        kind: 'yesno',
        mapsTo: 'self_employed',
        eligibilityGate: true,
      },
      {
        id: 'qbi_amount',
        prompt: 'About how much was your qualified business income (profit before the QBI deduction)?',
        kind: 'number',
        mapsTo: 'qbi_amount',
        when: (p) => yes(p, 'self_employed') || p.selfEmploymentIncome > 0,
      },
      {
        id: 'qbi_sstb',
        prompt: 'Is this a specified service business (for example law, health, consulting, or financial services)?',
        kind: 'choice',
        choices: ['Yes', 'No', 'Not sure'],
        mapsTo: 'qbi_sstb',
        when: (p) => answered(p, 'qbi_amount') || p.selfEmploymentIncome > 0,
      },
    ],
  },
  {
    ruleId: 'se_health',
    title: 'Self-employed health insurance',
    intro: 'We’ll check whether your health insurance premiums may be deductible.',
    questions: [
      {
        id: 'seh_se',
        prompt: 'Were you self-employed with a net profit this year?',
        kind: 'yesno',
        mapsTo: 'self_employed',
        eligibilityGate: true,
      },
      {
        id: 'seh_premiums',
        prompt: 'Did you pay health insurance premiums for yourself (or family) while self-employed?',
        kind: 'yesno',
        mapsTo: 'se_health_premiums_yes',
        when: (p) => yes(p, 'self_employed') || p.selfEmploymentIncome > 0,
        eligibilityGate: true,
      },
      {
        id: 'seh_amount',
        prompt: 'About how much did you pay in those premiums?',
        kind: 'number',
        mapsTo: 'se_health_premium_amount',
        when: (p) => yes(p, 'se_health_premiums_yes'),
      },
      {
        id: 'seh_other_coverage',
        prompt: 'Were you eligible for an employer plan (yours or a spouse’s) for those same months?',
        kind: 'yesno',
        mapsTo: 'se_health_employer_eligible',
        when: (p) => answered(p, 'se_health_premium_amount'),
      },
    ],
  },
  {
    ruleId: 'ctc',
    title: 'Child Tax Credit',
    intro: 'We’ll check whether you have a qualifying child for the Child Tax Credit.',
    questions: [
      {
        id: 'ctc_dep',
        prompt: 'Do you have a child under age 17 who lived with you?',
        kind: 'yesno',
        mapsTo: 'has_child',
        eligibilityGate: true,
      },
      {
        id: 'ctc_lived',
        prompt: 'Did the child live with you for more than half the year?',
        kind: 'yesno',
        mapsTo: 'child_lived_with',
        when: (p) => yes(p, 'has_child'),
      },
      {
        id: 'ctc_support',
        prompt: 'Did you provide more than half of the child’s support?',
        kind: 'yesno',
        mapsTo: 'child_support',
        when: (p) => yes(p, 'child_lived_with'),
      },
      {
        id: 'ctc_other',
        prompt: 'Could someone else claim this child on their tax return?',
        kind: 'yesno',
        mapsTo: 'another_claimant',
        when: (p) => yes(p, 'child_support'),
      },
    ],
  },
  {
    ruleId: 'eitc',
    title: 'Earned Income Tax Credit',
    intro: 'We’ll check whether your earned income and family situation support the EITC.',
    questions: [
      {
        id: 'eitc_earned',
        prompt: 'Did you have wages or self-employment income this year?',
        kind: 'yesno',
        mapsTo: 'has_earned_income_q',
        eligibilityGate: true,
      },
      {
        id: 'eitc_child',
        prompt: 'Do you have a qualifying child for EITC?',
        kind: 'yesno',
        mapsTo: 'has_child',
        when: (p) => yes(p, 'has_earned_income_q') || p.wages + p.selfEmploymentIncome > 0,
      },
      {
        id: 'eitc_invest',
        prompt: 'Was your investment income under the EITC limit for this tax year?',
        kind: 'choice',
        choices: ['Yes', 'No', 'Not sure'],
        mapsTo: 'eitc_investment_ok',
        when: (p) => yes(p, 'has_earned_income_q') || p.wages > 0,
      },
    ],
  },
  {
    ruleId: 'cdcc',
    title: 'Child and Dependent Care Credit',
    intro: 'We’ll check childcare costs paid so you could work.',
    questions: [
      {
        id: 'cdcc_child',
        prompt: 'Do you have a child or dependent who needed care so you could work?',
        kind: 'yesno',
        mapsTo: 'has_child',
        eligibilityGate: true,
      },
      {
        id: 'cdcc_paid',
        prompt: 'Did you pay for daycare, babysitting, or after-school care so you could work?',
        kind: 'yesno',
        mapsTo: 'paid_childcare',
        when: (p) => yes(p, 'has_child'),
        eligibilityGate: true,
      },
      {
        id: 'cdcc_amount',
        prompt: 'About how much did you pay for qualifying childcare?',
        kind: 'number',
        mapsTo: 'childcare_amount',
        when: (p) => yes(p, 'paid_childcare'),
      },
      {
        id: 'cdcc_provider',
        prompt: 'Do you have the care provider’s name and tax ID?',
        kind: 'yesno',
        mapsTo: 'care_provider',
        when: (p) => answered(p, 'childcare_amount') || p.childcarePaid > 0,
      },
      {
        id: 'cdcc_fsa',
        prompt: 'Did your job help pay for childcare (a dependent-care benefit)?',
        kind: 'yesno',
        mapsTo: 'employer_dependent_care',
        when: (p) => answered(p, 'childcare_amount') || p.childcarePaid > 0,
      },
    ],
  },
  {
    ruleId: 'aotc',
    title: 'American Opportunity Tax Credit',
    intro: 'We’ll check college tuition for the American Opportunity Credit.',
    questions: [
      {
        id: 'aotc_edu',
        prompt: 'Did you or a dependent pay college tuition this year?',
        kind: 'yesno',
        mapsTo: 'education_expenses',
        eligibilityGate: true,
      },
      {
        id: 'aotc_student',
        prompt: 'Is the student in the first four years of college and enrolled at least half-time?',
        kind: 'yesno',
        mapsTo: 'aotc_half_time_first4',
        when: (p) => yes(p, 'education_expenses') || p.tuitionPaid > 0,
      },
      {
        id: 'aotc_tuition',
        prompt: 'About how much qualified tuition and fees were paid?',
        kind: 'number',
        mapsTo: 'tuition_paid',
        when: (p) => yes(p, 'aotc_half_time_first4'),
      },
      {
        id: 'aotc_felony',
        prompt: 'Has the student been convicted of a felony drug offense?',
        kind: 'yesno',
        mapsTo: 'felony_drug',
        when: (p) => answered(p, 'tuition_paid') || p.tuitionPaid > 0,
      },
    ],
  },
  {
    ruleId: 'llc',
    title: 'Lifetime Learning Credit',
    intro: 'We’ll check whether the Lifetime Learning Credit fits better than other education credits.',
    questions: [
      {
        id: 'llc_edu',
        prompt: 'Did you or a dependent pay tuition for college or qualified courses?',
        kind: 'yesno',
        mapsTo: 'education_expenses',
        eligibilityGate: true,
      },
      {
        id: 'llc_tuition',
        prompt: 'About how much qualified tuition was paid?',
        kind: 'number',
        mapsTo: 'tuition_paid',
        when: (p) => yes(p, 'education_expenses') || p.tuitionPaid > 0,
      },
      {
        id: 'llc_prefer',
        prompt: 'Should we evaluate Lifetime Learning if American Opportunity does not apply?',
        kind: 'yesno',
        mapsTo: 'prefer_llc',
        when: (p) => answered(p, 'tuition_paid') || p.tuitionPaid > 0,
      },
    ],
  },
  {
    ruleId: 'student_loan',
    title: 'Student loan interest',
    intro: 'We’ll check whether student loan interest creates an above-the-line deduction.',
    questions: [
      {
        id: 'sl_paid',
        prompt: 'Did you pay student loan interest this year?',
        kind: 'yesno',
        mapsTo: 'student_loan_interest',
        eligibilityGate: true,
      },
      {
        id: 'sl_amount',
        prompt: 'About how much student loan interest did you pay?',
        kind: 'number',
        mapsTo: 'loan_interest_paid',
        when: (p) => yes(p, 'student_loan_interest'),
      },
    ],
  },
  {
    ruleId: 'mortgage',
    title: 'Mortgage interest',
    intro: 'We’ll check home mortgage interest for itemized deductions.',
    questions: [
      {
        id: 'mort_own',
        prompt: 'Do you own a home with a mortgage?',
        kind: 'yesno',
        mapsTo: 'owns_home',
        eligibilityGate: true,
      },
      {
        id: 'mort_int',
        prompt: 'Did you pay mortgage interest this year?',
        kind: 'yesno',
        mapsTo: 'mortgage_interest_paid',
        when: (p) => yes(p, 'owns_home') || p.mortgageInterest > 0,
        eligibilityGate: true,
      },
      {
        id: 'mort_amount',
        prompt: 'About how much mortgage interest did you pay?',
        kind: 'number',
        mapsTo: 'mortgage_interest_amount',
        when: (p) => yes(p, 'mortgage_interest_paid') && p.mortgageInterest <= 0,
      },
    ],
  },
  {
    ruleId: 'property_tax',
    title: 'Property taxes',
    intro: 'We’ll check property taxes for the SALT itemized deduction.',
    questions: [
      {
        id: 'pt_own',
        prompt: 'Do you own a home or other real property?',
        kind: 'yesno',
        mapsTo: 'owns_home',
        eligibilityGate: true,
      },
      {
        id: 'pt_paid',
        prompt: 'Did you pay property taxes this year?',
        kind: 'yesno',
        mapsTo: 'property_taxes',
        when: (p) => yes(p, 'owns_home'),
        eligibilityGate: true,
      },
      {
        id: 'pt_amount',
        prompt: 'About how much property tax did you pay?',
        kind: 'number',
        mapsTo: 'property_tax_amount',
        when: (p) => yes(p, 'property_taxes') && p.propertyTax <= 0,
      },
    ],
  },
  {
    ruleId: 'charity',
    title: 'Charitable contributions',
    intro: 'We’ll check documented charitable gifts for itemizing.',
    questions: [
      {
        id: 'ch_gave',
        prompt: 'Did you make charitable donations you can document?',
        kind: 'yesno',
        mapsTo: 'charitable_gifts',
        eligibilityGate: true,
      },
      {
        id: 'ch_amount',
        prompt: 'About how much did you give to qualifying charities?',
        kind: 'number',
        mapsTo: 'charitable_gift_amount',
        when: (p) => yes(p, 'charitable_gifts'),
      },
    ],
  },
  {
    ruleId: 'medical',
    title: 'Medical expenses',
    intro: 'We’ll check whether medical costs exceed the AGI floor for itemizing.',
    questions: [
      {
        id: 'med_high',
        prompt: 'Did you have large medical bills this year?',
        kind: 'yesno',
        mapsTo: 'high_medical',
        eligibilityGate: true,
      },
      {
        id: 'med_amount',
        prompt: 'About how much did you pay in medical expenses (after insurance)?',
        kind: 'number',
        mapsTo: 'medical_amount',
        when: (p) => yes(p, 'high_medical'),
      },
    ],
  },
  {
    ruleId: 'savers',
    title: 'Saver’s Credit',
    intro: 'We’ll check retirement contributions for the Saver’s Credit.',
    questions: [
      {
        id: 'sav_contrib',
        prompt: 'Did you put money into a retirement account (IRA or 401k)?',
        kind: 'yesno',
        mapsTo: 'retirement_contributions',
        eligibilityGate: true,
      },
      {
        id: 'sav_amount',
        prompt: 'About how much did you contribute?',
        kind: 'number',
        mapsTo: 'retirement_contribution_amount',
        when: (p) => yes(p, 'retirement_contributions'),
      },
    ],
  },
  {
    ruleId: 'energy',
    title: 'Energy credits',
    intro: 'We’ll check home energy improvements for available credits.',
    questions: [
      {
        id: 'en_improve',
        prompt: 'Did you make qualifying energy-efficiency or clean-energy improvements?',
        kind: 'yesno',
        mapsTo: 'energy_improvements',
        eligibilityGate: true,
      },
      {
        id: 'en_amount',
        prompt: 'About how much did those improvements cost?',
        kind: 'number',
        mapsTo: 'energy_improvement_amount',
        when: (p) => yes(p, 'energy_improvements'),
      },
    ],
  },
  {
    ruleId: 'hsa',
    title: 'Health Savings Account',
    intro: 'We’ll check HSA contributions for an above-the-line deduction.',
    questions: [
      {
        id: 'hsa_yes',
        prompt: 'Did you contribute to a Health Savings Account?',
        kind: 'yesno',
        mapsTo: 'hsa_contributions',
        eligibilityGate: true,
      },
      {
        id: 'hsa_amount',
        prompt: 'About how much did you contribute?',
        kind: 'number',
        mapsTo: 'hsa_amount',
        when: (p) => yes(p, 'hsa_contributions'),
      },
      {
        id: 'hsa_hdhp',
        prompt: 'Did you have qualifying high-deductible health plan coverage?',
        kind: 'yesno',
        mapsTo: 'hdhp_coverage',
        when: (p) => yes(p, 'hsa_contributions'),
      },
    ],
  },
  {
    ruleId: 'ptc',
    title: 'Premium Tax Credit',
    intro: 'We’ll check Marketplace health coverage for the Premium Tax Credit.',
    questions: [
      {
        id: 'ptc_mkt',
        prompt: 'Did you get health insurance through the Marketplace (Healthcare.gov)?',
        kind: 'yesno',
        mapsTo: 'had_marketplace',
        eligibilityGate: true,
      },
      {
        id: 'ptc_advance',
        prompt: 'Did you receive advance premium tax credit payments?',
        kind: 'yesno',
        mapsTo: 'advance_ptc',
        when: (p) => yes(p, 'had_marketplace'),
      },
    ],
  },
  {
    ruleId: 'educator',
    title: 'Educator expenses',
    intro: 'We’ll check classroom expenses for eligible educators.',
    questions: [
      {
        id: 'ed_teacher',
        prompt: 'Were you a K–12 teacher or eligible educator this year?',
        kind: 'yesno',
        mapsTo: 'is_educator',
        eligibilityGate: true,
      },
      {
        id: 'ed_amount',
        prompt: 'About how much did you spend on classroom supplies?',
        kind: 'number',
        mapsTo: 'educator_expenses',
        when: (p) => yes(p, 'is_educator'),
      },
    ],
  },
  {
    ruleId: 'hoh',
    title: 'Head of Household',
    intro: 'We’ll check whether Head of Household filing status may apply.',
    questions: [
      {
        id: 'hoh_unmarried',
        prompt: 'Were you considered unmarried at the end of the year?',
        kind: 'yesno',
        mapsTo: 'unmarried_or_considered',
        eligibilityGate: true,
      },
      {
        id: 'hoh_qp',
        prompt: 'Did a qualifying person live with you for more than half the year?',
        kind: 'yesno',
        mapsTo: 'has_qualifying_person',
        when: (p) => yes(p, 'unmarried_or_considered'),
      },
      {
        id: 'hoh_home',
        prompt: 'Did you pay more than half the cost of keeping up the home?',
        kind: 'yesno',
        mapsTo: 'maintained_home',
        when: (p) => yes(p, 'has_qualifying_person'),
      },
    ],
  },
  {
    ruleId: 'odc',
    title: 'Credit for Other Dependents',
    intro: 'We’ll check dependents who are not Child Tax Credit children.',
    questions: [
      {
        id: 'odc_dep',
        prompt: 'Do you have a dependent who is not a child under 17?',
        kind: 'yesno',
        mapsTo: 'has_other_dependent',
        eligibilityGate: true,
      },
      {
        id: 'odc_rel',
        prompt: 'Is that person your qualifying relative or qualifying child age 17+?',
        kind: 'yesno',
        mapsTo: 'other_dependent_qualifies',
        when: (p) => yes(p, 'has_other_dependent'),
      },
    ],
  },
  {
    ruleId: 'state_eitc',
    title: 'State earned-income credit',
    intro: 'We’ll check whether your state offers an earned-income credit.',
    questions: [
      {
        id: 'st_state',
        prompt: 'Which state was your main home for tax purposes?',
        kind: 'choice',
        choices: ['Texas', 'California', 'New York', 'Florida', 'Other'],
        mapsTo: 'filing_state',
      },
      {
        id: 'st_fed',
        prompt: 'Do you expect to qualify for the federal Earned Income Tax Credit?',
        kind: 'choice',
        choices: ['Yes', 'No', 'Not sure'],
        mapsTo: 'federal_eitc_eligible',
        when: (p) => answered(p, 'filing_state'),
      },
    ],
  },
]

export function getQuestionnaire(ruleId: string): BenefitQuestionnaire | undefined {
  return BENEFIT_QUESTIONNAIRES.find((q) => q.ruleId === ruleId)
}

export function listSupportedBenefitQuestionnaires() {
  return BENEFIT_QUESTIONNAIRES.map((q) => ({
    ruleId: q.ruleId,
    title: q.title,
    questionCount: q.questions.length,
    conditionalCount: q.questions.filter((x) => x.when).length,
  }))
}

/** Next unanswered question for a specific benefit. */
export function nextBenefitSpecificQuestion(ruleId: string, profile: TaxpayerProfile): BenefitQuestion | null {
  const q = getQuestionnaire(ruleId)
  if (!q) return null
  for (const question of q.questions) {
    if (question.when && !question.when(profile)) continue
    if (answered(profile, question.mapsTo)) continue
    return question
  }
  return null
}

export function benefitQuestionnaireComplete(ruleId: string, profile: TaxpayerProfile): boolean {
  return nextBenefitSpecificQuestion(ruleId, profile) === null
}

export function countRemainingQuestions(ruleId: string, profile: TaxpayerProfile): number {
  const q = getQuestionnaire(ruleId)
  if (!q) return 0
  return q.questions.filter((question) => {
    if (question.when && !question.when(profile)) return false
    return !answered(profile, question.mapsTo)
  }).length
}
