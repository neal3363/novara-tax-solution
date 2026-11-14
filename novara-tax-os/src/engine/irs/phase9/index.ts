/**
 * Phase 9 — Staging IRS engine ↔ AI Refund Maximizer integration.
 * STOP before production engine cutover.
 */

export {
  PHASE9_VERSION,
  DEFAULT_PHASE9_FLAGS,
  getPhase9Flags,
  setPhase9FlagsForTests,
  resetPhase9Flags,
  assertNoProductionCutover,
} from './config'
export type { Phase9StagingFlags } from './config'

export {
  runStagingAdapter,
  mapProfileToIrsInput,
  detectUnsupportedSituations,
  stagingMaximizerRecalc,
} from './stagingAdapter'
export type { StagingAdapterResult, StagingIrsVerifiedNumbers } from './stagingAdapter'

export { phase9SyntheticCorpus } from './syntheticProfiles'
export type { SyntheticCase } from './syntheticProfiles'

export {
  runStagingDualForProfile,
  runPhase9StagingSuite,
  stagingFlagState,
} from './stagingDualRun'
export type { StagingDualRunCaseResult, StagingSuiteReport } from './stagingDualRun'

export { verifyMaximizerCompatibility } from './maximizerCompat'
export type { MaximizerCompatReport } from './maximizerCompat'

export { verifyRollbackReadiness } from './rollback'
export type { RollbackReadiness } from './rollback'

import { PHASE9_VERSION, getPhase9Flags } from './config'
import { cutoverReady } from '../cutoverCriteria'
import { mayShowIrsToTaxpayer } from '../dualRun'

export function phase9Summary(): string {
  const f = getPhase9Flags()
  return [
    'NOVARA Phase 9 IRS ↔ Maximizer staging integration',
    `version=${PHASE9_VERSION}`,
    `stagingIntegrationEnabled=${f.stagingIntegrationEnabled}`,
    `activateCutover=${f.activateCutover}`,
    `taxpayerVisible=${f.taxpayerVisible}`,
    `mayShowIrsToTaxpayer=${mayShowIrsToTaxpayer()}`,
    `cutoverReady=${cutoverReady()}`,
    'STOP before production engine cutover.',
  ].join('\n')
}
