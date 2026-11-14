/**
 * Isolated IRS-based federal return calculator (TY2022–2025).
 * Phase 4 wires Form 8962, 8995-A, 8863, Schedules B/D/E, AMT, NIIT.
 * NOT wired into benefitOptimizer or Refund Maximizer UI.
 * NOT production-ready.
 */

import { FORM_READINESS } from './phase4Params'
import { computeForm6251 } from './forms/form6251Amt'
import { computeForm8863 } from './forms/form8863'
import { computeForm8960 } from './forms/form8960Niit'
import { computeForm8962 } from './forms/form8962'
import { computeForm8995A } from './forms/form8995A'
import { computeScheduleB } from './forms/scheduleB'
import { computeScheduleD } from './forms/scheduleD'
import { computeScheduleE } from './forms/scheduleE'
import { sourcesForYear } from './sources'
import { TABLES_2022 } from './tables2022'
import { TABLES_2023 } from './tables2023'
import { TABLES_2024 } from './tables2024'
import { TABLES_2025 } from './tables2025'
import { taxFromBrackets } from './taxMath'
import type {
  IrsFilingStatus,
  IrsReturnInput,
  IrsReturnResult,
  YearTaxTables,
} from './types'

export { taxFromBrackets }

const TABLES: Record<number, YearTaxTables> = {
  2022: TABLES_2022,
  2023: TABLES_2023,
  2024: TABLES_2024,
  2025: TABLES_2025,
}

export function getYearTables(taxYear: number): YearTaxTables | undefined {
  return TABLES[taxYear]
}

export function supportedIrsTaxYears(): number[] {
  return Object.keys(TABLES).map(Number).sort()
}

function cdccRate(agi: number, tables: YearTaxTables): number {
  for (const step of tables.cdccAgiRateSteps) {
    if (agi < step.agiBelow) return step.rate
  }
  return 0.2
}

function computeItemized(input: IrsReturnInput, tables: YearTaxTables, agi: number): number {
  const item = input.itemizedDeductions
  if (!item) return 0
  const salt = Math.min(item.stateLocalTaxes ?? 0, tables.saltCap)
  const medicalFloor = agi * 0.075
  const medical = Math.max(0, (item.medical ?? 0) - medicalFloor)
  return Math.round(
    (item.mortgageInterest ?? 0) + salt + (item.charitable ?? 0) + medical,
  )
}

function computeSeTax(
  netProfit: number,
  tables: YearTaxTables,
): { seTax: number; deductibleHalf: number; netEarnings: number } {
  if (netProfit <= 0) return { seTax: 0, deductibleHalf: 0, netEarnings: 0 }
  const netEarnings = Math.round(netProfit * 0.9235)
  const ssBase = Math.min(netEarnings, tables.ssWageBase)
  const ss = ssBase * 0.124
  const medicare = netEarnings * 0.029
  const seTax = Math.round(ss + medicare)
  return { seTax, deductibleHalf: Math.round(seTax / 2), netEarnings }
}

function computeEitc(
  earned: number,
  agi: number,
  status: IrsFilingStatus,
  kids: number,
  investmentIncome: number,
  tables: YearTaxTables,
): number {
  if (investmentIncome > tables.eitcInvestmentIncomeLimit) return 0
  if (status === 'mfs') return 0
  const k = Math.min(3, Math.max(0, kids)) as 0 | 1 | 2 | 3
  const maxCredit = tables.eitcMaxCredit[k]
  const phaseInEnd = tables.eitcEarnedIncomeAmount[k]
  const phaseRate = maxCredit / phaseInEnd
  let credit = earned <= 0 ? 0 : earned < phaseInEnd ? earned * phaseRate : maxCredit
  const begin =
    status === 'mfj' || status === 'qss'
      ? tables.eitcPhaseoutBegin.mfj[k]
      : tables.eitcPhaseoutBegin.notMfj[k]
  const phaseoutRate = tables.eitcPhaseoutRate[k]
  const phaseBase = Math.max(agi, earned)
  if (phaseBase > begin) {
    credit = Math.max(0, credit - (phaseBase - begin) * phaseoutRate)
  }
  return Math.round(credit)
}

function emptyResult(
  input: IrsReturnInput,
  notes: string[],
  limitations: string[],
): IrsReturnResult {
  return {
    engine: 'irs-isolated',
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    sources: [],
    agi: 0,
    standardDeduction: 0,
    itemizedDeduction: 0,
    deductionTaken: 0,
    usedItemized: false,
    qbiDeduction: 0,
    taxableIncome: 0,
    incomeTaxBeforeCredits: 0,
    seTax: 0,
    amt: 0,
    niit: 0,
    totalTaxBeforeCredits: 0,
    nonrefundableCredits: 0,
    refundableCredits: 0,
    ctc: 0,
    actc: 0,
    odc: 0,
    eitc: 0,
    cdcc: 0,
    ptc: 0,
    excessAptcRepayment: 0,
    educationNonrefundable: 0,
    educationRefundable: 0,
    scheduleBInterestDividends: 0,
    scheduleDNet: 0,
    scheduleENet: 0,
    taxAfterCredits: 0,
    totalPayments: 0,
    refundOrBalanceDue: 0,
    notes,
    limitations,
    formReadiness: { ...FORM_READINESS, productionReady: 'false' },
  }
}

