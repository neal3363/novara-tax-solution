/**
 * Compare existing demo benefitOptimizer results to isolated IRS modules.
 * Read-only comparison — does not modify either engine.
 */

import { defaultProfile, runBenefitOptimization, type TaxpayerProfile } from '../benefitOptimizer'
import { emptyDependent, evaluateDependent } from '../dependentsEngine'
import { computeIrsFederalReturn, mapFilingStatus } from './federalReturn'
import type { IrsReturnInput, IrsReturnResult } from './types'

export interface DemoIrsComparison {
  taxYear: number
  label: string
  demoProjectedRefund: number
  irsRefundOrBalanceDue: number
  delta: number
  demoBaseRefund: number
  irsTaxableIncome: number
  irsIncomeTax: number
  irsEitc: number
  irsCtcActc: number
  notes: string[]
}

export function profileToIrsInput(profile: TaxpayerProfile): IrsReturnInput {
  return {
    taxYear: profile.taxYear,
    filingStatus: mapFilingStatus(profile.filingStatus === 'unknown' ? 'single' : profile.filingStatus),
    wages: profile.wages,
    withholding: profile.withholding,
    selfEmploymentNetProfit: profile.selfEmploymentIncome,
    qbiAmount: profile.selfEmploymentIncome > 0 ? profile.selfEmploymentIncome : 0,
    childcareExpenses: profile.childcarePaid,
    businessMiles: profile.businessMileage,
    educatorExpenses: profile.educatorExpenses,
    studentLoanInterest: profile.studentLoanInterest,
    itemizedDeductions:
      profile.mortgageInterest || profile.propertyTax || profile.charitableGifts || profile.medicalExpenses
        ? {
            mortgageInterest: profile.mortgageInterest,
            stateLocalTaxes: profile.propertyTax,
            charitable: profile.charitableGifts,
            medical: profile.medicalExpenses,
          }
        : undefined,
    dependents: profile.dependents.map((d) => {
      const e = evaluateDependent(d, profile.taxYear)
      return {
        qualifiesCtc: e.ctcEligible,
        qualifiesOdc: e.odcEligible,
        qualifiesEitcChild: e.eitcQualifyingChild,
        qualifiesCdcc: e.cdccQualifyingPerson,
      }
    }),
    marketplaceCoverage: profile.answers.had_marketplace === 'yes',
    investmentIncome: 0,
  }
}

export function compareDemoToIrs(profile: TaxpayerProfile, label: string): DemoIrsComparison {
  const demo = runBenefitOptimization(profile)
  const irs = computeIrsFederalReturn(profileToIrsInput(profile))
  return {
    taxYear: profile.taxYear,
    label,
    demoProjectedRefund: demo.projectedRefund,
    irsRefundOrBalanceDue: irs.refundOrBalanceDue,
    delta: demo.projectedRefund - irs.refundOrBalanceDue,
    demoBaseRefund: demo.baseRefund,
    irsTaxableIncome: irs.taxableIncome,
    irsIncomeTax: irs.incomeTaxBeforeCredits,
    irsEitc: irs.eitc,
    irsCtcActc: irs.ctc + irs.actc,
    notes: [
      ...irs.notes,
      `Demo ruleVersion=${demo.ruleVersion}`,
      `IRS engine=${irs.engine} TY${irs.taxYear}`,
    ],
  }
}

function childDep(age: number, taxYear: number) {
  let d = emptyDependent(0, taxYear)
  d = {
    ...d,
    fullLegalName: 'Sam Lee',
    age,
    dateOfBirth: `${taxYear - age}-06-15`,
    relationship: 'child',
    monthsLivedWith: 12,
    isStudent: true,
    isDisabled: false,
    providedOwnSupport: false,
    anotherMayClaim: false,
    tinStatus: 'provided',
    tinLast4: '1234',
    interviewComplete: true,
  }
  return evaluateDependent(d, taxYear)
}

export function sampleProfilesForComparison(): { label: string; profile: TaxpayerProfile }[] {
  const base = defaultProfile()
  const mk = (patch: Partial<TaxpayerProfile>, label: string) => {
    const p: TaxpayerProfile = {
      ...base,
      ...patch,
      answers: { ...base.answers, ...(patch.answers ?? {}) },
      dependents: patch.dependents ?? [],
    }
    return { label, profile: p }
  }

  return [
    mk(
      {
        taxYear: 2025,
        filingStatus: 'single',
        wages: 55000,
        withholding: 5500,
        selfEmploymentIncome: 0,
        answers: { married_dec31: 'No', potential_dependents: 'no' },
      },
      '2025 single wage earner',
    ),
    mk(
      {
        taxYear: 2024,
        filingStatus: 'mfj',
        wages: 90000,
        withholding: 9000,
        selfEmploymentIncome: 0,
        answers: { married_dec31: 'Yes', potential_dependents: 'no' },
      },
      '2024 MFJ wage earners',
    ),
    mk(
      {
        taxYear: 2023,
        filingStatus: 'hoh',
        wages: 42000,
        withholding: 3200,
        selfEmploymentIncome: 0,
        dependents: [childDep(8, 2023)],
        answers: { married_dec31: 'No', potential_dependents: 'yes' },
      },
      '2023 HOH with one CTC child',
    ),
    mk(
      {
        taxYear: 2022,
        filingStatus: 'single',
        wages: 20000,
        withholding: 800,
        selfEmploymentIncome: 15000,
        answers: { married_dec31: 'No', potential_dependents: 'no', self_employed: 'Yes' },
      },
      '2022 single with SE income',
    ),
  ]
}

export function runDemoIrsComparisonReport(): {
  rows: DemoIrsComparison[]
  irsSpot: IrsReturnResult
} {
  const rows = sampleProfilesForComparison().map((s) => compareDemoToIrs(s.profile, s.label))
  const irsSpot = computeIrsFederalReturn({
    taxYear: 2025,
    filingStatus: 'single',
    wages: 50000,
    withholding: 5000,
    selfEmploymentNetProfit: 0,
  })
  return { rows, irsSpot }
}
