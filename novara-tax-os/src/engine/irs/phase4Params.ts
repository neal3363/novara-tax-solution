/**
 * Year-specific parameters for Phase 4 forms (TY2022–2025).
 * Sources: Rev. Procs., Form 8962/8995-A/8863/6251/8960 instructions, HHS FPL.
 * Isolated engine only — not production-ready claim.
 */

import type { IrsFilingStatus } from './types'

/** Continental US FPL by household size (1–8), used for Form 8962. */
export type FplTable = [number, number, number, number, number, number, number, number]

export interface Phase4YearParams {
  taxYear: number
  /** FPL for Form 8962 (tax-year table used in instructions) */
  fpl: FplTable
  /** QBI phase-in range above threshold: single-like / MFJ */
  qbiPhaseInRange: { singleLike: number; mfj: number }
  /** AMT exemption */
  amtExemption: Record<'single' | 'mfj' | 'mfs' | 'hoh' | 'qss', number>
  amtPhaseoutBegin: Record<'single' | 'mfj' | 'mfs' | 'hoh' | 'qss', number>
  /** 28% AMT rate starts above this taxable excess (approx) */
  amt28Threshold: number
  /** Education credit phaseout begins/ends */
  aotcPhaseout: { singleLike: [number, number]; mfj: [number, number] }
  llcPhaseout: { singleLike: [number, number]; mfj: [number, number] }
  sources: string[]
}

/** IRA-era applicable % of household income (Form 8962 Table 2 themes through TY2025). */
export function applicableFigure(pctOfFpl: number): number {
  if (pctOfFpl <= 1.5) return 0
  if (pctOfFpl <= 2.0) return 0.0 + ((pctOfFpl - 1.5) / 0.5) * 0.02
  if (pctOfFpl <= 2.5) return 0.02 + ((pctOfFpl - 2.0) / 0.5) * 0.02
  if (pctOfFpl <= 3.0) return 0.04 + ((pctOfFpl - 2.5) / 0.5) * 0.02
  if (pctOfFpl <= 4.0) return 0.06 + ((pctOfFpl - 3.0) / 1.0) * 0.025
  return 0.085
}

/** Excess APTC repayment limitation by % of FPL (Form 8962 Table 5 themes). */
export function aptcRepaymentLimit(
  pctOfFpl: number,
  filingStatus: IrsFilingStatus,
): number {
  const mfj = filingStatus === 'mfj' || filingStatus === 'qss'
  if (pctOfFpl < 2.0) return mfj ? 700 : 350
  if (pctOfFpl < 3.0) return mfj ? 1800 : 900
  if (pctOfFpl < 4.0) return mfj ? 3000 : 1500
  return Infinity // no limitation at/above 400% under pre-IRA tables; IRA may differ — document in notes
}

export const PHASE4_2022: Phase4YearParams = {
  taxYear: 2022,
  fpl: [13590, 18310, 23030, 27750, 32470, 37190, 41910, 46630],
  qbiPhaseInRange: { singleLike: 50000, mfj: 100000 },
  amtExemption: { single: 75900, mfj: 118100, mfs: 59050, hoh: 75900, qss: 118100 },
  amtPhaseoutBegin: { single: 539900, mfj: 1079800, mfs: 539900, hoh: 539900, qss: 1079800 },
  amt28Threshold: 206100,
  aotcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  llcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  sources: [
    'Form 8962 Instructions 2022; Pub 974',
    'Form 8995-A Instructions 2022',
    'Form 8863 Instructions 2022',
    'Form 6251 Instructions 2022; Rev. Proc. 2021-45 AMT',
    'Form 8960 Instructions 2022',
    'HHS FPL 2022 (48 contiguous states)',
  ],
}

