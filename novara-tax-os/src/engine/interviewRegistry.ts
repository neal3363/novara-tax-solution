/**
 * Stable prompt/kind registry for interview focus + Edit reopen.
 * Lets resolveInterviewTurn open a focused mapsTo even when it is not the linear "next".
 */
import type { TaxpayerProfile } from './benefitOptimizer'
import { answerPresent } from './benefitAnswers'
import { getQuestionnaire, listSupportedBenefitQuestionnaires } from './benefitQuestionnaires'

export type RegistryQuestion = {
  id: string
  mapsTo: string
  prompt: string
  kind: 'yesno' | 'choice' | 'number' | 'text' | 'date'
  choices?: string[]
  phase: 'filing_status' | 'dependents' | 'benefits'
  category: 'filing_status' | 'dependents' | 'benefit_discovery' | 'benefit_specific'
  benefitRuleId?: string
}

const FILING: RegistryQuestion[] = [
  {
    id: 'married_dec31',
    mapsTo: 'married_dec31',
    prompt: 'Were you married on December 31 of the tax year?',
    kind: 'choice',
    choices: ['Yes', 'No', 'My spouse passed away'],
    phase: 'filing_status',
    category: 'filing_status',
  },
  {
    id: 'married_filing_plan',
    mapsTo: 'married_filing_plan',
    prompt: 'How are you planning to file?',
    kind: 'choice',
    choices: ['Married Filing Jointly', 'Married Filing Separately'],
    phase: 'filing_status',
    category: 'filing_status',
  },
  {
    id: 'potential_dependents',
    mapsTo: 'potential_dependents',
    prompt: 'Do you have any children or other people who may qualify as your dependents?',
    kind: 'choice',
    choices: ['Yes', 'No'],
    phase: 'filing_status',
    category: 'filing_status',
  },
  {
    id: 'dependent_count',
    mapsTo: 'dependent_count',
    prompt: 'How many children or other potential dependents do you have?',
    kind: 'choice',
    choices: ['0', '1', '2', '3', '4', '5+'],
    phase: 'filing_status',
    category: 'filing_status',
  },
  {
    id: 'maintained_home',
    mapsTo: 'maintained_home',
    prompt: 'Did you pay more than half the cost of maintaining your home?',
    kind: 'choice',
    choices: ['Yes', 'No'],
    phase: 'filing_status',
    category: 'filing_status',
  },
]

