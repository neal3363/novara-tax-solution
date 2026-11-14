/**
 * Staging dual-run: Maximizer (demo) vs IRS engine on synthetic profiles.
 * Never taxpayer-visible. Never auto-cutover.
 */

import type { TaxpayerProfile } from '../../benefitOptimizer'
import {
  getDualRunFlag,
  mayShowIrsToTaxpayer,
  resetDualRunFlag,
  runDualComparison,
  setDualRunFlagForTests,
  type DualRunReport,
} from '../dualRun'
import { cutoverReady } from '../cutoverCriteria'
import { assertNoProductionCutover, getPhase9Flags } from './config'
import { runStagingAdapter, type StagingAdapterResult } from './stagingAdapter'
import { phase9SyntheticCorpus, type SyntheticCase } from './syntheticProfiles'

export interface StagingDualRunCaseResult {
  id: string
  label: string
  adapter: StagingAdapterResult
  dual: DualRunReport | null
  delta: number | null
  unsupported: string[]
  fullyValidated: boolean
  taxpayerVisible: false
}

export interface StagingSuiteReport {
  version: string
  cases: StagingDualRunCaseResult[]
  passed: number
  failed: number
  remainingDifferences: { id: string; delta: number }[]
  unsupportedInventory: string[]
  cutoverReady: false
  taxpayerVisible: false
  productionCutover: false
}

export function runStagingDualForProfile(
  profile: TaxpayerProfile,
  label: string,
): { adapter: StagingAdapterResult; dual: DualRunReport | null } {
  assertNoProductionCutover()
  const flags = getPhase9Flags()
  if (!flags.stagingIntegrationEnabled) {
    return { adapter: runStagingAdapter(profile), dual: null }
  }
  setDualRunFlagForTests({ enabled: true, audience: 'internal_only', verbose: true })
  const adapter = runStagingAdapter(profile)
  const dual = runDualComparison(profile, label)
  // Restore dual-run default OFF so production path stays quiet
  resetDualRunFlag()
  return { adapter, dual }
}

export function runPhase9StagingSuite(cases: SyntheticCase[] = phase9SyntheticCorpus()): StagingSuiteReport {
  assertNoProductionCutover()
  const results: StagingDualRunCaseResult[] = []
  const unsupportedInventory = new Set<string>()
  let passed = 0
  let failed = 0

  for (const c of cases) {
    const { adapter, dual } = runStagingDualForProfile(c.profile, c.label)
    for (const u of adapter.unsupportedSituations) unsupportedInventory.add(u)

    const delta = dual?.diffs.find((d) => d.field === 'final_refund_or_balance')?.delta ?? null
    const ok =
      adapter.taxpayerVisible === false &&
      adapter.productionCutover === false &&
      adapter.rollback.demoEngineAvailable === true &&
      mayShowIrsToTaxpayer() === false &&
      !cutoverReady()

    if (ok) passed++
    else failed++

    results.push({
      id: c.id,
      label: c.label,
      adapter,
      dual,
      delta: typeof delta === 'number' ? delta : null,
      unsupported: adapter.unsupportedSituations,
      fullyValidated: adapter.fullyValidated,
      taxpayerVisible: false,
    })
  }

  const remainingDifferences = results
    .filter((r) => r.delta !== null && r.delta !== 0)
    .map((r) => ({ id: r.id, delta: r.delta as number }))

  return {
    version: 'phase9-staging-suite',
    cases: results,
    passed,
    failed,
    remainingDifferences,
    unsupportedInventory: [...unsupportedInventory],
    cutoverReady: false,
    taxpayerVisible: false,
    productionCutover: false,
  }
}

export function stagingFlagState() {
  return {
    phase9: getPhase9Flags(),
    dualRun: getDualRunFlag(),
    mayShowIrsToTaxpayer: mayShowIrsToTaxpayer(),
    cutoverReady: cutoverReady(),
  }
}