export function computeIrsFederalReturn(input: IrsReturnInput): IrsReturnResult {
  const tables = getYearTables(input.taxYear)
  const limitations: string[] = [
    'Isolated IRS module — not connected to live UI / benefitOptimizer.',
    'NOT production-ready — dual-run / golden validation only.',
    'Schedule E passive loss (Form 8582) is isolated-partial.',
    'ACTC uses Schedule 8812 earned-income formula (simplified ordering).',
  ]
  if (!tables) {
    return emptyResult(input, [`Tax year ${input.taxYear} not supported in isolated IRS modules`], limitations)
  }

  const notes: string[] = []
  const deps = input.dependents ?? []
  const se = computeSeTax(input.selfEmploymentNetProfit, tables)
  const educator = Math.min(input.educatorExpenses ?? 0, tables.educatorExpenseMax)
  const studentLoan = Math.min(input.studentLoanInterest ?? 0, tables.studentLoanMax)

  // Schedule B
  const schB = computeScheduleB({
    taxableInterest: input.taxableInterest ?? 0,
    taxExemptInterest: input.taxExemptInterest ?? 0,
    ordinaryDividends: input.ordinaryDividends ?? 0,
    qualifiedDividends: input.qualifiedDividends ?? 0,
    foreignAccounts: input.foreignAccounts,
  })

  // Schedule E
  const hasSchE =
    (input.rentalIncome ?? 0) > 0 ||
    (input.rentalExpenses ?? 0) > 0 ||
    (input.royaltyIncome ?? 0) > 0 ||
    (input.k1OrdinaryIncome ?? 0) !== 0
  const schE = hasSchE
    ? computeScheduleE({
        properties:
          (input.rentalIncome ?? 0) > 0 ||
          (input.rentalExpenses ?? 0) > 0 ||
          (input.royaltyIncome ?? 0) > 0
            ? [
                {
                  rentsReceived: input.rentalIncome ?? 0,
                  royaltiesReceived: input.royaltyIncome ?? 0,
                  expenses: input.rentalExpenses ?? 0,
                  activelyParticipating: input.rentalActivelyParticipating ?? true,
                },
              ]
            : [],
        k1s:
          input.k1OrdinaryIncome !== undefined
            ? [{ ordinaryIncome: input.k1OrdinaryIncome, passive: false }]
            : [],
      })
    : null
  if (schE) notes.push(...schE.notes)

  // Schedule D net for AGI (gains/losses before preferential tax)
  const hasSchD =
    (input.shortTermCapitalGainLoss ?? 0) !== 0 ||
    (input.longTermCapitalGainLoss ?? 0) !== 0 ||
    (input.shortTermCapitalLossCarryover ?? 0) !== 0 ||
    (input.longTermCapitalLossCarryover ?? 0) !== 0

  // Preliminary AGI pieces before capital loss limitation needs TI — use Sch D net then limit loss
  let capitalForAgi = 0
  if (hasSchD) {
    const st =
      Math.round(input.shortTermCapitalGainLoss ?? 0) -
      Math.max(0, Math.round(input.shortTermCapitalLossCarryover ?? 0))
    const lt =
      Math.round(input.longTermCapitalGainLoss ?? 0) -
      Math.max(0, Math.round(input.longTermCapitalLossCarryover ?? 0))
    const net = st + lt
    const lossLimit = input.filingStatus === 'mfs' ? 1500 : 3000
    capitalForAgi = net >= 0 ? net : -Math.min(lossLimit, -net)
  }

  let agi =
    input.wages +
    input.selfEmploymentNetProfit -
    se.deductibleHalf -
    educator -
    studentLoan +
    schB.agiInclusion +
    capitalForAgi +
    (schE?.agiInclusion ?? 0)
  agi = Math.max(0, Math.round(agi))

  const standard = tables.standardDeduction[input.filingStatus]
  const itemized = computeItemized(input, tables, agi)
  const usedItemized = itemized > standard
  const deductionTaken = usedItemized ? itemized : standard
  const saltDeducted = usedItemized
    ? Math.min(input.itemizedDeductions?.stateLocalTaxes ?? 0, tables.saltCap)
    : 0

  const qbiBase = Math.max(0, input.qbiAmount ?? input.selfEmploymentNetProfit)
  const tiBeforeQbi = Math.max(0, agi - deductionTaken)

  let qbiDeduction = 0
  const use8995A =
    qbiBase > 0 &&
    (input.qbiW2Wages !== undefined ||
      input.qbiUbia !== undefined ||
      input.qbiIsSstb !== undefined ||
      input.qbiReitPtp !== undefined)

  if (qbiBase > 0 || (input.qbiReitPtp ?? 0) > 0) {
    if (use8995A) {
      const qbiRes = computeForm8995A({
        taxYear: input.taxYear,
        filingStatus: input.filingStatus,
        qbi: qbiBase,
        taxableIncomeBeforeQbi: tiBeforeQbi,
        reitPtp: input.qbiReitPtp,
        w2Wages: input.qbiW2Wages ?? 0,
        ubia: input.qbiUbia ?? 0,
        isSstb: !!input.qbiIsSstb,
        tables,
      })
      qbiDeduction = qbiRes.qbiDeduction
      notes.push(...qbiRes.notes)
    } else if (qbiBase > 0) {
      qbiDeduction = Math.round(qbiBase * tables.qbiDeductionRate)
      const threshold =
        input.filingStatus === 'mfj' || input.filingStatus === 'qss'
          ? tables.qbiThreshold.mfj
          : tables.qbiThreshold.singleLike
      if (agi > threshold) {
        notes.push('QBI above threshold without 8995-A inputs — using Form 8995 simplified path.')
      }
      const qbiCap = Math.round(tiBeforeQbi * tables.qbiDeductionRate)
      if (qbiDeduction > qbiCap) qbiDeduction = qbiCap
    }
  }

  let taxableIncome = Math.max(0, agi - deductionTaken - qbiDeduction)

  // Preferential capital gains tax when Schedule D / QD present
  let incomeTaxBeforeCredits = taxFromBrackets(taxableIncome, tables.brackets[input.filingStatus])
  let scheduleDNet = capitalForAgi
  if (hasSchD || (input.qualifiedDividends ?? 0) > 0) {
    const schD = computeScheduleD({
      filingStatus: input.filingStatus,
      shortTermGainLoss: input.shortTermCapitalGainLoss ?? 0,
      longTermGainLoss: input.longTermCapitalGainLoss ?? 0,
      shortTermCarryover: input.shortTermCapitalLossCarryover,
      longTermCarryover: input.longTermCapitalLossCarryover,
      qualifiedDividends: input.qualifiedDividends ?? schB.qualifiedDividends,
      taxableIncome,
      tables,
    })
    scheduleDNet = schD.netCapitalGainLoss
    if (schD.netCapitalGain + (input.qualifiedDividends ?? schB.qualifiedDividends) > 0) {
      incomeTaxBeforeCredits = schD.taxWithPreferentialRates
      notes.push(...schD.notes)
    }
  }

  // Form 6251 AMT
  const amtRes = computeForm6251({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    taxableIncome,
    regularTax: incomeTaxBeforeCredits,
    standardDeductionTaken: usedItemized ? 0 : standard,
    usedItemized,
    saltDeducted,
  })
  const amt = amtRes.amt
  if (amt > 0) notes.push(...amtRes.notes)

  // Form 8960 NIIT
  const nii =
    schB.taxableInterest +
    schB.ordinaryDividends +
    Math.max(0, capitalForAgi) +
    Math.max(0, schE?.rentalNet ?? 0) +
    Math.max(0, schE?.royaltyNet ?? 0) +
    (input.investmentIncome ?? 0)
  const niitRes = computeForm8960({
    filingStatus: input.filingStatus,
    magi: agi,
    netInvestmentIncome: nii,
  })
  const niit = niitRes.niit
  if (niit > 0) notes.push(...niitRes.notes)

  const totalTaxBeforeCredits = incomeTaxBeforeCredits + se.seTax + amt + niit

  const ctcKids = deps.filter((d) => d.qualifiesCtc).length
  const odcDeps = deps.filter((d) => d.qualifiesOdc).length
  const eitcKids = deps.filter((d) => d.qualifiesEitcChild).length
  const cdccKids = deps.filter((d) => d.qualifiesCdcc).length

  const ctcPotential = ctcKids * tables.ctcPerChild
  const odcPotential = odcDeps * tables.odcPerDependent

  const cdccLimit =
    cdccKids >= 2 ? tables.cdccExpenseLimitTwoPlus : cdccKids === 1 ? tables.cdccExpenseLimitOne : 0
  const cdccExpenses = Math.min(input.childcareExpenses ?? 0, cdccLimit)
  const cdcc = Math.round(cdccExpenses * cdccRate(agi, tables))

  // Form 8863
  let educationNonrefundable = 0
  let educationRefundable = 0
  if (input.educationStudents && input.educationStudents.length > 0) {
    const edu = computeForm8863({
      taxYear: input.taxYear,
      filingStatus: input.filingStatus,
      magi: agi,
      students: input.educationStudents,
    })
    educationNonrefundable = edu.totalNonrefundable
    educationRefundable = edu.totalRefundable
    notes.push(...edu.notes)
  }

  let taxLeft = incomeTaxBeforeCredits
  const eduUsed = Math.min(educationNonrefundable, taxLeft)
  taxLeft -= eduUsed
  const odcUsed = Math.min(odcPotential, taxLeft)
  taxLeft -= odcUsed
  const cdccUsed = Math.min(cdcc, taxLeft)
  taxLeft -= cdccUsed
  const ctcNonrefundable = Math.min(ctcPotential, taxLeft)
  taxLeft -= ctcNonrefundable
  const nonrefundableCredits = eduUsed + odcUsed + cdccUsed + ctcNonrefundable

  const ctcRemaining = ctcPotential - ctcNonrefundable
  const earned = input.wages + Math.max(0, input.selfEmploymentNetProfit)
  const actcEarnedFormula = Math.max(0, Math.round((earned - 2500) * 0.15))
  const actcCap = ctcKids * tables.actcMaxPerChild
  const actc = Math.min(ctcRemaining, actcCap, actcEarnedFormula)

  const eitcInvestment =
    (input.investmentIncome ?? 0) + schB.taxableInterest + schB.ordinaryDividends + Math.max(0, capitalForAgi)
  const eitc = computeEitc(
    earned,
    agi,
    input.filingStatus,
    eitcKids,
    eitcInvestment,
    tables,
  )

  // Form 8962
  let ptc = 0
  let excessAptcRepayment = 0
  const marketplaceActive =
    !!input.marketplaceCoverage ||
    (input.annualPremium ?? 0) > 0 ||
    (input.annualSlcsp ?? 0) > 0 ||
    (input.marketplaceMonths?.length ?? 0) > 0
  if (marketplaceActive) {
    const f8962 = computeForm8962({
      taxYear: input.taxYear,
      filingStatus: input.filingStatus,
      householdIncome: input.householdIncomeForPtc ?? agi,
      householdSize: input.householdSize ?? 1 + deps.length,
      annualEnrollmentPremium: input.annualPremium,
      annualSlcsp: input.annualSlcsp ?? input.annualPremium,
      months: input.marketplaceMonths,
      aptcReceived: input.aptcReceived ?? 0,
    })
    ptc = f8962.refundablePtc
    excessAptcRepayment = f8962.additionalTax
    notes.push(...f8962.notes)
  }

  const refundableCredits = actc + eitc + Math.max(0, ptc) + educationRefundable
  const additionalTaxes = excessAptcRepayment
  const netTax =
    totalTaxBeforeCredits + additionalTaxes - nonrefundableCredits - refundableCredits
  const refundOrBalanceDue = Math.round(input.withholding - netTax)

  return {
    engine: 'irs-isolated',
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    sources: sourcesForYear(input.taxYear),
    agi,
    standardDeduction: standard,
    itemizedDeduction: itemized,
    deductionTaken,
    usedItemized,
    qbiDeduction,
    taxableIncome,
    incomeTaxBeforeCredits,
    seTax: se.seTax,
    amt,
    niit,
    totalTaxBeforeCredits,
    nonrefundableCredits,
    refundableCredits,
    ctc: ctcNonrefundable,
    actc,
    odc: odcUsed,
    eitc,
    cdcc: cdccUsed,
    ptc,
    excessAptcRepayment,
    educationNonrefundable: eduUsed,
    educationRefundable,
    scheduleBInterestDividends: schB.agiInclusion,
    scheduleDNet,
    scheduleENet: schE?.agiInclusion ?? 0,
    taxAfterCredits: Math.round(netTax),
    totalPayments: input.withholding,
    refundOrBalanceDue,
    notes,
    limitations,
    formReadiness: {
      form8962: FORM_READINESS.form8962,
      form8995A: FORM_READINESS.form8995A,
      form8863: FORM_READINESS.form8863,
      scheduleB: FORM_READINESS.scheduleB,
      scheduleD: FORM_READINESS.scheduleD,
      scheduleE: FORM_READINESS.scheduleE,
      form6251Amt: FORM_READINESS.form6251Amt,
      form8960Niit: FORM_READINESS.form8960Niit,
      form1040x: FORM_READINESS.form1040x,
      productionReady: String(FORM_READINESS.productionReady),
    },
  }
}

export function mapFilingStatus(fs: string): IrsFilingStatus {
  const v = fs.toLowerCase()
  if (v === 'mfj' || v === 'married_joint') return 'mfj'
  if (v === 'mfs' || v === 'married_separate') return 'mfs'
  if (v === 'hoh') return 'hoh'
  if (v === 'qss' || v === 'qw') return 'qss'
  return 'single'
}
