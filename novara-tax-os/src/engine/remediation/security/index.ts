import { resetPasswordStoreForTests } from './passwordReset'
import { resetRateLimitForTests } from './rateLimit'

export {
  requestPasswordReset,
  completePasswordReset,
  revokePasswordResetTokensForPrincipal,
  stagingSetPasswordForTests,
  stagingVerifyPassword,
  resetPasswordStoreForTests,
  listPasswordResetTokensForTests,
} from './passwordReset'

export { checkRateLimit, checkLoginBruteForce, resetRateLimitForTests } from './rateLimit'
export { issueCsrfToken, verifyCsrfToken } from './csrf'
export { escapeHtml, rejectDangerousMarkup, redactSensitive } from './xssSanitize'
export { assertSafeIdentifier, assertNoSqlMeta, assertNoPathTraversal } from './injectionGuard'
export { simulateBackupAndRestore } from './backupRestore'
export {
  createShortLivedSession,
  assertSessionInvalidAfterRevoke,
  assertSessionExpires,
  syntheticPrincipal,
  createSession,
  revokeSession,
  requireActiveSession,
} from './sessionHardening'

export function resetSecurityRemediationForTests(): void {
  resetPasswordStoreForTests()
  resetRateLimitForTests()
}
