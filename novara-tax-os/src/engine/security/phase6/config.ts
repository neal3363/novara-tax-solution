/**
 * Phase 6 production security configuration.
 * Enforcement flags default OFF — existing users/workflows unchanged until approved.
 */

export const PHASE6_SECURITY_VERSION = 'phase6-2025.1'

export interface Phase6SecurityFlags {
  /** Master switch for production auth path (guest auto-login blocked when true) */
  productionAuthPath: boolean
  /** When true, MFA required after password for protected roles — DEFAULT false */
  mfaMandatoryForExistingUsers: boolean
  /** Allow MFA enrollment/testing without mandating */
  mfaEnrollmentEnabled: boolean
  /** Use real cloud KMS adapter (false = local envelope with test keys) */
  cloudKmsEnabled: boolean
  /** Claim vault encryption operational only after verification suite passes */
  vaultEncryptionVerified: boolean
  /** Reject unsigned/guest sessions on production API handlers */
  rejectGuestOnProductionApis: boolean
}

/** Safe defaults — STOP before enforcing on existing users. */
export const DEFAULT_PHASE6_FLAGS: Phase6SecurityFlags = {
  productionAuthPath: false,
  mfaMandatoryForExistingUsers: false,
  mfaEnrollmentEnabled: true,
  cloudKmsEnabled: false,
  vaultEncryptionVerified: false,
  rejectGuestOnProductionApis: false,
}

let flags: Phase6SecurityFlags = { ...DEFAULT_PHASE6_FLAGS }

export function getPhase6Flags(): Phase6SecurityFlags {
  return { ...flags }
}

/** Test/admin only — cannot enable mfaMandatory without explicit call. */
export function setPhase6FlagsForTests(patch: Partial<Phase6SecurityFlags>): Phase6SecurityFlags {
  flags = { ...flags, ...patch }
  return getPhase6Flags()
}

export function resetPhase6Flags(): void {
  flags = { ...DEFAULT_PHASE6_FLAGS }
}

export function assertNotEnforcingOnExistingUsers(): void {
  if (flags.mfaMandatoryForExistingUsers) {
    throw new Error(
      'Phase 6 STOP: mfaMandatoryForExistingUsers must remain false until migration/recovery approved',
    )
  }
}
