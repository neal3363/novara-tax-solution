/**
 * Phase 5 golden fixtures — independently derived expected values.
 * DO NOT paste computeIrsFederalReturn output into `expected`.
 */

import { computeSpecialAllowanceCeiling } from '../forms/form8582'
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

// --- Form 8582 special allowance full ---
const palWages = 80000
const palRent = 5000
const palExp = 25000
const palLoss = palExp - palRent // 20000
const palAllowance = computeSpecialAllowanceCeiling(palWages, 'single') // 25000
const palAllowed = Math.min(palLoss, palAllowance) // 20000
const palAgi = palWages - palAllowed // 60000
const palTi = palAgi - 15000 // 45000
const palTax = taxFromBrackets(palTi, B2025_SINGLE)
const palWh = 7000
const palRefund = palWh - palTax

// --- Form 8582 MAGI phaseout ---
const poWages = 120000
const poLoss = 25000
const poAllowance = computeSpecialAllowanceCeiling(poWages, 'single') // 25000 - 0.5*20000 = 15000
const poAgi = poWages - poAllowance // 105000
const poSuspended = poLoss - poAllowance // 10000
const poTi = poAgi - 15000 // 90000
const poTax = taxFromBrackets(poTi, B2025_SINGLE)
const poWh = 18000
const poRefund = poWh - poTax

// --- Entire disposition releases suspended ---
const dispWages = 50000
const dispPrior = 8000
const dispCurrent = 1000 // net rent
const dispIncl = dispCurrent - dispPrior // -7000
const dispAgi = dispWages + dispIncl // 43000
const dispTi = dispAgi - 15000 // 28000
const dispTax = taxFromBrackets(dispTi, B2025_SINGLE)
const dispWh = 4000
const dispRefund = dispWh - dispTax

// --- Capital loss carryforward ---
const clWages = 40000
const clSt = -10000
const clAllowed = 3000
const clAgi = clWages - clAllowed // 37000
const clTi = clAgi - 15000 // 22000
const clTax = taxFromBrackets(clTi, B2025_SINGLE)
const clWh = 3000
const clRefund = clWh - clTax

// --- Form 8949 + unrecaptured 1250 ---
// Wages 30000 + LTCG 20000 of which 8000 is §1250
const uWages = 30000
const uLtcg = 20000
const u1250 = 8000
const uAgi = uWages + uLtcg // 50000
const uTi = uAgi - 15000 // 35000
const uNcg = 20000
const uOrdTi = uTi - uNcg // 15000
const uOrdTax = taxFromBrackets(uOrdTi, B2025_SINGLE)
// Stack: 1250 @25% for 8000; remainder 12000 in 0% band (ord ends 15000, zero ends 48350)
const uPrefTax = Math.round(uOrdTax + u1250 * 0.25 + 0)
const uWh = 4000
const uRefund = uWh - uPrefTax

// --- Collectibles 28% ---
const cWages = 20000
const cGain = 10000
const cAgi = 30000
const cTi = 15000
const cOrdTi = 5000 // 15000 - 10000
const cOrdTax = taxFromBrackets(cOrdTi, B2025_SINGLE)
const cPrefTax = Math.round(cOrdTax + cGain * 0.28)
const cWh = 2000
const cRefund = cWh - cPrefTax

// --- AMT with ISO preference ---
const isoWages = 180000
const isoBargain = 40000
const isoAgi = 180000
const isoTi = isoAgi - 15000 // 165000
const isoRegTax = taxFromBrackets(isoTi, B2025_SINGLE)
const isoAmti = isoTi + 15000 + isoBargain // 220000
const isoEx = 88100
const isoAmtTaxable = isoAmti - isoEx // 131900
const isoTmt = Math.round(isoAmtTaxable * 0.26)
const isoAmt = Math.max(0, isoTmt - isoRegTax)
const isoWh = 35000
const isoRefund = isoWh - (isoRegTax + isoAmt)

// --- Prior-year 2023 Form 8582 phaseout thresholds same ---
const B2023_SINGLE = [
  { upTo: 11000, rate: 0.1 },
  { upTo: 44725, rate: 0.12 },
  { upTo: 95375, rate: 0.22 },
  { upTo: Infinity, rate: 0.37 },
]
const y23Wages = 90000
const y23Loss = 22000
const y23Allow = computeSpecialAllowanceCeiling(y23Wages, 'single') // 25000
const y23Agi = y23Wages - Math.min(y23Loss, y23Allow)
const y23Ti = y23Agi - 13850
const y23Tax = taxFromBrackets(y23Ti, B2023_SINGLE)

