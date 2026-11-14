/**
 * Official IRS source references for isolated tax-year calculation modules.
 * These modules are NOT yet wired into benefitOptimizer / Refund Maximizer UI.
 */

export interface IrsSourceRef {
  taxYear: number
  citations: string[]
}

/** Documented sources used to populate tables and worksheets in this package. */
export const IRS_SOURCES: IrsSourceRef[] = [
  {
    taxYear: 2022,
    citations: [
      'IRS Rev. Proc. 2021-45 (TY2022 inflation adjustments — brackets, standard deduction)',
      'IRS Form 1040 Instructions 2022',
      'IRS Publication 17 (2022) — Your Federal Income Tax',
      'IRS EITC income limits and maximum credit amounts — Tax Year 2022',
      'Schedule 8812 Instructions 2022 (CTC / ACTC)',
      'Form 2441 Instructions 2022 (CDCC)',
      'Schedule SE / Schedule C Instructions 2022',
      'Form 8995 Instructions 2022 (QBI — simplified)',
      'Form 8962 Instructions 2022 (PTC) — applicable % table themes',
    ],
  },
  {
    taxYear: 2023,
    citations: [
      'IRS Rev. Proc. 2022-38 (TY2023 inflation adjustments)',
      'IRS Form 1040 Instructions 2023',
      'IRS Publication 17 (2023)',
      'IRS EITC parameters — Tax Year 2023',
      'Schedule 8812 Instructions 2023',
      'Form 2441 Instructions 2023',
      'Schedule SE / Schedule C Instructions 2023',
      'Form 8995 Instructions 2023',
      'Form 8962 Instructions 2023',
    ],
  },
  {
    taxYear: 2024,
    citations: [
      'IRS Rev. Proc. 2023-34 (TY2024 inflation adjustments)',
      'IRS Form 1040 Instructions 2024',
      'IRS Publication 17 (2024)',
      'IRS EITC parameters — Tax Year 2024',
      'Schedule 8812 Instructions 2024',
      'Form 2441 Instructions 2024',
      'Schedule SE / Schedule C Instructions 2024',
      'Form 8995 Instructions 2024',
      'Form 8962 Instructions 2024',
    ],
  },
  {
    taxYear: 2025,
    citations: [
      'IRS Rev. Proc. 2024-40 (TY2025 inflation adjustments)',
      'IRS Form 1040 Instructions 2025 (when published) / RP 2024-40 tables',
      'IRS EITC parameters — Tax Year 2025 (RP 2024-40)',
      'Schedule 8812 / Form 2441 / Schedule SE / Form 8995 / Form 8962 TY2025 parameters',
    ],
  },
]

export function sourcesForYear(taxYear: number): string[] {
  return IRS_SOURCES.find((s) => s.taxYear === taxYear)?.citations ?? []
}
