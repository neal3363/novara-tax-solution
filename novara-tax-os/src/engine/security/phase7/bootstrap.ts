/**
 * Phase 7 staging bootstrap — connects Phase 6 modules to staging services.
 * Does NOT enable production enforcement or MFA mandates.
 */

import {
  resetPhase6Flags,
  getPhase6Flags,
  assertNotEnforcingOnExistingUsers,
  setPhase6FlagsForTests,
  verifyEncryptionRoundTrip,
  resetSessionStoreForTests,
  resetMfaStoreForTests,
  resetAuditLogForTests,
  resetVaultForTests,
  resetKmsForTests,
  resetMalwareScanner,
} from '../phase6/index'
import {
  assertStagingOnly,
  getPhase7Flags,
  resetPhase7Flags,
  PHASE7_SECURITY_VERSION,
} from './config'
import {
  ensureDurableDirs,
  setDurableRoot,
  getDurableRoot,
  wipeDurableRootForTests,
  durableVerifyAuditChain,
} from './durableStore'
import { connectStagingKms, disconnectStagingKms, stagingKmsRoundTripVerify } from './stagingKms'
import { connectMalwareService, disconnectMalwareService } from './malwareService'

export interface StagingBootstrapResult {
  version: string
  staging: true
  productionEnforcement: false
  mfaMandatoryForExistingUsers: false
  durableRoot: string
  kms: { connected: true; provider: string; environment: 'staging'; productionEnforcement: false }
  malware: { connected: true; mode: string; production: false }
  encryption: { localVerified: boolean; stagingKmsVerified: boolean; productionClaim: false }
  phase6Flags: ReturnType<typeof getPhase6Flags>
  phase7Flags: ReturnType<typeof getPhase7Flags>
}

/** Activate staging integration. Safe defaults — production OFF. */
export function bootstrapStagingSecurity(options?: { durableRoot?: string }): StagingBootstrapResult {
  assertStagingOnly()
  assertNotEnforcingOnExistingUsers()

  if (options?.durableRoot) setDurableRoot(options.durableRoot)
  ensureDurableDirs()

  // Keep Phase 6 production path OFF; enable enrollment for staging MFA workflows
  setPhase6FlagsForTests({
    productionAuthPath: false,
    mfaMandatoryForExistingUsers: false,
    mfaEnrollmentEnabled: true,
    rejectGuestOnProductionApis: false,
    cloudKmsEnabled: false, // staging uses provider override, not prod stub
    vaultEncryptionVerified: false,
  })

  const kms = connectStagingKms()
  const malware = connectMalwareService()

  const localEnc = verifyEncryptionRoundTrip()
  const stagingEnc = stagingKmsRoundTripVerify()
  // Mark verified only for staging local/staging-kms round-trips — still not a production claim
  if (localEnc.verified && stagingEnc.verified) {
    setPhase6FlagsForTests({ vaultEncryptionVerified: true })
  }

  return {
    version: PHASE7_SECURITY_VERSION,
    staging: true,
    productionEnforcement: false,
    mfaMandatoryForExistingUsers: false,
    durableRoot: getDurableRoot(),
    kms,
    malware: { ...malware, mode: malware.mode },
    encryption: {
      localVerified: localEnc.verified,
      stagingKmsVerified: stagingEnc.verified,
      productionClaim: false,
    },
    phase6Flags: getPhase6Flags(),
    phase7Flags: getPhase7Flags(),
  }
}

export function teardownStagingSecurity(): void {
  disconnectMalwareService()
  disconnectStagingKms()
  resetMalwareScanner()
  resetKmsForTests()
  resetVaultForTests()
  resetAuditLogForTests()
  resetMfaStoreForTests()
  resetSessionStoreForTests()
  resetPhase6Flags()
  resetPhase7Flags()
}

export function resetStagingForTests(durableRoot: string): StagingBootstrapResult {
  setDurableRoot(durableRoot)
  wipeDurableRootForTests()
  teardownStagingSecurity()
  return bootstrapStagingSecurity({ durableRoot })
}

export function stagingReadiness(): {
  readyForStaging: boolean
  readyForProductionEnforcement: false
  durableAudit: ReturnType<typeof durableVerifyAuditChain>
  blockers: string[]
} {
  const flags = getPhase6Flags()
  const p7 = getPhase7Flags()
  const durableAudit = durableVerifyAuditChain()
  const blockers: string[] = []
  if (!p7.stagingIntegrationEnabled) blockers.push('stagingIntegrationEnabled=false')
  if (flags.productionAuthPath) blockers.push('productionAuthPath unexpectedly ON')
  if (flags.mfaMandatoryForExistingUsers) blockers.push('mfa mandatory unexpectedly ON')
  blockers.push('Production MFA mandate not approved')
  blockers.push('Production cloud KMS account not approved')
  blockers.push('Real taxpayer data migration not approved')

  return {
    readyForStaging: p7.stagingIntegrationEnabled && !flags.productionAuthPath,
    readyForProductionEnforcement: false,
    durableAudit,
    blockers,
  }
}
