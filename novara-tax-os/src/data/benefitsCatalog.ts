/** Tax-year-specific benefit catalog (demo rules for TY2025). Version-controlled for audit. */

export type BenefitCategory =
  | 'dependents_family'
  | 'childcare_education'
  | 'employment_income'
  | 'homeownership'
  | 'business'
  | 'health'
  | 'state'
  | 'other'

export type BenefitStatus =
  | 'identified'
  | 'needs_info'
  | 'eligible_unverified'
  | 'applied'
  | 'ineligible'
  | 'flagged_review'

export interface BenefitRule {
  id: string
  taxYear: number
  category: BenefitCategory
  name: string
  shortName: string
  description: string
  ruleCitation: string
  triggerFacts: string[]
  requiredAnswers: string[]
  requiredDocs: string[]
  estimatedSavingsHint: number
  refundable?: boolean
  incompatibleWith?: string[]
}

export const BENEFIT_RULE_VERSION = '2025.federal+state.demo.v2'

export const BENEFIT_CATALOG_2025: BenefitRule[] = [
  {
    id: 'ctc',
    taxYear: 2025,
    category: 'dependents_family',
    name: 'Child Tax Credit / Additional Child Tax Credit',
    shortName: 'Child Tax Credit',
    description: 'Credit for qualifying children under age 17 who meet residency and support tests.',
    ruleCitation: 'IRC §24 · TY2025 ruleset',
    triggerFacts: ['has_dependents', 'has_child'],
    requiredAnswers: ['child_age', 'child_lived_with', 'child_support', 'another_claimant'],
    requiredDocs: ['Dependent SSN/ITIN evidence', 'Residency support if requested'],
    estimatedSavingsHint: 2000,
    refundable: true,
  },
  {
    id: 'eitc',
    taxYear: 2025,
    category: 'dependents_family',
    name: 'Earned Income Tax Credit',
    shortName: 'EITC',
    description: 'Refundable credit based on earned income, filing status, and qualifying children.',
    ruleCitation: 'IRC §32 · TY2025 phaseouts',
    triggerFacts: ['has_earned_income'],
    requiredAnswers: ['filing_status', 'earned_income_band', 'has_child'],
    requiredDocs: ['W-2 / 1099 showing earned income'],
    estimatedSavingsHint: 1800,
    refundable: true,
  },
  {
    id: 'cdcc',
    taxYear: 2025,
    category: 'childcare_education',
    name: 'Child and Dependent Care Credit',
    shortName: 'Childcare Credit',
    description: 'Credit for qualifying care expenses paid so the taxpayer could work or look for work. Coordinates with employer dependent-care benefits.',
    ruleCitation: 'IRC §21 · TY2025 · Form 2441',
    triggerFacts: ['has_child', 'paid_childcare'],
    requiredAnswers: ['childcare_amount', 'care_provider', 'worked_or_looked', 'employer_dependent_care'],
    requiredDocs: ['Provider EIN/SSN', 'Care payment records'],
    estimatedSavingsHint: 1050,
    incompatibleWith: [],
  },
  {
    id: 'odc',
    taxYear: 2025,
    category: 'dependents_family',
    name: 'Credit for Other Dependents',
    shortName: 'Other Dependents Credit',
    description: 'Nonrefundable credit for qualifying dependents who are not CTC-eligible children.',
    ruleCitation: 'IRC §24(h)(4)',
    triggerFacts: ['has_dependents'],
    requiredAnswers: ['dependent_relationship', 'dependent_age'],
    requiredDocs: ['Dependent identification'],
    estimatedSavingsHint: 500,
  },
  {
    id: 'hoh',
    taxYear: 2025,
    category: 'dependents_family',
    name: 'Head of Household eligibility',
    shortName: 'Head of Household',
    description: 'Filing-status alternative when taxpayer maintains a home for a qualifying person.',
    ruleCitation: 'IRC §2(b)',
    triggerFacts: ['has_dependents', 'unmarried_or_considered'],
    requiredAnswers: ['filing_status', 'maintained_home', 'qualifying_person'],
    requiredDocs: ['Household cost evidence if reviewed'],
    estimatedSavingsHint: 1200,
  },
  {
    id: 'aotc',
    taxYear: 2025,
    category: 'childcare_education',
    name: 'American Opportunity Tax Credit',
    shortName: 'AOTC',
    description: 'Education credit for eligible students in first four years of postsecondary education.',
    ruleCitation: 'IRC §25A · Form 8863',
    triggerFacts: ['education_expenses', 'has_student'],
    requiredAnswers: ['student_year', 'tuition_paid', 'half_time', 'felony_drug'],
    requiredDocs: ['Form 1098-T', 'Tuition statements'],
    estimatedSavingsHint: 2500,
    incompatibleWith: ['llc'],
  },
  {
    id: 'llc',
    taxYear: 2025,
    category: 'childcare_education',
    name: 'Lifetime Learning Credit',
    shortName: 'LLC',
    description: 'Education credit alternative for eligible tuition and related expenses.',
    ruleCitation: 'IRC §25A · Form 8863',
    triggerFacts: ['education_expenses'],
    requiredAnswers: ['tuition_paid', 'eligible_institution'],
    requiredDocs: ['Form 1098-T'],
    estimatedSavingsHint: 800,
    incompatibleWith: ['aotc'],
  },
  {
    id: 'student_loan',
    taxYear: 2025,
    category: 'childcare_education',
    name: 'Student loan interest deduction',
    shortName: 'Student loan interest',
    description: 'Above-the-line deduction for eligible student loan interest paid.',
    ruleCitation: 'IRC §221',
    triggerFacts: ['student_loan_interest'],
    requiredAnswers: ['loan_interest_paid', 'income_phaseout'],
    requiredDocs: ['Form 1098-E'],
    estimatedSavingsHint: 400,
  },
  {
    id: 'savers',
    taxYear: 2025,
    category: 'employment_income',
    name: 'Saver’s Credit',
    shortName: 'Saver’s Credit',
    description: 'Credit for eligible retirement contributions based on AGI and filing status.',
    ruleCitation: 'IRC §25B',
    triggerFacts: ['retirement_contributions'],
    requiredAnswers: ['contribution_amount', 'agi_band'],
    requiredDocs: ['Retirement contribution statements'],
    estimatedSavingsHint: 500,
  },
  {
    id: 'hsa',
    taxYear: 2025,
    category: 'employment_income',
    name: 'Health Savings Account deduction',
    shortName: 'HSA',
    description: 'Deduction for eligible HSA contributions with qualifying HDHP coverage.',
    ruleCitation: 'IRC §223',
    triggerFacts: ['hsa_contributions'],
    requiredAnswers: ['hsa_amount', 'hdhp_coverage'],
    requiredDocs: ['Form 5498-SA / HSA statements'],
    estimatedSavingsHint: 650,
  },
  {
    id: 'mortgage',
    taxYear: 2025,
    category: 'homeownership',
    name: 'Mortgage interest deduction',
    shortName: 'Mortgage interest',
    description: 'Itemized deduction for qualified residence interest; compared to standard deduction.',
    ruleCitation: 'IRC §163(h)',
    triggerFacts: ['owns_home', 'mortgage_interest'],
    requiredAnswers: ['mortgage_interest_paid', 'itemize_vs_standard'],
    requiredDocs: ['Form 1098'],
    estimatedSavingsHint: 900,
  },
  {
    id: 'energy',
    taxYear: 2025,
    category: 'homeownership',
    name: 'Energy-efficiency / clean-energy credits',
    shortName: 'Energy credits',
    description: 'Credits for eligible home energy improvements and clean energy property.',
    ruleCitation: 'IRC §25C / §25D (as applicable)',
    triggerFacts: ['energy_improvements'],
    requiredAnswers: ['improvement_type', 'qualified_cost'],
    requiredDocs: ['Manufacturer certification / invoices'],
    estimatedSavingsHint: 750,
  },
  {
    id: 'qbi',
    taxYear: 2025,
    category: 'business',
    name: 'Qualified Business Income deduction',
    shortName: 'QBI (§199A)',
    description: 'Deduction for eligible pass-through / self-employment QBI subject to limitations.',
    ruleCitation: 'IRC §199A',
    triggerFacts: ['self_employed', 'schedule_c'],
    requiredAnswers: ['qbi_amount', 'w2_wages_ubia'],
    requiredDocs: ['Business P&L / K-1'],
    estimatedSavingsHint: 2200,
  },
  {
    id: 'se_health',
    taxYear: 2025,
    category: 'business',
    name: 'Self-employed health insurance deduction',
    shortName: 'SE health insurance',
    description: 'Above-the-line deduction for eligible self-employed health insurance premiums.',
    ruleCitation: 'IRC §162(l)',
    triggerFacts: ['self_employed', 'se_health_premiums'],
    requiredAnswers: ['premium_amount', 'net_profit_positive'],
    requiredDocs: ['Insurance statements'],
    estimatedSavingsHint: 1100,
  },
  {
    id: 'mileage',
    taxYear: 2025,
    category: 'business',
    name: 'Business mileage / vehicle expenses',
    shortName: 'Business mileage',
    description: 'Deductible business use of vehicle under standard mileage or actual expense method.',
    ruleCitation: 'IRC §162 · Pub 463',
    triggerFacts: ['self_employed', 'business_vehicle'],
    requiredAnswers: ['miles_or_actual', 'business_use_percent'],
    requiredDocs: ['Mileage log / vehicle records'],
    estimatedSavingsHint: 800,
  },
  {
    id: 'charity',
    taxYear: 2025,
    category: 'other',
    name: 'Charitable contributions',
    shortName: 'Charitable giving',
    description: 'Itemized deduction for eligible charitable contributions with substantiation.',
    ruleCitation: 'IRC §170',
    triggerFacts: ['charitable_gifts'],
    requiredAnswers: ['gift_amount', 'itemize_vs_standard'],
    requiredDocs: ['Donation receipts'],
    estimatedSavingsHint: 350,
  },
  {
    id: 'medical',
    taxYear: 2025,
    category: 'other',
    name: 'Eligible medical expenses',
    shortName: 'Medical expenses',
    description: 'Itemized medical expenses above AGI floor.',
    ruleCitation: 'IRC §213',
    triggerFacts: ['high_medical'],
    requiredAnswers: ['medical_amount', 'agi_floor'],
    requiredDocs: ['Medical bills / insurance EOBs'],
    estimatedSavingsHint: 400,
  },
  {
    id: 'educator',
    taxYear: 2025,
    category: 'childcare_education',
    name: 'Educator expense deduction',
    shortName: 'Educator expenses',
    description: 'Above-the-line deduction for eligible educator classroom expenses.',
    ruleCitation: 'IRC §62(a)(2)(D)',
    triggerFacts: ['is_educator'],
    requiredAnswers: ['educator_expenses'],
    requiredDocs: ['Expense receipts'],
    estimatedSavingsHint: 75,
  },
  {
    id: 'property_tax',
    taxYear: 2025,
    category: 'homeownership',
    name: 'State and local property tax deduction (SALT)',
    shortName: 'Property taxes',
    description: 'Itemized deduction for eligible property taxes, subject to SALT limitation and standard-deduction comparison.',
    ruleCitation: 'IRC §164 · SALT cap',
    triggerFacts: ['owns_home', 'property_taxes'],
    requiredAnswers: ['property_tax_amount', 'itemize_vs_standard'],
    requiredDocs: ['Property tax statement / Form 1098'],
    estimatedSavingsHint: 600,
  },
  {
    id: 'ptc',
    taxYear: 2025,
    category: 'health',
    name: 'Premium Tax Credit (Marketplace health insurance)',
    shortName: 'Health insurance credit',
    description: 'Credit for eligible Marketplace health coverage; reconcile advance payments on Form 8962.',
    ruleCitation: 'IRC §36B · Form 8962',
    triggerFacts: ['marketplace_coverage'],
    requiredAnswers: ['had_marketplace', 'advance_ptc', 'household_income_band'],
    requiredDocs: ['Form 1095-A'],
    estimatedSavingsHint: 1400,
    refundable: true,
  },
  {
    id: 'state_eitc',
    taxYear: 2025,
    category: 'state',
    name: 'State earned-income credit (where enacted)',
    shortName: 'State EITC',
    description: 'State-level EITC patterned on federal eligibility when the filing state offers a credit. Demo evaluates Texas residency as not offering a general EITC and flags other states for review.',
    ruleCitation: 'State conformity · TY2025',
    triggerFacts: ['has_earned_income'],
    requiredAnswers: ['filing_state', 'federal_eitc_eligible'],
    requiredDocs: ['State residency evidence if requested'],
    estimatedSavingsHint: 400,
    refundable: true,
  },
]

export const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  dependents_family: 'Dependents & family',
  childcare_education: 'Childcare & education',
  employment_income: 'Employment & income',
  homeownership: 'Homeownership & housing',
  business: 'Business & self-employment',
  health: 'Health insurance',
  state: 'State tax benefits',
  other: 'Other potential benefits',
}

/** Plain-language status labels for Savings cards */
export const STATUS_LABELS: Record<string, string> = {
  needs_info: 'Needs a few answers or documents',
  eligible_unverified: 'Looks possible — needs verification',
  applied: 'Applied to your estimate',
  flagged_review: 'Needs human review',
  ineligible: 'Does not appear to apply',
  identified: 'Identified',
}
