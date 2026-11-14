/**
 * Controlled tax-law / tax-year update management.
 * Never auto-deploys unverified interpretations into production calculations.
 * Reads existing taxYearCatalog — does not rewrite production year sets blindly.
 */

import {
  buildTaxYearCatalog,
  getTaxYearDefinition,
  resolveFilingSeason,
  type TaxYearDefinition,
} from './taxYearCatalog'
import { BENEFIT_RULE_VERSION } from '../data/benefitsCatalog'

export type RulePackStatus = 'draft' | 'regression_pending' | 'approved' | 'active' | 'rejected'

export interface TaxRulePack {
  id: string
  taxYear: number
  jurisdiction: 'federal' | 'state'
  stateCode?: string
  version: string
  status: RulePackStatus
  effectiveDate: string
  bracketsVersion: string
  standardDeductionNote: string
  creditsVersion: string
  formsVersion: string
  efileSchemaVersion: string
  guidanceRefs: string[]
  regressionPassed: boolean
  approvedBy?: string
  approvedAt?: string
  historyNote: string
}

export interface TaxLawUpdateDashboard {
  seasonYear: number
  currentTaxYear: number
  activeBenefitRuleVersion: string
  catalog: TaxYearDefinition[]
  packs: TaxRulePack[]
  warnings: string[]
  summary: string
}

export function seedTaxRulePacks(now = new Date()): TaxRulePack[] {
  const ctx = resolveFilingSeason(now)
  const years = [ctx.currentTaxYear, ctx.currentTaxYear - 1, ctx.currentTaxYear - 2]
  const packs: TaxRulePack[] = []
  for (const y of years) {
    const def = getTaxYearDefinition(y, ctx)
    packs.push({
      id: `fed-${y}-v1`,
      taxYear: y,
      jurisdiction: 'federal',
      version: def?.bracketsVersion ?? `brackets-${y}-draft`,
      status: def?.status === 'production' ? 'active' : 'draft',
      effectiveDate: `${y}-01-01`,
      bracketsVersion: def?.bracketsVersion ?? `brackets-${y}`,
      standardDeductionNote: `TY${y} standard deduction limits pinned to year-specific pack`,
      creditsVersion: def?.creditsVersion ?? `credits-${y}`,
      formsVersion: def?.formsVersion ?? `IRS-${y}-draft`,
      efileSchemaVersion: `efile-${y}-v1`,
      guidanceRefs: [
        `IRS Form 1040 instructions TY${y}`,
        `Pub 17 themes for TY${y} (reference only)`,
      ],
      regressionPassed: def?.status === 'production',
      approvedBy: def?.status === 'production' ? 'catalog-seed' : undefined,
      approvedAt: def?.status === 'production' ? `${y}-12-15T00:00:00.000Z` : undefined,
      historyNote: def?.status === 'production'
        ? 'Active via taxYearCatalog production set — prior-year returns must use this year pack.'
        : 'Draft only — requires regression + admin approval before activation.',
    })
    packs.push({
      id: `state-${y}-TX-v1`,
      taxYear: y,
      jurisdiction: 'state',
      stateCode: 'TX',
      version: `TX-${y}-v1`,
      status: 'draft',
      effectiveDate: `${y}-01-01`,
      bracketsVersion: 'n/a-no-income-tax',
      standardDeductionNote: 'Texas has no personal income tax — state pack tracks franchise/other notices only.',
      creditsVersion: 'n/a',
      formsVersion: `TX-${y}-informational`,
      efileSchemaVersion: 'n/a',
      guidanceRefs: ['Texas Comptroller informational references'],
      regressionPassed: false,
      historyNote: 'State packs remain draft until state e-file schemas are validated.',
    })
  }
  return packs
}

export function buildTaxLawUpdateDashboard(now = new Date()): TaxLawUpdateDashboard {
  const ctx = resolveFilingSeason(now)
  const catalog = buildTaxYearCatalog(ctx)
  const packs = seedTaxRulePacks(now)
  const warnings: string[] = []
  for (const p of packs) {
    if (p.status === 'draft') {
      warnings.push(`${p.id}: draft — do not apply to production calculations.`)
    }
    if (p.status !== 'active' && p.jurisdiction === 'federal' && catalog.some((c) => c.taxYear === p.taxYear && c.status === 'production')) {
      // active packs expected for production years
    }
  }
  warnings.push('AI and calculators must use the rule pack for the selected tax year — never current-year limits on historical returns.')
  warnings.push('Unverified tax-law interpretations are never auto-deployed.')

  return {
    seasonYear: ctx.seasonYear,
    currentTaxYear: ctx.currentTaxYear,
    activeBenefitRuleVersion: BENEFIT_RULE_VERSION,
    catalog,
    packs,
    warnings,
    summary: `Filing season ${ctx.seasonYear}: current tax year ${ctx.currentTaxYear}. Benefit ruleset ${BENEFIT_RULE_VERSION}. ${packs.filter((p) => p.status === 'active').length} active federal packs.`,
  }
}

/** Admin approval gate — returns updated pack; does not mutate catalog production set. */
export function approveTaxRulePack(
  pack: TaxRulePack,
  approver: string,
  now = new Date(),
): { ok: boolean; error?: string; pack: TaxRulePack } {
  if (!pack.regressionPassed) {
    return {
      ok: false,
      error: 'Regression tests must pass before approval.',
      pack,
    }
  }
  if (pack.status === 'active') {
    return { ok: true, pack }
  }
  return {
    ok: true,
    pack: {
      ...pack,
      status: 'approved',
      approvedBy: approver,
      approvedAt: now.toISOString(),
      historyNote: `${pack.historyNote} Approved by ${approver}; activation still requires controlled catalog update.`,
    },
  }
}

export function rulesForTaxYear(taxYear: number, packs: TaxRulePack[]): TaxRulePack | undefined {
  return packs.find((p) => p.taxYear === taxYear && p.jurisdiction === 'federal' && p.status === 'active')
    ?? packs.find((p) => p.taxYear === taxYear && p.jurisdiction === 'federal')
}