export const PHASE4_2023: Phase4YearParams = {
  taxYear: 2023,
  fpl: [14580, 19720, 24860, 30000, 35140, 40280, 45420, 50560],
  qbiPhaseInRange: { singleLike: 50000, mfj: 100000 },
  amtExemption: { single: 81300, mfj: 126500, mfs: 63250, hoh: 81300, qss: 126500 },
  amtPhaseoutBegin: { single: 578150, mfj: 1156300, mfs: 578150, hoh: 578150, qss: 1156300 },
  amt28Threshold: 220700,
  aotcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  llcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  sources: [
    'Form 8962 Instructions 2023; Pub 974',
    'Form 8995-A Instructions 2023',
    'Form 8863 Instructions 2023',
    'Form 6251 Instructions 2023; Rev. Proc. 2022-38 AMT',
    'Form 8960 Instructions 2023',
    'HHS FPL 2023 (48 contiguous states)',
  ],
}

export const PHASE4_2024: Phase4YearParams = {
  taxYear: 2024,
  fpl: [15060, 20440, 25820, 31200, 36580, 41960, 47340, 52720],
  qbiPhaseInRange: { singleLike: 50000, mfj: 100000 },
  amtExemption: { single: 85700, mfj: 133300, mfs: 66650, hoh: 85700, qss: 133300 },
  amtPhaseoutBegin: { single: 609350, mfj: 1218700, mfs: 609350, hoh: 609350, qss: 1218700 },
  amt28Threshold: 232600,
  aotcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  llcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  sources: [
    'Form 8962 Instructions 2024; Pub 974',
    'Form 8995-A Instructions 2024',
    'Form 8863 Instructions 2024',
    'Form 6251 Instructions 2024; Rev. Proc. 2023-34 AMT',
    'Form 8960 Instructions 2024',
    'HHS FPL 2024 (48 contiguous states)',
  ],
}

export const PHASE4_2025: Phase4YearParams = {
  taxYear: 2025,
  fpl: [15650, 21150, 26650, 32150, 37650, 43150, 48650, 54150],
  qbiPhaseInRange: { singleLike: 50000, mfj: 100000 },
  amtExemption: { single: 88100, mfj: 137000, mfs: 68500, hoh: 88100, qss: 137000 },
  amtPhaseoutBegin: { single: 626350, mfj: 1252700, mfs: 626350, hoh: 626350, qss: 1252700 },
  amt28Threshold: 239100,
  aotcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  llcPhaseout: { singleLike: [80000, 90000], mfj: [160000, 180000] },
  sources: [
    'Form 8962 Instructions 2025 themes / Pub 974; Rev. Proc. 2024-40',
    'Form 8995-A Instructions 2025 themes',
    'Form 8863 Instructions 2025 themes',
    'Form 6251 / Rev. Proc. 2024-40 AMT',
    'Form 8960 Instructions 2025 themes',
    'HHS FPL 2025 (48 contiguous states)',
  ],
}

const BY_YEAR: Record<number, Phase4YearParams> = {
  2022: PHASE4_2022,
  2023: PHASE4_2023,
  2024: PHASE4_2024,
  2025: PHASE4_2025,
}

export function getPhase4Params(taxYear: number): Phase4YearParams | undefined {
  return BY_YEAR[taxYear]
}

export const NIIT_THRESHOLDS: Record<IrsFilingStatus, number> = {
  single: 200000,
  hoh: 200000,
  qss: 200000,
  mfj: 250000,
  mfs: 125000,
}

export const FORM_READINESS = {
  form8962: 'isolated-validated' as const,
  form8995A: 'isolated-validated' as const,
  form8863: 'isolated-validated' as const,
  scheduleB: 'isolated-validated' as const,
  scheduleD: 'isolated-validated' as const,
  scheduleE: 'isolated-validated' as const,
  form8582: 'isolated-validated' as const,
  form8949: 'isolated-validated' as const,
  form6251Amt: 'isolated-validated' as const,
  form8960Niit: 'isolated-validated' as const,
  form1040x: 'isolated-validated' as const,
  productionReady: false as const,
}
