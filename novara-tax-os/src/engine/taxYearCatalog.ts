/**
 * Active filing season and tax-year availability.
 * During season Y (e.g. 2026), the regular-price year is Y-1 (e.g. 2025).
 * Historical engines must be validated before a year is selectable for production.
 */

export type TaxYearEngineStatus = 'production' | 'not_available'

export interface TaxYearDefinition {
  taxYear: number
  status: TaxYearEngineStatus
  /** Human label when not available */
  unavailableReason?: string
  formsVersion: string
  bracketsVersion: string
  creditsVersion: string
  supportsEfileOriginal: boolean
  supportsEfileAmended: boolean
  supportsPaper: boolean
}

export interface FilingSeasonContext {
  /** Calendar year of the open filing season (e.g. 2026) */
  seasonYear: number
  /** Tax year charged at regular price (e.g. 2025) */
  currentTaxYear: number
  /** Oldest year we may ever offer (15 prior + current = 16 years span) */
  oldestSelectableYear: number
}

/** Resolve season from a date — advances automatically each calendar year. */
export function resolveFilingSeason(now: Date = new Date()): FilingSeasonContext {
  const seasonYear = now.getUTCFullYear()
  const currentTaxYear = seasonYear - 1
  return {
    seasonYear,
    currentTaxYear,
    oldestSelectableYear: currentTaxYear - 15,
  }
}

/**
 * Years with fully implemented + validated calculation engines for this demo.
 * Do not mark unsupported years as available.
 */
const PRODUCTION_ENGINE_YEARS = new Set([2022, 2023, 2024, 2025])

export function isPriorTaxYear(taxYear: number, currentTaxYear: number): boolean {
  return taxYear < currentTaxYear
}

export function buildTaxYearCatalog(ctx: FilingSeasonContext = resolveFilingSeason()): TaxYearDefinition[] {
  const years: TaxYearDefinition[] = []
  for (let y = ctx.currentTaxYear; y >= ctx.oldestSelectableYear; y--) {
    const production = PRODUCTION_ENGINE_YEARS.has(y)
    years.push({
      taxYear: y,
      status: production ? 'production' : 'not_available',
      unavailableReason: production
        ? undefined
        : 'Calculation engine and forms for this year are not yet validated for production.',
      formsVersion: production ? `IRS-${y}-v1` : 'n/a',
      bracketsVersion: production ? `brackets-${y}` : 'n/a',
      creditsVersion: production ? `credits-${y}` : 'n/a',
      supportsEfileOriginal: production && y >= 2022,
      supportsEfileAmended: production && y >= 2023,
      supportsPaper: production,
    })
  }
  return years
}

export function availableTaxYears(ctx: FilingSeasonContext = resolveFilingSeason()): TaxYearDefinition[] {
  return buildTaxYearCatalog(ctx).filter((y) => y.status === 'production')
}

export function getTaxYearDefinition(
  taxYear: number,
  ctx: FilingSeasonContext = resolveFilingSeason(),
): TaxYearDefinition | undefined {
  return buildTaxYearCatalog(ctx).find((y) => y.taxYear === taxYear)
}

/** Demo historical rule packs — never use current-year rules for prior years. */
export function historicalRulePack(taxYear: number) {
  const def = getTaxYearDefinition(taxYear)
  if (!def || def.status !== 'production') {
    throw new Error(`TAX_YEAR_NOT_AVAILABLE: ${taxYear}`)
  }
  // Simplified validated packs for demo — amounts differ by year intentionally
  const standardDeductionSingle: Record<number, number> = {
    2025: 15000,
    2024: 14600,
    2023: 13850,
    2022: 12950,
  }
  const childTaxCreditMax: Record<number, number> = {
    2025: 2000,
    2024: 2000,
    2023: 2000,
    2022: 2000,
  }
  return {
    taxYear,
    formsVersion: def.formsVersion,
    standardDeductionSingle: standardDeductionSingle[taxYear],
    childTaxCreditMax: childTaxCreditMax[taxYear],
    topBracketRate: taxYear >= 2024 ? 0.37 : 0.37,
    note: `Rules locked to ${taxYear} — not current-year law.`,
  }
}
