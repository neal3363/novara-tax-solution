/**
 * State tax tables — prioritized by interview/customer states: TX, FL, CA, NY.
 * IL included as staging candidate. Do not claim nationwide support.
 * Figures are staging models derived from published authority materials;
 * each state carries an explicit validationStatus.
 */

import type { StateCode, StateYearTables } from '../types'

const CA_2024_SINGLE = [
  { upTo: 10_412, rate: 0.01 },
  { upTo: 24_668, rate: 0.02 },
  { upTo: 38_959, rate: 0.04 },
  { upTo: 54_081, rate: 0.06 },
  { upTo: 68_350, rate: 0.08 },
  { upTo: 349_137, rate: 0.093 },
  { upTo: 418_961, rate: 0.103 },
  { upTo: 1_000_000, rate: 0.113 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.123 },
]

const CA_2024_MFJ = [
  { upTo: 20_824, rate: 0.01 },
  { upTo: 49_336, rate: 0.02 },
  { upTo: 77_918, rate: 0.04 },
  { upTo: 108_162, rate: 0.06 },
  { upTo: 136_700, rate: 0.08 },
  { upTo: 698_274, rate: 0.093 },
  { upTo: 837_922, rate: 0.103 },
  { upTo: 1_000_000, rate: 0.113 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.123 },
]

const NY_2024_SINGLE = [
  { upTo: 8_500, rate: 0.04 },
  { upTo: 11_700, rate: 0.045 },
  { upTo: 13_900, rate: 0.0525 },
  { upTo: 80_650, rate: 0.055 },
  { upTo: 215_400, rate: 0.06 },
  { upTo: 1_077_550, rate: 0.0685 },
  { upTo: 5_000_000, rate: 0.0965 },
  { upTo: 25_000_000, rate: 0.103 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.109 },
]

const NY_2024_MFJ = [
  { upTo: 17_150, rate: 0.04 },
  { upTo: 23_600, rate: 0.045 },
  { upTo: 27_900, rate: 0.0525 },
  { upTo: 161_550, rate: 0.055 },
  { upTo: 323_200, rate: 0.06 },
  { upTo: 2_155_350, rate: 0.0685 },
  { upTo: 5_000_000, rate: 0.0965 },
  { upTo: 25_000_000, rate: 0.103 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.109 },
]

const IL_FLAT = [{ upTo: Number.POSITIVE_INFINITY, rate: 0.0495 }]

function noIncomeTax(stateCode: StateCode, stateName: string, taxYear: number): StateYearTables {
  return {
    taxYear,
    stateCode,
    stateName,
    hasPersonalIncomeTax: false,
    standardDeduction: { single: 0, mfj: 0, mfs: 0, hoh: 0 },
    brackets: { single: [], mfj: [] },
    sources: [`${stateName} — no personal income tax (validated fact)`],
    validationStatus: 'validated_no_income_tax',
    notes: [
      `${stateName} does not impose a personal income tax.`,
      'Refund/balance due is driven only by any state withholding overpayment themes.',
      'Do not claim nationwide state filing support.',
    ],
  }
}

function caTables(taxYear: number): StateYearTables {
  return {
    taxYear,
    stateCode: 'CA',
    stateName: 'California',
    hasPersonalIncomeTax: true,
    // FTB published standard deduction approx (staging model; inflate lightly for TY2025)
    standardDeduction: {
      single: taxYear >= 2025 ? 5_540 : 5_363,
      mfj: taxYear >= 2025 ? 11_080 : 10_726,
      mfs: taxYear >= 2025 ? 5_540 : 5_363,
      hoh: taxYear >= 2025 ? 11_080 : 10_726,
    },
    brackets: { single: CA_2024_SINGLE, mfj: CA_2024_MFJ },
    credits: [{ id: 'ca_renter', label: 'CA renter credit (eligibility stub)', maxAmount: 60 }],
    sources: [
      'California Franchise Tax Board — Personal Income Tax brackets / standard deduction publications',
      'FTB Form 540 instructions (staging model)',
    ],
    validationStatus: 'staging_validated',
    notes: [
      'Staging-validated CA PIT model for golden tests — not production e-file ready.',
      'Mental Health Services Tax / local add-ons not fully modeled.',
      'Part-year and nonresident Form 540NR allocation is simplified ratio-based.',
    ],
  }
}

