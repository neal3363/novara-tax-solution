/**
 * Synthetic taxpayer profiles for Phase 9 staging validation.
 * Never real taxpayer data.
 */

import { defaultProfile, type TaxpayerProfile } from '../../benefitOptimizer'
import { emptyDependent, evaluateDependent } from '../../dependentsEngine'

function child(age: number, taxYear: number, name = 'Syn Child') {
  let d = emptyDependent(0, taxYear)
  d = {
    ...d,
    fullLegalName: name,
    age,
    dateOfBirth: `${taxYear - age}-03-12`,
    relationship: 'child',
    monthsLivedWith: 12,
    isStudent: age >= 18 && age <= 23,
    isDisabled: false,
    providedOwnSupport: false,
    anotherMayClaim: false,
    tinStatus: 'provided',
    tinLast4: '9999',
    interviewComplete: true,
  }
  return evaluateDependent(d, taxYear)
}

function base(over: Partial<TaxpayerProfile>): TaxpayerProfile {
  return { ...defaultProfile(), unresolvedKeys: [], answers: {}, ...over }
}

export interface SyntheticCase {
  id: string
  label: string
  profile: TaxpayerProfile
  /** Expected situation tags for assertions */
  expects: string[]
}

export function phase9SyntheticCorpus(): SyntheticCase[] {
  const y = 2025
  return [
    {
      id: 'single-wages',
      label: 'Single wage earner',
      profile: base({
        taxYear: y,
        filingStatus: 'single',
        wages: 52000,
        withholding: 6200,
        selfEmploymentIncome: 0,
        dependents: [],
      }),
      expects: ['filing:single'],
    },
    {
      id: 'mfj-wages',
      label: 'Married filing jointly',
      profile: base({
        taxYear: y,
        filingStatus: 'mfj',
        wages: 98000,
        withholding: 11000,
        selfEmploymentIncome: 0,
        dependents: [],
      }),
      expects: ['filing:mfj'],
    },
    {
      id: 'mfs-wages',
      label: 'Married filing separately',
      profile: base({
        taxYear: y,
        filingStatus: 'mfs',
        wages: 45000,
        withholding: 5000,
        dependents: [],
      }),
      expects: ['filing:mfs'],
    },
    {
      id: 'hoh-ctc',
      label: 'Head of household with CTC dependent',
      profile: base({
        taxYear: y,
        filingStatus: 'hoh',
        wages: 48000,
        withholding: 4200,
        dependents: [child(8, y, 'HoH Kid')],
      }),
      expects: ['filing:hoh', 'credit:ctc'],
    },
    {
      id: 'qss-proxy',
      label: 'QSS-like (Maximizer uses MFJ-style; IRS QSS via map note)',
      profile: base({
        taxYear: y,
        filingStatus: 'mfj',
        wages: 70000,
        withholding: 8000,
        dependents: [child(10, y)],
        answers: { qss_proxy: 'yes' },
      }),
      expects: ['filing:mfj', 'note:qss_proxy'],
    },
    {
      id: 'eitc-low',
      label: 'Low income with EITC child',
      profile: base({
        taxYear: y,
        filingStatus: 'single',
        wages: 18000,
        withholding: 800,
        dependents: [child(5, y, 'EITC Kid')],
      }),
      expects: ['credit:eitc', 'credit:ctc'],
    },
    {
      id: 'cdcc',
      label: 'Child care credit scenario',
      profile: base({
        taxYear: y,
        filingStatus: 'mfj',
        wages: 75000,
        withholding: 9000,
        childcarePaid: 4000,
        dependents: [child(4, y, 'Care Kid')],
      }),
      expects: ['credit:cdcc'],
    },
    {
      id: 'education',
      label: 'Education credit follow-up needed',
      profile: base({
        taxYear: y,
        filingStatus: 'single',
        wages: 55000,
        withholding: 6500,
        tuitionPaid: 8000,
        dependents: [],
      }),
      expects: ['education', 'unsupported_or_followup'],
    },
    {
      id: 'business-se',
      label: 'Business / SE income',
      profile: base({
        taxYear: y,
        filingStatus: 'single',
        wages: 20000,
        withholding: 2000,
        selfEmploymentIncome: 35000,
      }),
      expects: ['business'],
    },
    {
      id: 'rental-flag',
      label: 'Rental income situation (partial map)',
      profile: base({
        taxYear: y,
        filingStatus: 'single',
        wages: 60000,
        withholding: 7000,
        answers: { has_rental_income: 'yes', rental_net: 5000 },
      }),
      expects: ['rental_partial'],
    },
    {
      id: 'capital-gains-flag',
      label: 'Capital gains situation (partial map)',
      profile: base({
        taxYear: y,
        filingStatus: 'mfj',
        wages: 80000,
        withholding: 10000,
        answers: { has_capital_gains: 'yes' },
      }),
      expects: ['capital_gains_partial'],
    },
    {
      id: 'itemized',
      label: 'Itemized deductions',
      profile: base({
        taxYear: y,
        filingStatus: 'mfj',
        wages: 120000,
        withholding: 18000,
        mortgageInterest: 14000,
        propertyTax: 9000,
        charitableGifts: 4000,
        medicalExpenses: 2000,
      }),
      expects: ['itemized'],
    },
    {
      id: 'prior-2024',
      label: 'Prior-year TY2024',
      profile: base({
        taxYear: 2024,
        filingStatus: 'single',
        wages: 40000,
        withholding: 4500,
      }),
      expects: ['year:2024'],
    },
    {
      id: 'prior-2023',
      label: 'Prior-year TY2023',
      profile: base({
        taxYear: 2023,
        filingStatus: 'hoh',
        wages: 38000,
        withholding: 4000,
        dependents: [child(7, 2023)],
      }),
      expects: ['year:2023'],
    },
    {
      id: 'prior-2022',
      label: 'Prior-year TY2022',
      profile: base({
        taxYear: 2022,
        filingStatus: 'single',
        wages: 32000,
        withholding: 3500,
      }),
      expects: ['year:2022'],
    },
    {
      id: 'amended-flag',
      label: 'Amended return situation',
      profile: base({
        taxYear: y,
        filingStatus: 'single',
        wages: 50000,
        withholding: 5500,
        answers: { amending_prior_return: 'yes' },
      }),
      expects: ['amended'],
    },
    {
      id: 'unsupported-year',
      label: 'Unsupported tax year 2021',
      profile: base({
        taxYear: 2021,
        filingStatus: 'single',
        wages: 30000,
        withholding: 3000,
      }),
      expects: ['unsupported_tax_year'],
    },
  ]
}
