/**
 * Phase 6 production security package.
 * Isolated server-side modules — not enforcing on existing users by default.
 */

import {
  PHASE6_SECURITY_VERSION,
  getPhase6Flags,
} from './config'

export {
  PHASE6_SECURITY_VERSION,
  DEFAULT_PHASE6_FLAGS,
  getPhase6Flags,
  setPhase6FlagsForTests,
  resetPhase6Flags,
  assertNotEnforcingOnExistingUsers,
} from './config'
export type { Phase6SecurityFlags } from './config'

export type {
  SecurityPrincipal,
  AuthSession,
  AuthzAction,
  AuthzRequest,
  AuthzResult,
  AuditAction,
  AuditRecord,
} from './types'

export {
  createSession,
  getSession,
  touchSession,
  revokeSession,
  revokeAllSessionsForPrincipal,
  markSessionMfaSatisfied,
  requireActiveSession,
  upsertPrincipal,
  getPrincipal,
  resetSessionStoreForTests,
  syntheticPrincipal,
} from './sessions'

export { authorize, assertAuthorized } from './authorize'

export {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  isMfaEnrolled,
  startMfaChallenge,
  verifyMfaChallenge,
  consumeRecoveryCode,
  adminResetMfa,
  generateTotp,
  verifyTotp,
  beginWebauthnEnrollment,
  resetMfaStoreForTests,
  getLoginAttemptState,
} from './mfa'

export {
  appendAudit,
  verifyAuditChain,
  listAudit,
  auditLogLength,
  resetAuditLogForTests,
  __tamperAuditForTests,
} from './auditLog'

export {
  getKmsProvider,
  localKmsProvider,
  verifyEncryptionRoundTrip,
  kmsAccessPolicy,
  setKmsEnvironment,
  resetKmsForTests,
  encryptWithDek,
  decryptWithDek,
} from './kms'

export {
  vaultUpload,
  issueSignedDownloadToken,
  downloadWithSignedToken,
  secureDelete,
  purgeExpiredDeleted,
  vaultSelfTest,
  getVaultObjectMeta,
  resetVaultForTests,
} from './vault'

export { scanUpload, setMalwareScanner, resetMalwareScanner } from './malwareScan'

export {
  isGuestAutoLoginAllowed,
  assertApiCallerNotGuest,
  productionAuthStatus,
} from './productionGuards'
export type { AuthPathMode } from './productionGuards'

export function phase6SecuritySummary(): string {
  const flags = getPhase6Flags()
  return [
    'NOVARA Phase 6 production security (isolated — enforcement default OFF)',
    `version=${PHASE6_SECURITY_VERSION}`,
    `productionAuthPath=${flags.productionAuthPath}`,
    `mfaMandatoryForExistingUsers=${flags.mfaMandatoryForExistingUsers}`,
    `vaultEncryptionVerified=${flags.vaultEncryptionVerified}`,
    'STOP before production deploy or enforcing new login requirements on existing users.',
  ].join('\n')
}
