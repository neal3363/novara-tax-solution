import type { TaxpayerProfile } from './benefitOptimizer'

function isExplicitYesNo(v: unknown): boolean {
  return v === 'yes' || v === 'no' || v === 'Yes' || v === 'No' || v === true || v === false
}

function isEnteredNumber(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'string' && v.trim() !== '') return Number.isFinite(Number(v.replace(/[,$]/g, '')))
  return false
}

/**
 * Shared “is this answer already on the return?” check for questionnaires.
 * Explicit No / false and numeric 0 MUST count as answered so interviews advance.
 */
export function answerPresent(p: TaxpayerProfile, key: string): boolean {
  const v = p.answers[key]
  const depName = /^dep_(\d+)_name$/.exec(key)
  if (depName) {
    const idx = Number(depName[1])
    return Boolean(String(v ?? '').trim()) || Boolean(p.dependents[idx]?.fullLegalName?.trim())
  }
  const depDob = /^dep_(\d+)_dob$/.exec(key)
  if (depDob) {
    const idx = Number(depDob[1])
    return Boolean(String(v ?? '').trim()) || Boolean(p.dependents[idx]?.dateOfBirth?.trim())
  }

  if (key === 'childcare_amount') return p.childcarePaid > 0 || isEnteredNumber(v)
  if (key === 'tuition_paid') return p.tuitionPaid > 0 || isEnteredNumber(v)
  if (key === 'child_age') return p.dependents.some((d) => d.age >= 0) || v !== undefined
  if (key === 'mortgage_interest_paid') return p.mortgageInterest > 0 || isExplicitYesNo(v) || !!v
  if (key === 'mortgage_interest_amount') return p.mortgageInterest > 0 || isEnteredNumber(v)
  if (key === 'property_tax_amount') return p.propertyTax > 0 || isEnteredNumber(v)
  if (key === 'loan_interest_paid') return p.studentLoanInterest > 0 || isEnteredNumber(v) || isExplicitYesNo(v)
  if (key === 'business_miles') return p.businessMileage > 0 || isEnteredNumber(v)
  if (key === 'total_miles') return isEnteredNumber(v)
  if (key === 'qbi_amount') return isEnteredNumber(v) || p.selfEmploymentIncome > 0
  if (key === 'qbi_sstb') return isExplicitYesNo(v)
  if (key === 'eitc_investment_ok') return isExplicitYesNo(v)
  if (key === 'aotc_half_time_first4') return isExplicitYesNo(v)
  if (key === 'felony_drug') return isExplicitYesNo(v)
  if (key === 'employer_dependent_care') return isExplicitYesNo(v)
  if (key === 'se_health_premium_amount') return p.seHealthPremiums > 0 || isEnteredNumber(v)
  if (key === 'charitable_gift_amount') return p.charitableGifts > 0 || isEnteredNumber(v)
  if (key === 'medical_amount') return p.medicalExpenses > 0 || isEnteredNumber(v)
  if (key === 'retirement_contribution_amount') return p.retirementContributions > 0 || isEnteredNumber(v)
  if (key === 'energy_improvement_amount') return p.energyImprovements > 0 || isEnteredNumber(v)
  if (key === 'hsa_amount') return p.hsaContributions > 0 || isEnteredNumber(v)
  if (key === 'educator_expenses') return p.educatorExpenses > 0 || isEnteredNumber(v) || isExplicitYesNo(v)
  if (key === 'filing_status') return p.filingStatus !== 'unknown' || !!v
  if (key === 'earned_income_band') return p.wages + p.selfEmploymentIncome > 0 || !!v

  if (key === 'self_employed') return isExplicitYesNo(v)
  if (key === 'has_earned_income_q') return isExplicitYesNo(v) || p.wages + p.selfEmploymentIncome > 0
  if (key === 'business_vehicle') return isExplicitYesNo(v) || p.businessMileage > 0
  if (key === 'paid_childcare') return isExplicitYesNo(v) || p.childcarePaid > 0
  if (key === 'education_expenses') return isExplicitYesNo(v) || p.tuitionPaid > 0
  if (key === 'owns_home') return isExplicitYesNo(v) || p.mortgageInterest > 0 || p.propertyTax > 0

  if (v === undefined || v === '' || v === 'unresolved') return false
  return true
}

/** Reverse profile side-effects written by applyAnswer for removed keys. */
export function unapplyAnswerSideEffects(profile: TaxpayerProfile, removed: Set<string>): TaxpayerProfile {
  const next: TaxpayerProfile = {
    ...profile,
    answers: { ...profile.answers },
    dependents: profile.dependents.map((d) => ({ ...d })),
  }

  if (removed.has('childcare_amount') || removed.has('paid_childcare')) next.childcarePaid = 0
  if (removed.has('employer_dependent_care')) next.employerDependentCare = 0
  if (removed.has('tuition_paid')) next.tuitionPaid = 0
  if (removed.has('retirement_contribution_amount')) next.retirementContributions = 0
  if (removed.has('self_employed')) next.selfEmploymentIncome = 0
  if (removed.has('qbi_amount') && (next.answers.self_employed === 'no' || next.answers.self_employed == null)) {
    next.selfEmploymentIncome = 0
  }
  if (removed.has('business_miles') || removed.has('business_vehicle')) next.businessMileage = 0
  if (removed.has('se_health_premium_amount')) next.seHealthPremiums = 0
  if (removed.has('mortgage_interest_amount')) next.mortgageInterest = 0
  if (removed.has('property_tax_amount')) next.propertyTax = 0
  if (removed.has('loan_interest_paid')) next.studentLoanInterest = 0
  if (removed.has('charitable_gift_amount')) next.charitableGifts = 0
  if (removed.has('medical_amount')) next.medicalExpenses = 0
  if (removed.has('hsa_amount')) next.hsaContributions = 0
  if (removed.has('energy_improvement_amount')) next.energyImprovements = 0
  if (removed.has('educator_expenses')) next.educatorExpenses = 0
  if (removed.has('is_educator')) next.isEducator = false

  return next
}
