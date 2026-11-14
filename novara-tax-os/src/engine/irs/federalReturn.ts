/**
 * Isolated IRS-based federal return calculator (TY2022–2025).
 * NOT wired into benefitOptimizer or Refund Maximizer UI.
 */

import { sourcesForYear } from './sources'
import { TABLES_2022 } from './tables2022'
import { TABLES_2023 } from './tables2023'
import { TABLES_2024 } from './tables2024'
import { TABLES_2025 } from './tables2025'
import type {
  IrsFilingStatus,
  IrsReturnInput,
  IrsReturnResult,
  TaxBracket,
  YearTaxTables,
} from './types'

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

export function taxFromBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  let prev = 0
  for (const b of brackets) {
    const slice = Math.min(taxableIncome, b.upTo) - prev
    if (slice > 0) tax += slice * b.rate
    if (taxableIncome <= b.upTo) break
    prev = b.upTo
  }
  return Math.round(tax)
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

function computeSeTax(netProfit: number, tables: YearTaxTables): { seTax: number; deductibleHalf: number; netEarnings: number } {
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
  const begin = status === 'mfj' || status === 'qss' ? tables.eitcPhaseoutBegin.mfj[k] : tables.eitcPhaseoutBegin.notMfj[k]
  const phaseoutRate = tables.eitcPhaseoutRate[k]
  const phaseBase = Math.max(agi, earned)
  if (phaseBase > begin) {
    credit = Math.max(0, credit - (phaseBase - begin) * phaseoutRate)
  }
  return Math.round(credit)
}

/**
 * Simplified PTC (Form 8962 themes): applicable % of household income toward premium,
 * credit = max(0, premium − requiredContribution). Repayment not fully modeled.
 */
function computePtc(input: IrsReturnInput, householdIncome: number): { ptc: number; note: string } {
  if (!input.marketplaceCoverage) return { ptc: 0, note: '' }
  const premium = input.annualPremium ?? 0
  const aptc = input.aptcReceived ?? 0
  if (premium <= 0) return { ptc: 0, note: 'Marketplace flagged but no premium provided' }
  // Applicable figure approximation (IRA expansion-era lower contribution for modest income)
  const fplApprox = 15060 // 2024/25 single FPL-ish anchor for simplified model
  const pctOfFpl = householdIncome / fplApprox
  let applicablePct = 0.085
  if (pctOfFpl <= 1.5) applicablePct = 0
  else if (pctOfFpl <= 2) applicablePct = 0.02
  else if (pctOfFpl <= 2.5) applicablePct = 0.04
  else if (pctOfFpl <= 3) applicablePct = 0.06
  else if (pctOfFpl <= 4) applicablePct = 0.085
  const required = householdIncome * applicablePct
  const allowed = Math.max(0, Math.round(premium - required))
  // Net PTC after APTC already received (simplified)
  const net = allowed - aptc
  return {
    ptc: net,
    note: `Simplified Form 8962 model (applicable≈${(applicablePct * 100).toFixed(1)}%); not a full SLCSP worksheet`,
  }
}

