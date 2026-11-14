/**
 * Phase 4 golden fixtures — independently derived expected values.
 * DO NOT paste computeIrsFederalReturn output into `expected`.
 */

import { applicableFigure } from '../phase4Params'
import { taxFromBrackets } from '../taxMath'
import type { GoldenFixture } from './types'

const B2025_SINGLE = [
  { upTo: 11925, rate: 0.1 },
  { upTo: 48475, rate: 0.12 },
  { upTo: 103350, rate: 0.22 },
  { upTo: 197300, rate: 0.24 },
  { upTo: 250525, rate: 0.32 },
  { upTo: 626350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
]

function bracketTax(taxable: number, bands: { upTo: number; rate: number }[]): number {
  return taxFromBrackets(taxable, bands)
}

// --- Form 8962 TY2025 worksheet ---
const ptcIncome = 40000
const ptcFpl = 15650 // PHASE4_2025 household size 1
const ptcPct = ptcIncome / ptcFpl
const ptcFig = applicableFigure(ptcPct)
const ptcContribution = Math.round(ptcIncome * ptcFig)
const ptcSlcsp = 8000
const ptcPremium = 6000
const ptcMax = Math.round(Math.min(Math.max(0, ptcSlcsp - ptcContribution), ptcPremium))
const ptcAptc = 3000
const ptcRefundable = Math.max(0, ptcMax - ptcAptc)
const ptcAgi = 40000
const ptcStd = 15000
const ptcTi = ptcAgi - ptcStd
const ptcIncTax = bracketTax(ptcTi, B2025_SINGLE)
// refund = WH - (tax - ptc) = 2000 - (ptcIncTax - ptcRefundable)
const ptcWh = 2000
const ptcRefund = ptcWh - (ptcIncTax - ptcRefundable)

// --- Form 8863 AOTC ---
const eduAgi = 50000
const eduTi = 35000
const eduTax = bracketTax(eduTi, B2025_SINGLE)
const aotcTotal = 2500 // 100%×2000 + 25%×2000
const aotcRef = 1000
const aotcNon = 1500
const eduWh = 5000
// netTax = tax - aotcNon - aotcRef; refund = WH - netTax
const eduRefund = eduWh - (eduTax - aotcNon - aotcRef)

// --- Schedule B + D ---
const bdWages = 60000
const bdInt = 2000
const bdDiv = 1000
const bdLtcg = 5000
const bdAgi = bdWages + bdInt + bdDiv + bdLtcg // 68000
const bdTi = bdAgi - 15000 // 53000
const bdQd = 1000
const bdNcg = 5000
// Preferential: ordinary TI = 53000 - 6000 = 47000; tax ordinary + 15% on NCG in 15% band
const bdOrdinaryTi = bdTi - (bdNcg + bdQd) // 47000
const bdOrdinaryTax = bracketTax(bdOrdinaryTi, B2025_SINGLE)
// NCG stacked from 47000 to 53000 — all within 15% band (zero ends 48350)
// slice 47000→48350 at 0%, 48350→53000 at 15%
const bdPrefTax = Math.round(bdOrdinaryTax + (53000 - 48350) * 0.15)
const bdWh = 8000
const bdRefund = bdWh - bdPrefTax

// --- Schedule E rental ---
const reWages = 50000
const reRentNet = 24000 - 10000 // 14000
const reAgi = reWages + reRentNet // 64000
const reTi = reAgi - 15000 // 49000
const reTax = bracketTax(reTi, B2025_SINGLE)
const reWh = 6000
const reRefund = reWh - reTax

// --- Form 8995-A below threshold (SSTB still allowed) ---
const qbiProfit = 80000
const qbiSeNese = Math.round(qbiProfit * 0.9235)
const qbiSeTax = Math.round(qbiSeNese * 0.153)
const qbiSeHalf = Math.round(qbiSeTax / 2)
const qbiAgi = qbiProfit - qbiSeHalf
const qbiStd = 15000
const qbiTiBefore = qbiAgi - qbiStd
const qbiDed = Math.min(Math.round(qbiProfit * 0.2), Math.round(qbiTiBefore * 0.2))
const qbiTi = qbiTiBefore - qbiDed
const qbiIncTax = bracketTax(qbiTi, B2025_SINGLE)

// --- NIIT + AMT via large LTCG (preferential regular tax < TMT) ---
const niitWages = 50000
const niitLtcg = 200000
const niitAgi = niitWages + niitLtcg // 250000
const niitStd = 15000
const niitTi = niitAgi - niitStd // 235000
const niitNcg = 200000
const niitOrdinaryTi = niitTi - niitNcg // 35000
const niitOrdinaryTax = bracketTax(niitOrdinaryTi, B2025_SINGLE)
// 0% band ends 48350: from 35000→48350 at 0%; 48350→235000 at 15%
const niitPrefTax = Math.round(niitOrdinaryTax + (235000 - 48350) * 0.15)
const niitAmti = niitTi + niitStd // 250000 std-ded add-back
const niitAmtTaxable = niitAmti - 88100 // 161900
const niitTmt = Math.round(niitAmtTaxable * 0.26)
const niitAmt = Math.max(0, niitTmt - niitPrefTax)
const niitNii = niitLtcg
const niitTax = Math.round(Math.min(niitNii, niitAgi - 200000) * 0.038) // 1900
const niitWh = 40000
const niitTotalTax = niitPrefTax + niitAmt + niitTax
const niitRefund = niitWh - niitTotalTax

// --- Multi dependent CTC ---
const mdWages = 45000
const mdAgi = 45000
const mdStd = 22500 // HOH
const mdTi = mdAgi - mdStd // 22500
const B2025_HOH = [
  { upTo: 17000, rate: 0.1 },
  { upTo: 64850, rate: 0.12 },
  { upTo: 103350, rate: 0.22 },
  { upTo: Infinity, rate: 0.37 },
]
const mdTax = bracketTax(mdTi, B2025_HOH)
const mdCtcPotential = 4000
const mdCtcNon = Math.min(mdCtcPotential, mdTax)
const mdActc = Math.min(mdCtcPotential - mdCtcNon, 3400, Math.round((mdWages - 2500) * 0.15))
// EITC blocked via high investment income
const mdWh = 2000
const mdRefund = mdWh - (mdTax - mdCtcNon - mdActc)

// --- Prior-year 2022 education LLC ---
const B2022_SINGLE = [
  { upTo: 10275, rate: 0.1 },
  { upTo: 41775, rate: 0.12 },
  { upTo: 89075, rate: 0.22 },
  { upTo: Infinity, rate: 0.37 },
]
const llcAgi = 55000
const llcTi = llcAgi - 12950 // 42050
const llcTax = bracketTax(llcTi, B2022_SINGLE)
const llcCredit = Math.round(Math.min(10000, 8000) * 0.2) // 1600
const llcUsed = Math.min(llcCredit, llcTax)
const llcWh = 6000
const llcRefund = llcWh - (llcTax - llcUsed)

export const PHASE4_GOLDEN_FIXTURES: GoldenFixture[] = [
  {
    id: 'ty2025-form8962-ptc',
    taxYear: 2025,
    label: '2025 Single — Form 8962 PTC with SLCSP benchmark',
    source: 'Form 8962 Instructions / Pub 974; HHS FPL 2025; IRA applicable % table themes',
    derivation: [
      `FPL size1=${ptcFpl}; income=${ptcIncome}; pctFPL=${ptcPct.toFixed(3)}`,
      `Applicable figure=${ptcFig.toFixed(5)}; contribution=${ptcContribution}`,
      `SLCSP=${ptcSlcsp}; enrollment=${ptcPremium}; maxPTC=${ptcMax}`,
      `APTC=${ptcAptc}; refundable PTC=${ptcRefundable}`,
      `TI=${ptcTi}; income tax=${ptcIncTax}; refund=${ptcRefund}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: 40000,
      withholding: ptcWh,
      selfEmploymentNetProfit: 0,
      marketplaceCoverage: true,
      annualPremium: ptcPremium,
      annualSlcsp: ptcSlcsp,
      aptcReceived: ptcAptc,
      householdSize: 1,
      householdIncomeForPtc: ptcIncome,
    },
    expected: {
      agi: ptcAgi,
      standardDeduction: ptcStd,
      taxableIncome: ptcTi,
      incomeTaxBeforeCredits: ptcIncTax,
      ptc: ptcRefundable,
      excessAptcRepayment: 0,
      refundOrBalanceDue: ptcRefund,
    },
  },
  {
    id: 'ty2025-form8863-aotc',
    taxYear: 2025,
    label: '2025 Single — Form 8863 American Opportunity Credit',
    source: 'Form 8863 Instructions — AOTC max $2,500; 40% refundable up to $1,000',
    derivation: [
      'Qualified expenses 4000 → AOTC = 2000 + 25%×2000 = 2500',
      'MAGI 50000 below phaseout 80000–90000',
      `Refundable 1000; nonrefundable 1500; tax ${eduTax}; refund ${eduRefund}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: 50000,
      withholding: eduWh,
      selfEmploymentNetProfit: 0,
      educationStudents: [{ creditType: 'aotc', qualifiedExpenses: 4000, eligible: true }],
    },
    expected: {
      agi: eduAgi,
      standardDeduction: 15000,
      taxableIncome: eduTi,
      incomeTaxBeforeCredits: eduTax,
      educationNonrefundable: aotcNon,
      educationRefundable: aotcRef,
      refundOrBalanceDue: eduRefund,
    },
  },
  {
    id: 'ty2025-sch-b-d-ltcg',
    taxYear: 2025,
    label: '2025 Single — Schedule B interest/dividends + Schedule D LTCG',
    source: 'Schedule B/D Instructions; Qualified Dividends and Capital Gain Tax Worksheet',
    derivation: [
      `AGI=${bdAgi}; TI=${bdTi}; ordinary TI=${bdOrdinaryTi}; pref tax=${bdPrefTax}`,
      'LTCG+QD in 0%/15% preferential bands (0% ends $48,350 Single TY2025)',
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: bdWages,
      withholding: bdWh,
      selfEmploymentNetProfit: 0,
      taxableInterest: bdInt,
      ordinaryDividends: bdDiv,
      qualifiedDividends: bdQd,
      longTermCapitalGainLoss: bdLtcg,
      shortTermCapitalGainLoss: 0,
    },
    expected: {
      agi: bdAgi,
      standardDeduction: 15000,
      taxableIncome: bdTi,
      incomeTaxBeforeCredits: bdPrefTax,
      scheduleBInterestDividends: bdInt + bdDiv,
      scheduleDNet: bdLtcg,
      refundOrBalanceDue: bdRefund,
    },
  },
  {
    id: 'ty2025-schedule-e-rental',
    taxYear: 2025,
    label: '2025 Single — Schedule E active rental',
    source: 'Schedule E (Form 1040) Instructions — rental net income',
    derivation: [
      `Rental net ${reRentNet}; AGI ${reAgi}; TI ${reTi}; tax ${reTax}`,
      'Active participation — loss limitation N/A (net positive)',
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: reWages,
      withholding: reWh,
      selfEmploymentNetProfit: 0,
      rentalIncome: 24000,
      rentalExpenses: 10000,
      rentalActivelyParticipating: true,
    },
    expected: {
      agi: reAgi,
      standardDeduction: 15000,
      taxableIncome: reTi,
      incomeTaxBeforeCredits: reTax,
      scheduleENet: reRentNet,
      refundOrBalanceDue: reRefund,
    },
  },
  {
    id: 'ty2025-form8995a-below-threshold',
    taxYear: 2025,
    label: '2025 Single — Form 8995-A QBI below threshold (SSTB allowed)',
    source: 'Form 8995-A Instructions — 20% QBI; SSTB allowed below threshold',
    derivation: [
      `SE profit ${qbiProfit}; SE tax ${qbiSeTax}; AGI ${qbiAgi}`,
      `QBI ded ${qbiDed}; TI ${qbiTi}; income tax ${qbiIncTax}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: 0,
      withholding: 0,
      selfEmploymentNetProfit: qbiProfit,
      qbiAmount: qbiProfit,
      qbiW2Wages: 20000,
      qbiUbia: 50000,
      qbiIsSstb: true,
    },
    expected: {
      agi: qbiAgi,
      standardDeduction: 15000,
      taxableIncome: qbiTi,
      incomeTaxBeforeCredits: qbiIncTax,
      seTax: qbiSeTax,
      qbiDeduction: qbiDed,
      refundOrBalanceDue: 0 - (qbiIncTax + qbiSeTax),
    },
  },
  {
    id: 'ty2025-niit-amt-high-income',
    taxYear: 2025,
    label: '2025 Single — NIIT (Form 8960) + AMT with large LTCG',
    source: 'Form 8960 Instructions IRC §1411; Form 6251 / Rev. Proc. 2024-40 AMT; Sch D QD/LTCG worksheet',
    derivation: [
      `AGI ${niitAgi}; LTCG ${niitLtcg}; preferential tax ${niitPrefTax}`,
      `AMTI ${niitAmti}; TMT ${niitTmt}; AMT ${niitAmt}; NIIT ${niitTax}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: niitWages,
      withholding: niitWh,
      selfEmploymentNetProfit: 0,
      longTermCapitalGainLoss: niitLtcg,
      shortTermCapitalGainLoss: 0,
    },
    expected: {
      agi: niitAgi,
      standardDeduction: 15000,
      taxableIncome: niitTi,
      incomeTaxBeforeCredits: niitPrefTax,
      niit: niitTax,
      amt: niitAmt,
      scheduleDNet: niitLtcg,
      refundOrBalanceDue: niitRefund,
    },
  },
  {
    id: 'ty2025-hoh-two-ctc-children',
    taxYear: 2025,
    label: '2025 HOH — two CTC dependents (multi-dependent)',
    source: 'Schedule 8812 Instructions — CTC $2,000; ACTC max $1,700/child',
    derivation: [
      `TI ${mdTi}; tax ${mdTax}; CTC nonref ${mdCtcNon}; ACTC ${mdActc}`,
      'EITC blocked via investment income over limit',
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'hoh',
      wages: mdWages,
      withholding: mdWh,
      selfEmploymentNetProfit: 0,
      investmentIncome: 50000,
      dependents: [
        { qualifiesCtc: true, qualifiesOdc: false, qualifiesEitcChild: false, qualifiesCdcc: false },
        { qualifiesCtc: true, qualifiesOdc: false, qualifiesEitcChild: false, qualifiesCdcc: false },
      ],
    },
    expected: {
      agi: mdAgi,
      standardDeduction: 22500,
      taxableIncome: mdTi,
      incomeTaxBeforeCredits: mdTax,
      ctcNonrefundable: mdCtcNon,
      actc: mdActc,
      eitc: 0,
      refundOrBalanceDue: mdRefund,
    },
  },
  {
    id: 'ty2022-form8863-llc',
    taxYear: 2022,
    label: '2022 Single — Form 8863 Lifetime Learning Credit (prior-year rules)',
    source: 'Form 8863 Instructions 2022 — LLC 20% of up to $10,000',
    derivation: [
      `Expenses 8000 → LLC ${llcCredit}; TI ${llcTi}; tax ${llcTax}; used ${llcUsed}`,
    ],
    input: {
      taxYear: 2022,
      filingStatus: 'single',
      wages: llcAgi,
      withholding: llcWh,
      selfEmploymentNetProfit: 0,
      educationStudents: [{ creditType: 'llc', qualifiedExpenses: 8000, eligible: true }],
    },
    expected: {
      agi: llcAgi,
      standardDeduction: 12950,
      taxableIncome: llcTi,
      incomeTaxBeforeCredits: llcTax,
      educationNonrefundable: llcUsed,
      educationRefundable: 0,
      refundOrBalanceDue: llcRefund,
    },
  },
  {
    id: 'ty2024-itemized-mfj',
    taxYear: 2024,
    label: '2024 MFJ — itemized deductions with SALT cap',
    source: 'Rev. Proc. 2023-34; IRC §164(b)(6) SALT cap $10,000',
    derivation: [
      'Itemized = 14000 mortgage + 10000 SALT + 6000 charity = 30000 > std 29200',
      'AGI 120000; TI 90000',
    ],
    input: {
      taxYear: 2024,
      filingStatus: 'mfj',
      wages: 120000,
      withholding: 15000,
      selfEmploymentNetProfit: 0,
      itemizedDeductions: {
        mortgageInterest: 14000,
        stateLocalTaxes: 18000,
        charitable: 6000,
      },
    },
    expected: {
      agi: 120000,
      standardDeduction: 29200,
      taxableIncome: 90000,
      incomeTaxBeforeCredits: taxFromBrackets(90000, [
        { upTo: 23200, rate: 0.1 },
        { upTo: 94300, rate: 0.12 },
        { upTo: 201050, rate: 0.22 },
        { upTo: Infinity, rate: 0.37 },
      ]),
      refundOrBalanceDue:
        15000 -
        taxFromBrackets(90000, [
          { upTo: 23200, rate: 0.1 },
          { upTo: 94300, rate: 0.12 },
          { upTo: 201050, rate: 0.22 },
          { upTo: Infinity, rate: 0.37 },
        ]),
    },
  },
]
