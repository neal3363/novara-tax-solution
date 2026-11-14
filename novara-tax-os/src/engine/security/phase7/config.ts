/**
 * Phase 7 staging security integration flags.
 * Production enforcement remains OFF until separately approved.
 */

export const PHASE7_SECURITY_VERSION = 'phase7-staging-2025.1'

export interface Phase7StagingFlags {
  /** Enable staging API integration paths (local durable + staging KMS) */
  stagingIntegrationEnabled: boolean
  /** Persist audit/vault/session to staging durable store */
  durableStoreEnabled: boolean
  /** Use staging cloud-KMS adapter (not production cloud account) */
  stagingCloudKmsEnabled: boolean
  /** Connect malware scanning service (staging mock with quarantine) */
  malwareServiceEnabled: boolean
  /**
   * NEVER flip production enforcement from Phase 7.
   * Must remain false — STOP before production enforcement.
   */
  productionEnforcement: false
  mfaMandatoryForExistingUsers: false
}

export const DEFAULT_PHASE7_FLAGS: Phase7StagingFlags = {
  stagingIntegrationEnabled: true,
  durableStoreEnabled: true,
  stagingCloudKmsEnabled: true,
  malwareServiceEnabled: true,
  productionEnforcement: false,
  mfaMandatoryForExistingUsers: false,
}

let flags: Phase7StagingFlags = { ...DEFAULT_PHASE7_FLAGS }

export function getPhase7Flags(): Phase7StagingFlags {
  return { ...flags }
}

export function setPhase7FlagsForTests(patch: Partial<Phase7StagingFlags>): Phase7StagingFlags {
  // Hard stop: refuse production enforcement / MFA mandate
  const next = { ...flags, ...patch }
  next.productionEnforcement = false
  next.mfaMandatoryForExistingUsers = false
  flags = next
  return getPhase7Flags()
}

export function resetPhase7Flags(): void {
  flags = { ...DEFAULT_PHASE7_FLAGS }
}

export function assertStagingOnly(): void {
  if (flags.productionEnforcement) {
    throw new Error('Phase 7 STOP: productionEnforcement must remain false')
  }
  if (flags.mfaMandatoryForExistingUsers) {
    throw new Error('Phase 7 STOP: mfaMandatoryForExistingUsers must remain false')
  }
}