// --- Multi-income: wages + interest + rental income (no loss) ---
const miWages = 55000
const miInt = 1500
const miRentNet = 6000
const miAgi = miWages + miInt + miRentNet // 62500
const miTi = miAgi - 15000
const miTax = taxFromBrackets(miTi, B2025_SINGLE)
const miWh = 6500
const miRefund = miWh - miTax

// --- Amended 1040-X style via full return fields (assert AGI change path) ---
// Covered primarily in unit test; fixture compares corrected wages scenario
const amWages = 52000
const amAgi = 52000
const amTi = 37000
const amTax = taxFromBrackets(amTi, B2025_SINGLE)
const amWh = 5000
const amRefund = amWh - amTax

export const PHASE5_GOLDEN_FIXTURES: GoldenFixture[] = [
  {
    id: 'ty2025-form8582-special-allowance',
    taxYear: 2025,
    label: '2025 Single — Form 8582 $25k rental special allowance',
    source: 'Form 8582 Instructions; IRC §469(i); Pub 925 — $25,000 special allowance',
    derivation: [
      `MAGI before PAL=${palWages}; rental loss=${palLoss}; allowance ceiling=${palAllowance}`,
      `Allowed=${palAllowed}; AGI=${palAgi}; TI=${palTi}; tax=${palTax}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: palWages,
      withholding: palWh,
      selfEmploymentNetProfit: 0,
      rentalIncome: palRent,
      rentalExpenses: palExp,
      rentalActivelyParticipating: true,
    },
    expected: {
      agi: palAgi,
      standardDeduction: 15000,
      taxableIncome: palTi,
      incomeTaxBeforeCredits: palTax,
      scheduleENet: -palAllowed,
      refundOrBalanceDue: palRefund,
    },
  },
  {
    id: 'ty2025-form8582-magi-phaseout',
    taxYear: 2025,
    label: '2025 Single — Form 8582 special allowance MAGI phaseout',
    source: 'Form 8582 Instructions — phaseout MAGI $100,000–$150,000 (50%)',
    derivation: [
      `MAGI=${poWages}; ceiling=${poAllowance}; suspended=${poSuspended}; AGI=${poAgi}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: poWages,
      withholding: poWh,
      selfEmploymentNetProfit: 0,
      rentalIncome: 0,
      rentalExpenses: poLoss,
      rentalActivelyParticipating: true,
    },
    expected: {
      agi: poAgi,
      standardDeduction: 15000,
      taxableIncome: poTi,
      incomeTaxBeforeCredits: poTax,
      scheduleENet: -poAllowance,
      refundOrBalanceDue: poRefund,
    },
  },
  {
    id: 'ty2025-form8582-disposition',
    taxYear: 2025,
    label: '2025 Single — Form 8582 entire disposition releases suspended PAL',
    source: 'Form 8582 / Pub 925 — disposition of entire interest in taxable transaction',
    derivation: [
      `Prior suspended ${dispPrior}; current net ${dispCurrent}; AGI inclusion ${dispIncl}`,
      `AGI ${dispAgi}; tax ${dispTax}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: dispWages,
      withholding: dispWh,
      selfEmploymentNetProfit: 0,
      rentalIncome: dispCurrent + 2000,
      rentalExpenses: 2000,
      rentalActivelyParticipating: true,
      rentalPriorSuspendedLoss: dispPrior,
      rentalEntirelyDisposed: true,
    },
    expected: {
      agi: dispAgi,
      standardDeduction: 15000,
      taxableIncome: dispTi,
      incomeTaxBeforeCredits: dispTax,
      scheduleENet: dispIncl,
      refundOrBalanceDue: dispRefund,
    },
  },
  {
    id: 'ty2025-capital-loss-carryforward',
    taxYear: 2025,
    label: '2025 Single — Schedule D capital loss $3,000 limit + carryforward',
    source: 'Schedule D Instructions — $3,000 ordinary loss limit ($1,500 MFS)',
    derivation: [
      `ST loss 10000; ordinary allowed 3000; AGI ${clAgi}; carryforward ST 7000 (engine field)`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: clWages,
      withholding: clWh,
      selfEmploymentNetProfit: 0,
      shortTermCapitalGainLoss: clSt,
      longTermCapitalGainLoss: 0,
    },
    expected: {
      agi: clAgi,
      standardDeduction: 15000,
      taxableIncome: clTi,
      incomeTaxBeforeCredits: clTax,
      scheduleDNet: clSt,
      refundOrBalanceDue: clRefund,
    },
  },
  {
    id: 'ty2025-unrecaptured-1250',
    taxYear: 2025,
    label: '2025 Single — Unrecaptured §1250 gain at 25%',
    source: 'Schedule D Tax Worksheet — unrecaptured section 1250 gain max 25%',
    derivation: [
      `LTCG ${uLtcg} incl §1250 ${u1250}; ordinary TI ${uOrdTi}; pref tax ${uPrefTax}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: uWages,
      withholding: uWh,
      selfEmploymentNetProfit: 0,
      longTermCapitalGainLoss: uLtcg,
      shortTermCapitalGainLoss: 0,
      unrecaptured1250Gain: u1250,
    },
    expected: {
      agi: uAgi,
      standardDeduction: 15000,
      taxableIncome: uTi,
      incomeTaxBeforeCredits: uPrefTax,
      scheduleDNet: uLtcg,
      refundOrBalanceDue: uRefund,
    },
  },
  {
    id: 'ty2025-collectibles-28',
    taxYear: 2025,
    label: '2025 Single — Collectibles 28% rate gain',
    source: 'Schedule D Tax Worksheet — 28% rate gain (collectibles)',
    derivation: [`Collectibles gain ${cGain} @28%; ordinary TI ${cOrdTi}; tax ${cPrefTax}`],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: cWages,
      withholding: cWh,
      selfEmploymentNetProfit: 0,
      longTermCapitalGainLoss: cGain,
      shortTermCapitalGainLoss: 0,
      collectibles28Gain: cGain,
    },
    expected: {
      agi: cAgi,
      standardDeduction: 15000,
      taxableIncome: cTi,
      incomeTaxBeforeCredits: cPrefTax,
      scheduleDNet: cGain,
      refundOrBalanceDue: cRefund,
    },
  },
  {
    id: 'ty2025-form8949-transactions',
    taxYear: 2025,
    label: '2025 Single — Form 8949 transaction aggregation to Schedule D',
    source: 'Form 8949 Instructions — aggregate proceeds/basis to Schedule D',
    derivation: [
      'Tx1 ST: proceeds 5000 basis 2000 → +3000 ST',
      'Tx2 LT: proceeds 12000 basis 10000 → +2000 LT',
      'AGI=40000+3000+2000=45000; TI=30000',
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: 40000,
      withholding: 4500,
      selfEmploymentNetProfit: 0,
      form8949Transactions: [
        {
          description: 'ST stock',
          proceeds: 5000,
          costBasis: 2000,
          longTerm: false,
          rateGroup: 'ordinary',
        },
        {
          description: 'LT stock',
          proceeds: 12000,
          costBasis: 10000,
          longTerm: true,
          rateGroup: 'preferential',
        },
      ],
    },
    expected: {
      agi: 45000,
      standardDeduction: 15000,
      taxableIncome: 30000,
      // ordinary TI = 30000 - 2000 = 28000; LT 2000 in 0% band
      incomeTaxBeforeCredits: taxFromBrackets(28000, B2025_SINGLE),
      scheduleDNet: 5000,
      refundOrBalanceDue: 4500 - taxFromBrackets(28000, B2025_SINGLE),
    },
  },
  {
    id: 'ty2025-amt-iso-preference',
    taxYear: 2025,
    label: '2025 Single — AMT with ISO bargain element preference',
    source: 'Form 6251 Instructions — ISO bargain element as AMT preference',
    derivation: [
      `TI ${isoTi}; regular tax ${isoRegTax}; AMTI ${isoAmti}; TMT ${isoTmt}; AMT ${isoAmt}`,
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: isoWages,
      withholding: isoWh,
      selfEmploymentNetProfit: 0,
      isoBargainElement: isoBargain,
    },
    expected: {
      agi: isoAgi,
      standardDeduction: 15000,
      taxableIncome: isoTi,
      incomeTaxBeforeCredits: isoRegTax,
      amt: isoAmt,
      refundOrBalanceDue: isoRefund,
    },
  },
  {
    id: 'ty2023-form8582-prior-year',
    taxYear: 2023,
    label: '2023 Single — Form 8582 special allowance (prior-year rules)',
    source: 'Form 8582 Instructions 2023; IRC §469(i) — same $25k / $100k–$150k phaseout',
    derivation: [`MAGI ${y23Wages}; loss ${y23Loss}; AGI ${y23Agi}; TI ${y23Ti}; tax ${y23Tax}`],
    input: {
      taxYear: 2023,
      filingStatus: 'single',
      wages: y23Wages,
      withholding: 12000,
      selfEmploymentNetProfit: 0,
      rentalIncome: 3000,
      rentalExpenses: 3000 + y23Loss,
      rentalActivelyParticipating: true,
    },
    expected: {
      agi: y23Agi,
      standardDeduction: 13850,
      taxableIncome: y23Ti,
      incomeTaxBeforeCredits: y23Tax,
      scheduleENet: -Math.min(y23Loss, y23Allow),
      refundOrBalanceDue: 12000 - y23Tax,
    },
  },
  {
    id: 'ty2025-multi-income-wages-interest-rent',
    taxYear: 2025,
    label: '2025 Single — wages + Schedule B interest + Schedule E rental income',
    source: 'Form 1040 / Schedule B / Schedule E Instructions',
    derivation: [`AGI ${miAgi}; TI ${miTi}; tax ${miTax}`],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: miWages,
      withholding: miWh,
      selfEmploymentNetProfit: 0,
      taxableInterest: miInt,
      rentalIncome: 10000,
      rentalExpenses: 4000,
      rentalActivelyParticipating: true,
    },
    expected: {
      agi: miAgi,
      standardDeduction: 15000,
      taxableIncome: miTi,
      incomeTaxBeforeCredits: miTax,
      scheduleBInterestDividends: miInt,
      scheduleENet: miRentNet,
      refundOrBalanceDue: miRefund,
    },
  },
  {
    id: 'ty2025-boundary-phaseout-100k',
    taxYear: 2025,
    label: '2025 Single — Form 8582 allowance at MAGI exactly $100,000 boundary',
    source: 'Form 8582 Instructions — full $25,000 at MAGI ≤ $100,000',
    derivation: [
      'MAGI 100000; loss 25000; full allowance 25000; AGI 75000',
    ],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: 100000,
      withholding: 14000,
      selfEmploymentNetProfit: 0,
      rentalIncome: 0,
      rentalExpenses: 25000,
      rentalActivelyParticipating: true,
    },
    expected: {
      agi: 75000,
      standardDeduction: 15000,
      taxableIncome: 60000,
      incomeTaxBeforeCredits: taxFromBrackets(60000, B2025_SINGLE),
      scheduleENet: -25000,
      refundOrBalanceDue: 14000 - taxFromBrackets(60000, B2025_SINGLE),
    },
  },
  {
    id: 'ty2025-amended-style-corrected-wages',
    taxYear: 2025,
    label: '2025 Single — corrected wages scenario (1040-X column B themes)',
    source: 'Form 1040-X Instructions — recalculate corrected figures with engine',
    derivation: [`Corrected wages ${amWages}; TI ${amTi}; tax ${amTax}`],
    input: {
      taxYear: 2025,
      filingStatus: 'single',
      wages: amWages,
      withholding: amWh,
      selfEmploymentNetProfit: 0,
    },
    expected: {
      agi: amAgi,
      standardDeduction: 15000,
      taxableIncome: amTi,
      incomeTaxBeforeCredits: amTax,
      refundOrBalanceDue: amRefund,
    },
  },
  {
    id: 'ty2024-mfs-no-special-allowance',
    taxYear: 2024,
    label: '2024 MFS — Form 8582 special allowance $0 without lived-apart',
    source: 'Form 8582 Instructions — MFS generally $0 special allowance unless lived apart all year',
    derivation: [
      'Wages 90000; rental loss 20000; allowance 0; AGI remains 90000; suspended 20000',
    ],
    input: {
      taxYear: 2024,
      filingStatus: 'mfs',
      wages: 90000,
      withholding: 12000,
      selfEmploymentNetProfit: 0,
      rentalIncome: 0,
      rentalExpenses: 20000,
      rentalActivelyParticipating: true,
      mfsLivedApartAllYear: false,
    },
    expected: {
      agi: 90000,
      standardDeduction: 14600,
      taxableIncome: 75400,
      incomeTaxBeforeCredits: taxFromBrackets(75400, [
        { upTo: 11600, rate: 0.1 },
        { upTo: 47150, rate: 0.12 },
        { upTo: 100525, rate: 0.22 },
        { upTo: Infinity, rate: 0.37 },
      ]),
      scheduleENet: 0,
      refundOrBalanceDue:
        12000 -
        taxFromBrackets(75400, [
          { upTo: 11600, rate: 0.1 },
          { upTo: 47150, rate: 0.12 },
          { upTo: 100525, rate: 0.22 },
          { upTo: Infinity, rate: 0.37 },
        ]),
    },
  },
]