/** Discovery probes with stable IDs (matches benefitOptimizer.nextInterviewQuestions). */
const DISCOVERY: RegistryQuestion[] = [
  { id: 'has_dependents', mapsTo: 'has_dependents', prompt: 'Do you have any dependents?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'has_child', mapsTo: 'has_child', prompt: 'Do you have a child under 17 who lived with you?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'child_lived_with', mapsTo: 'child_lived_with', prompt: 'Did your child live with you for more than half the year?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'child_support', mapsTo: 'child_support', prompt: 'Did you pay more than half of your child’s support?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'another_claimant', mapsTo: 'another_claimant', prompt: 'Could someone else claim this child on their taxes?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'paid_childcare', mapsTo: 'paid_childcare', prompt: 'Did you pay for childcare so you could work?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'childcare_amount', mapsTo: 'childcare_amount', prompt: 'About how much did you pay for childcare?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'care_provider', mapsTo: 'care_provider', prompt: 'Do you have your childcare provider’s name and tax ID?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'employer_dependent_care', mapsTo: 'employer_dependent_care', prompt: 'Did your job help pay for childcare (a dependent-care benefit)?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'education_expenses', mapsTo: 'education_expenses', prompt: 'Did you or a dependent pay college tuition?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'student_loan_interest', mapsTo: 'student_loan_interest', prompt: 'Did you pay student loan interest?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'retirement_contributions', mapsTo: 'retirement_contributions', prompt: 'Did you put money into a retirement account (IRA or 401k)?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'self_employed', mapsTo: 'self_employed', prompt: 'Did you earn money from your own business or freelancing?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'owns_home', mapsTo: 'owns_home', prompt: 'Do you own a home?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'had_marketplace', mapsTo: 'had_marketplace', prompt: 'Did you get health insurance through the Marketplace (Healthcare.gov)?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'charitable_gifts', mapsTo: 'charitable_gifts', prompt: 'Did you make charitable donations you can document?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'high_medical', mapsTo: 'high_medical', prompt: 'Did you have large medical bills this year?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  {
    id: 'filing_state',
    mapsTo: 'filing_state',
    prompt: 'Which state was your main home for tax purposes?',
    kind: 'choice',
    choices: ['Texas', 'California', 'New York', 'Florida', 'Other'],
    phase: 'benefits',
    category: 'benefit_discovery',
  },
  { id: 'business_structure', mapsTo: 'business_structure', prompt: 'How is your business organized for tax purposes?', kind: 'choice', choices: ['Sole proprietorship / Schedule C', 'Single-member LLC (Schedule C)', 'Partnership', 'S corporation', 'C corporation', 'Not sure'], phase: 'benefits', category: 'benefit_discovery' },
  { id: 'business_vehicle', mapsTo: 'business_vehicle', prompt: 'Did you use a vehicle for qualifying business purposes during the tax year?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'total_miles', mapsTo: 'total_miles', prompt: 'About how many total miles did you drive during the year?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'business_miles', mapsTo: 'business_miles', prompt: 'How many of those miles were qualifying business miles?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'mileage_log', mapsTo: 'mileage_log', prompt: 'Do you have a mileage log or other adequate supporting records?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'actual_expense_method', mapsTo: 'actual_expense_method', prompt: 'Did you have vehicle expenses that may qualify for an actual-expense deduction instead of standard mileage?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'prior_vehicle_depreciation', mapsTo: 'prior_vehicle_depreciation', prompt: 'Have you previously claimed depreciation or another vehicle expense method that affects this year’s deduction?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'equipment_depreciation', mapsTo: 'equipment_depreciation', prompt: 'Did you buy business equipment, computers, or other property you may depreciate or expense?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'equipment_depreciation_amount', mapsTo: 'equipment_depreciation_amount', prompt: 'About how much did you spend on depreciable business equipment this year?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'home_office', mapsTo: 'home_office', prompt: 'Did you use part of your home regularly and exclusively for this business?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'qbi_amount', mapsTo: 'qbi_amount', prompt: 'About how much was your net business profit (Schedule C / self-employment income)?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'se_health_premiums_yes', mapsTo: 'se_health_premiums_yes', prompt: 'Did you pay health insurance premiums for yourself while self-employed?', kind: 'yesno', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'se_health_premium_amount', mapsTo: 'se_health_premium_amount', prompt: 'About how much did you pay in self-employed health insurance premiums?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'tuition_paid', mapsTo: 'tuition_paid', prompt: 'About how much qualified tuition was paid?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
  { id: 'retirement_contribution_amount', mapsTo: 'retirement_contribution_amount', prompt: 'About how much did you contribute to retirement accounts?', kind: 'number', phase: 'benefits', category: 'benefit_discovery' },
]

export function lookupRegistryQuestion(mapsTo: string, profile?: TaxpayerProfile): RegistryQuestion | null {
  const filing = FILING.find((q) => q.mapsTo === mapsTo)
  if (filing) return filing

  const discovery = DISCOVERY.find((q) => q.mapsTo === mapsTo)
  if (discovery) {
    return {
      ...discovery,
      choices: discovery.choices ?? (discovery.kind === 'yesno' ? ['Yes', 'No'] : undefined),
    }
  }

  // Dependent keys — prompt rebuilt from mapsTo
  const dep = /^dep_(\d+)_(.+)$/.exec(mapsTo)
  if (dep) {
    const idx = Number(dep[1])
    const field = dep[2]
    const name = profile?.dependents[idx]?.fullLegalName?.trim() || `dependent ${idx + 1}`
    if (field === 'name') {
      return {
        id: mapsTo,
        mapsTo,
        prompt: `What is the full legal name of dependent ${idx + 1}?`,
        kind: 'text',
        phase: 'dependents',
        category: 'dependents',
      }
    }
    if (field === 'dob') {
      return {
        id: mapsTo,
        mapsTo,
        prompt: `What is ${name}'s date of birth? (YYYY-MM-DD)`,
        kind: 'date',
        phase: 'dependents',
        category: 'dependents',
      }
    }
    return {
      id: mapsTo,
      mapsTo,
      prompt: `Dependent question (${field.replace(/_/g, ' ')}) for ${name}`,
      kind: field.includes('amount') || field === 'months' ? 'number' : 'choice',
      choices: field === 'months' ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] : ['Yes', 'No'],
      phase: 'dependents',
      category: 'dependents',
    }
  }

  for (const catalog of listSupportedBenefitQuestionnaires()) {
    const full = getQuestionnaire(catalog.ruleId)
    if (!full) continue
    const q = full.questions.find((x) => x.mapsTo === mapsTo)
    if (q) {
      return {
        id: q.id,
        mapsTo: q.mapsTo,
        prompt: q.prompt,
        kind: q.kind,
        choices: q.choices ?? (q.kind === 'yesno' ? ['Yes', 'No'] : undefined),
        phase: 'benefits',
        category: 'benefit_specific',
        benefitRuleId: catalog.ruleId,
      }
    }
  }

  return null
}

export function registryTurnIfUnanswered(mapsTo: string, profile: TaxpayerProfile) {
  if (answerPresent(profile, mapsTo) || profile.unresolvedKeys.includes(mapsTo)) return null
  const q = lookupRegistryQuestion(mapsTo, profile)
  if (!q) return null
  return {
    id: q.id,
    phase: q.phase,
    category: q.category,
    prompt: q.prompt,
    kind: q.kind,
    choices: q.choices ?? (q.kind === 'yesno' ? ['Yes', 'No'] : undefined),
    mapsTo: q.mapsTo,
    aiLead: 'Continue with this unanswered question.',
    benefitRuleId: q.benefitRuleId,
  }
}