export function computeIrsFederalReturn(input: IrsReturnInput): IrsReturnResult {
  const tables = getYearTables(input.taxYear)
  const limitations: string[] = [
    'Isolated IRS module — not connected to live UI / benefitOptimizer.',
    'Form 8962 PTC uses a simplified applicable-% model (not full SLCSP).',
    'QBI uses Form 8995 simplified path (no SSTB wage/UBIA limitation worksheet).',
    'ACTC uses Schedule 8812 earned-income formula (simplified).',
  ]
  if (!tables) {
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
      totalTaxBeforeCredits: 0,
      nonrefundableCredits: 0,
      refundableCredits: 0,
      ctc: 0,
      actc: 0,
      odc: 0,
      eitc: 0,
      cdcc: 0,
      ptc: 0,
      taxAfterCredits: 0,
      totalPayments: 0,
      refundOrBalanceDue: 0,
      notes: [`Tax year ${input.taxYear} not supported in isolated IRS modules`],
      limitations,
    }
  }

  const notes: string[] = []
  const deps = input.dependents ?? []
  const se = computeSeTax(input.selfEmploymentNetProfit, tables)
  const educator = Math.min(input.educatorExpenses ?? 0, tables.educatorExpenseMax)
  const studentLoan = Math.min(input.studentLoanInterest ?? 0, tables.studentLoanMax)
  const mileageDeduction = Math.round((input.businessMiles ?? 0) * tables.mileageRate)

  // Schedule C net already provided as selfEmploymentNetProfit; mileage may reduce if not already netted
  const seProfit = Math.max(0, input.selfEmploymentNetProfit - (input.businessMiles ? 0 : 0))
  void seProfit
  void mileageDeduction

  let agi =
    input.wages +
    input.selfEmploymentNetProfit -
    se.deductibleHalf -
    educator -
    studentLoan
  agi = Math.max(0, Math.round(agi))

  const standard = tables.standardDeduction[input.filingStatus]
  const itemized = computeItemized(input, tables, agi)
  const usedItemized = itemized > standard
  const deductionTaken = usedItemized ? itemized : standard

  const qbiBase = Math.max(0, input.qbiAmount ?? input.selfEmploymentNetProfit)
  const threshold = input.filingStatus === 'mfj' || input.filingStatus === 'qss' ? tables.qbiThreshold.mfj : tables.qbiThreshold.singleLike
  let qbiDeduction = 0
  if (qbiBase > 0) {
    const tentative = qbiBase * tables.qbiDeductionRate
    // Simplified: full 20% below threshold; above threshold still allow basic 20% of QBI capped by 20% of TI (computed after)
    qbiDeduction = Math.round(tentative)
    if (agi > threshold) {
      notes.push('QBI above threshold — full Form 8995-A wage/UBIA limits not applied (simplified).')
    }
  }

  let taxableIncome = Math.max(0, agi - deductionTaken - qbiDeduction)
  // Cap QBI by 20% of taxable income before QBI (Form 8995)
  const qbiCap = Math.round(Math.max(0, agi - deductionTaken) * tables.qbiDeductionRate)
  if (qbiDeduction > qbiCap) {
    qbiDeduction = qbiCap
    taxableIncome = Math.max(0, agi - deductionTaken - qbiDeduction)
  }

  const incomeTaxBeforeCredits = taxFromBrackets(taxableIncome, tables.brackets[input.filingStatus])
  const totalTaxBeforeCredits = incomeTaxBeforeCredits + se.seTax

  const ctcKids = deps.filter((d) => d.qualifiesCtc).length
  const odcDeps = deps.filter((d) => d.qualifiesOdc).length
  const eitcKids = deps.filter((d) => d.qualifiesEitcChild).length
  const cdccKids = deps.filter((d) => d.qualifiesCdcc).length

  const ctcPotential = ctcKids * tables.ctcPerChild
  const odcPotential = odcDeps * tables.odcPerDependent

  // CDCC — Form 2441
  const cdccLimit =
    cdccKids >= 2 ? tables.cdccExpenseLimitTwoPlus : cdccKids === 1 ? tables.cdccExpenseLimitOne : 0
  const cdccExpenses = Math.min(input.childcareExpenses ?? 0, cdccLimit)
  const cdcc = Math.round(cdccExpenses * cdccRate(agi, tables))

  // Apply nonrefundable credits against income tax (not SE tax) — simplified ordering
  let taxLeft = incomeTaxBeforeCredits
  const odcUsed = Math.min(odcPotential, taxLeft)
  taxLeft -= odcUsed
  const cdccUsed = Math.min(cdcc, taxLeft)
  taxLeft -= cdccUsed
  const ctcNonrefundable = Math.min(ctcPotential, taxLeft)
  taxLeft -= ctcNonrefundable
  const nonrefundableCredits = odcUsed + cdccUsed + ctcNonrefundable

  // ACTC — remaining CTC refundable up to ACTC max with earned income formula
  const ctcRemaining = ctcPotential - ctcNonrefundable
  const earned = input.wages + Math.max(0, input.selfEmploymentNetProfit)
  const actcEarnedFormula = Math.max(0, Math.round((earned - 2500) * 0.15))
  const actcCap = ctcKids * tables.actcMaxPerChild
  const actc = Math.min(ctcRemaining, actcCap, actcEarnedFormula)

  const eitc = computeEitc(
    earned,
    agi,
    input.filingStatus,
    eitcKids,
    input.investmentIncome ?? 0,
    tables,
  )

  const ptcCalc = computePtc(input, input.householdIncomeForPtc ?? agi)
  if (ptcCalc.note) notes.push(ptcCalc.note)

  const refundableCredits = actc + eitc + Math.max(0, ptcCalc.ptc)
  // When refundable credits exceed remaining tax, netTax is negative → refund component
  const netTax = totalTaxBeforeCredits - nonrefundableCredits - refundableCredits
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
    totalTaxBeforeCredits,
    nonrefundableCredits,
    refundableCredits,
    ctc: ctcNonrefundable,
    actc,
    odc: odcUsed,
    eitc,
    cdcc: cdccUsed,
    ptc: ptcCalc.ptc,
    taxAfterCredits: Math.round(netTax),
    totalPayments: input.withholding,
    refundOrBalanceDue,
    notes,
    limitations,
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
