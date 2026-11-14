/**
 * Compliant-ish synthetic ATS fixtures for offline schema / calc validation.
 * Uses non-real TINs in IRS test ranges — never use for live transmission.
 */

import type { AtsScenarioSpec } from './scenarioCatalog'
import { individualAtsScenarioCatalog } from './scenarioCatalog'

export interface SyntheticAtsReturn {
  scenarioId: string
  taxYear: number
  filingStatus: 'single' | 'mfj' | 'hoh'
  primaryTinMasked: string
  spouseTinMasked?: string
  dependents: { tinMasked: string; relationship: string }[]
  wages: number
  federalWithheld: number
  schCNetProfit?: number
  refundOrOwe: 'refund' | 'owe' | 'zero'
  estimatedRefund: number
  estimatedBalanceDue: number
  forms: string[]
  contentSeed: string
}

function hashSeed(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `syn_${(h >>> 0).toString(16)}`
}

/** IRS ATS uses designated test TINs; these are placeholders for offline packs only. */
const TEST_TIN_PRIMARY = '***-**-0001'
const TEST_TIN_SPOUSE = '***-**-0002'
const TEST_TIN_DEP = '***-**-0010'

export function buildSyntheticReturnForScenario(scenario: AtsScenarioSpec): SyntheticAtsReturn {
  const base: SyntheticAtsReturn = {
    scenarioId: scenario.id,
    taxYear: scenario.taxYear,
    filingStatus: 'single',
    primaryTinMasked: TEST_TIN_PRIMARY,
    dependents: [],
    wages: 45000,
    federalWithheld: 4200,
    refundOrOwe: 'refund',
    estimatedRefund: 800,
    estimatedBalanceDue: 0,
    forms: [...scenario.requiredForms],
    contentSeed: hashSeed(scenario.id),
  }

  switch (scenario.formFamily) {
    case '1040':
      if (scenario.id.includes('mfj')) {
        base.filingStatus = 'mfj'
        base.spouseTinMasked = TEST_TIN_SPOUSE
        base.dependents = [{ tinMasked: TEST_TIN_DEP, relationship: 'son' }]
        base.wages = 78000
        base.federalWithheld = 7800
        base.estimatedRefund = 2100
      }
      break
    case '1040_schedules':
      base.schCNetProfit = 22000
      base.wages = 0
      base.federalWithheld = 0
      base.estimatedRefund = 0
      base.estimatedBalanceDue = 3100
      base.refundOrOwe = 'owe'
      break
    case 'w2':
      base.wages = 52000
      base.federalWithheld = 5000
      break
    case 'credits':
      base.filingStatus = 'hoh'
      base.dependents = [{ tinMasked: TEST_TIN_DEP, relationship: 'daughter' }]
      base.wages = 28000
      base.federalWithheld = 1200
      base.estimatedRefund = 3400
      break
    case 'direct_deposit':
      base.estimatedRefund = 1500
      break
    case 'balance_due':
      base.wages = 95000
      base.federalWithheld = 6000
      base.estimatedRefund = 0
      base.estimatedBalanceDue = 4200
      base.refundOrOwe = 'owe'
      break
    default:
      break
  }

  return base
}

export function buildAllSyntheticAtsPacks(taxYear?: number): SyntheticAtsReturn[] {
  return individualAtsScenarioCatalog(taxYear).map(buildSyntheticReturnForScenario)
}
