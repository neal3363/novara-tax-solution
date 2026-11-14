/**
 * Phase 7 — staging security integration.
 * Connects Phase 6 modules to staging APIs, durable store, staging KMS, malware service.
 * STOP before production enforcement.
 */

export {
  PHASE7_SECURITY_VERSION,
  DEFAULT_PHASE7_FLAGS,
  getPhase7Flags,
  setPhase7FlagsForTests,
  resetPhase7Flags,
  assertStagingOnly,
} from './config'
export type { Phase7StagingFlags } from './config'

export {
  setDurableRoot,
  getDurableRoot,
  ensureDurableDirs,
  durableAppendAudit,
  durableLoadAudit,
  durableVerifyAuditChain,
  durableSaveVaultBlob,
  durableLoadVaultBlob,
  durableSaveSession,
  durableLoadSession,
  __tamperDurableAuditForTests,
  resetDurableStoreForTests,
  wipeDurableRootForTests,
} from './durableStore'

export {
  stagingCloudKmsProvider,
  connectStagingKms,
  disconnectStagingKms,
  stagingKmsRoundTripVerify,
} from './stagingKms'

export {
  connectMalwareService,
  disconnectMalwareService,
  setMalwareServiceMode,
  getMalwareServiceMode,
  simulateMalwareOutage,
  recoverMalwareService,
  getLastQuarantineId,
} from './malwareService'

export {
  stagingBeginEnrollment,
  stagingConfirmEnrollment,
  stagingStartChallenge,
  stagingVerifyChallenge,
  stagingRecoverWithCode,
  stagingSatisfySessionMfa,
  stagingAdminResetMfa,
  stagingGenerateTotp,
  stagingMfaStatus,
} from './mfaWorkflows'

export {
  resolveSessionPrincipal,
  serverAuthorize,
  persistSessionSnapshot,
  stagingRevokeSession,
  stagingVaultUpload,
  stagingIssueDownloadToken,
  stagingDownload,
  stagingSecureDelete,
  stagingVaultSelfTest,
} from './protectedOps'

export {
  bootstrapStagingSecurity,
  teardownStagingSecurity,
  resetStagingForTests,
  stagingReadiness,
} from './bootstrap'
export type { StagingBootstrapResult } from './bootstrap'

import { PHASE7_SECURITY_VERSION, getPhase7Flags } from './config'
import { getPhase6Flags } from '../phase6/config'
import { stagingReadiness } from './bootstrap'

export function phase7SecuritySummary(): string {
  const p6 = getPhase6Flags()
  const p7 = getPhase7Flags()
  const ready = stagingReadiness()
  return [
    'NOVARA Phase 7 staging security integration',
    `version=${PHASE7_SECURITY_VERSION}`,
    `stagingIntegrationEnabled=${p7.stagingIntegrationEnabled}`,
    `productionEnforcement=${p7.productionEnforcement}`,
    `mfaMandatoryForExistingUsers=${p7.mfaMandatoryForExistingUsers}`,
    `phase6.productionAuthPath=${p6.productionAuthPath}`,
    `readyForStaging=${ready.readyForStaging}`,
    `readyForProductionEnforcement=${ready.readyForProductionEnforcement}`,
    'STOP before production enforcement.',
  ].join('\n')
}