function nyTables(taxYear: number): StateYearTables {
  return {
    taxYear,
    stateCode: 'NY',
    stateName: 'New York',
    hasPersonalIncomeTax: true,
    standardDeduction: {
      single: taxYear >= 2025 ? 8_000 : 8_000,
      mfj: taxYear >= 2025 ? 16_050 : 16_050,
      mfs: taxYear >= 2025 ? 8_000 : 8_000,
      hoh: taxYear >= 2025 ? 11_200 : 11_200,
    },
    brackets: { single: NY_2024_SINGLE, mfj: NY_2024_MFJ },
    credits: [{ id: 'ny_eitc', label: 'NY EITC (stub — needs federal EITC)', maxAmount: 0 }],
    sources: [
      'NYS Department of Taxation and Finance — personal income tax rate schedules',
      'IT-201 / IT-203 instructions (staging model)',
    ],
    validationStatus: 'staging_validated',
    notes: [
      'Staging-validated NY PIT model — NYC / Yonkers local taxes not included.',
      'Nonresident / part-year Form IT-203 allocation is simplified.',
    ],
  }
}

function ilTables(taxYear: number): StateYearTables {
  return {
    taxYear,
    stateCode: 'IL',
    stateName: 'Illinois',
    hasPersonalIncomeTax: true,
    standardDeduction: { single: 0, mfj: 0, mfs: 0, hoh: 0 },
    brackets: { single: IL_FLAT, mfj: IL_FLAT },
    personalExemption: taxYear >= 2024 ? 2_425 : 2_425,
    sources: ['Illinois Department of Revenue — flat individual income tax rate publications'],
    validationStatus: 'staging_validated',
    notes: [
      'IL uses a flat rate; exemption allowance modeled simply.',
      'Local taxes not included. Staging only.',
    ],
  }
}

/** Supported tax years for state modules */
export const STATE_SUPPORTED_YEARS = [2022, 2023, 2024, 2025] as const

export function getStateTables(stateCode: string, taxYear: number): StateYearTables | null {
  const code = normalizeStateCode(stateCode)
  if (!STATE_SUPPORTED_YEARS.includes(taxYear as (typeof STATE_SUPPORTED_YEARS)[number])) {
    return null
  }
  switch (code) {
    case 'TX':
      return noIncomeTax('TX', 'Texas', taxYear)
    case 'FL':
      return noIncomeTax('FL', 'Florida', taxYear)
    case 'CA':
      return caTables(taxYear)
    case 'NY':
      return nyTables(taxYear)
    case 'IL':
      return ilTables(taxYear)
    default:
      return null
  }
}

export function normalizeStateCode(raw: string): StateCode {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (s === 'tx' || s === 'texas') return 'TX'
  if (s === 'fl' || s === 'florida') return 'FL'
  if (s === 'ca' || s === 'california') return 'CA'
  if (s === 'ny' || s === 'new york' || s === 'newyork') return 'NY'
  if (s === 'il' || s === 'illinois') return 'IL'
  if (s.length === 2) return s.toUpperCase()
  return 'OTHER'
}

export function listPrioritizedStates(): {
  code: StateCode
  name: string
  priorityReason: string
  validationStatus: string
}[] {
  return [
    {
      code: 'TX',
      name: 'Texas',
      priorityReason: 'Interview filing_state choice; verified no PIT',
      validationStatus: 'validated_no_income_tax',
    },
    {
      code: 'FL',
      name: 'Florida',
      priorityReason: 'Interview filing_state choice; verified no PIT',
      validationStatus: 'validated_no_income_tax',
    },
    {
      code: 'CA',
      name: 'California',
      priorityReason: 'Interview filing_state choice; high volume',
      validationStatus: 'staging_validated',
    },
    {
      code: 'NY',
      name: 'New York',
      priorityReason: 'Interview filing_state choice; high volume',
      validationStatus: 'staging_validated',
    },
    {
      code: 'IL',
      name: 'Illinois',
      priorityReason: 'Flat-rate staging candidate',
      validationStatus: 'staging_validated',
    },
  ]
}
