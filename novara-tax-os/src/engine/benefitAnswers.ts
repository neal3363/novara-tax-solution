import type { TaxpayerProfile } from './benefitOptimizer'

/** Shared “is this answer already on the return?” check for questionnaires. */
export function answerPresent(p: TaxpayerProfile, key: string): boolean {
  const v = p.answers[key]
  const depName = /^dep_(\d+)_name$/.exec(key)
  if (depName) {
    const idx = Number(depName[1])
    return Boolean(v) || Boolean(p.dependents[idx]?.fullLegalName?.trim())
  }
  const depDob = /^dep_(\d+)_dob$/.exec(key)
  if (depDob) {
    const idx = Number(depDob[1])
    return Boolean(v) || Boolean(p.dependents[idx]?.dateOfBirth?.trim())
  }
  if (key === 'childcare_amount') return p.childcarePaid > 0 || typeof v === 'number' || !!v
  if (key === 'tuition_paid') return p.tuitionPaid > 0 || !!v
  if (key === 'child_age') return p.dependents.some((d) => d.age >= 0) || v !== undefined
  if (key === 'mortgage_interest_paid') return p.mortgageInterest > 0 || !!v
  if (key === 'mortgage_interest_amount') return p.mortgageInterest > 0 || !!v
  if (key === 'property_tax_amount') return p.propertyTax > 0 || !!v
  if (key === 'loan_interest_paid') return p.studentLoanInterest > 0 || !!v
  if (key === 'business_miles') return p.businessMileage > 0 || !!v
  if (key === 'qbi_amount') return p.selfEmploymentIncome > 0 || !!v
  if (key === 'se_health_premium_amount') return p.seHealthPremiums > 0 || !!v
  if (key === 'charitable_gift_amount') return p.charitableGifts > 0 || !!v
  if (key === 'medical_amount') return p.medicalExpenses > 0 || !!v
  if (key === 'retirement_contribution_amount') return p.retirementContributions > 0 || !!v
  if (key === 'energy_improvement_amount') return p.energyImprovements > 0 || !!v
  if (key === 'hsa_amount') return p.hsaContributions > 0 || !!v
  if (key === 'educator_expenses') return p.educatorExpenses > 0 || p.isEducator || !!v
  if (key === 'filing_status') return p.filingStatus !== 'unknown' || !!v
  if (key === 'earned_income_band') return p.wages + p.selfEmploymentIncome > 0 || !!v
  // Explicit No must count as answered — otherwise discovery/mileage loops forever on
  // the business / self-employment gate (clients stuck around questions ~0–17).
  if (key === 'self_employed') {
    return (
      p.selfEmploymentIncome > 0 ||
      v === 'yes' ||
      v === 'no' ||
      v === true ||
      v === false ||
      v === 'Yes' ||
      v === 'No'
    )
  }
  if (key === 'has_earned_income_q') {
    return (
      p.wages + p.selfEmploymentIncome > 0 ||
      v === 'yes' ||
      v === 'no' ||
      v === true ||
      v === false ||
      v === 'Yes' ||
      v === 'No'
    )
  }
  if (key === 'business_vehicle') return p.businessMileage > 0 || v === 'yes' || v === 'no' || v === true || v === false
  if (key === 'total_miles') return typeof v === 'number' || !!v
  if (key === 'paid_childcare') return p.childcarePaid > 0 || v === 'yes' || v === 'no' || v === true || v === false
  if (key === 'education_expenses') return p.tuitionPaid > 0 || v === 'yes' || v === 'no' || v === true || v === false
  if (key === 'owns_home') return p.mortgageInterest > 0 || p.propertyTax > 0 || v === 'yes' || v === 'no' || !!v
  if (v === undefined || v === '' || v === 'unresolved') return false
  return true
}
