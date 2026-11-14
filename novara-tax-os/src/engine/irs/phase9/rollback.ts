/**
 * Rollback verification — demo engine remains available; cutover stays OFF.
 */

import { defaultProfile, runBenefitOptimization } from '../../benefitOptimizer'
import { cutoverReady } from '../cutoverCriteria'
import { getDualRunFlag, mayShowIrsToTaxpayer, resetDualRunFlag } from '../dualRun'
import { getPhase9Flags, resetPhase9Flags } from './config'

export interface RollbackReadiness {
  ready: true
  demoEngineCallable: boolean
  dualRunDefaultOff: boolean
  mayShowIrsToTaxpayer: false
  cutoverReady: false
  phase9ActivateCutover: false
  procedure: string[]
}

export function verifyRollbackReadiness(): RollbackReadiness {
  resetDualRunFlag()
  resetPhase9Flags()
  const demo = runBenefitOptimization(defaultProfile())
  const dual = getDualRunFlag()
  const p9 = getPhase9Flags()

  if (cutoverReady()) {
    throw new Error('Phase 9 STOP: cutoverReady unexpectedly true')
  }

  return {
    ready: true,
    demoEngineCallable: Number.isFinite(demo.projectedRefund),
    dualRunDefaultOff: dual.enabled === false,
    mayShowIrsToTaxpayer: mayShowIrsToTaxpayer(),
    cutoverReady: false,
    phase9ActivateCutover: p9.activateCutover,
    procedure: [
      '1. Keep Phase 9 stagingIntegrationEnabled for internal tests only',
      '2. Taxpayer UI continues to call runBenefitOptimization / store toSnapshot',
      '3. Do not set dual-run audience to taxpayer_visible',
      '4. Do not flip cutoverReady criteria or activateCutover',
      '5. To disable staging ops: setPhase9FlagsForTests({ stagingIntegrationEnabled: false })',
      '6. Git rollback: checkout checkpoint/pre-phase9-4bf9',
    ],
  }
}
