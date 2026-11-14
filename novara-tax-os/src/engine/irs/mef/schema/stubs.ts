/**
 * Tax-year MeF schema version tags and supported form inventory.
 * Structural validators use these — not a claim of full IRS XSD compilation.
 * Official IRS schemas must be used when connecting to ATS with approved access.
 */

export const SUPPORTED_MEF_TAX_YEARS = [2022, 2023, 2024, 2025] as const

export type SupportedMefTaxYear = (typeof SUPPORTED_MEF_TAX_YEARS)[number]

export function efileSchemaVersion(taxYear: number): string {
  return `IRS-Form1040-${taxYear}v1.0-NOVARA-STUB`
}

/** Forms we can compose synthetic XML for in Phase 8. */
export const SUPPORTED_RETURN_TYPES = ['Form1040', 'Form1040SR'] as const

export const SUPPORTED_SCHEDULES = [
  'Schedule1',
  'Schedule2',
  'Schedule3',
  'ScheduleA',
  'ScheduleB',
  'ScheduleC',
  'ScheduleD',
  'ScheduleE',
  'Form8949',
  'Form6251',
  'Form8582',
  'Form8863',
  'Form8962',
  'Form8995A',
] as const

/** Forms that must block transmission until schema support is added. */
export const UNSUPPORTED_FORMS = [
  'Form1040NR',
  'Form1120',
  'Form1065',
  'Form990',
  'Form1041',
] as const

export function isSupportedTaxYear(year: number): year is SupportedMefTaxYear {
  return (SUPPORTED_MEF_TAX_YEARS as readonly number[]).includes(year)
}

export function isSupportedReturnType(t: string): boolean {
  return (SUPPORTED_RETURN_TYPES as readonly string[]).includes(t)
}

export function findUnsupportedForms(forms: string[]): string[] {
  return forms.filter((f) => (UNSUPPORTED_FORMS as readonly string[]).includes(f))
}
