/**
 * Complete MFA workflows for staging: enrollment, verification, recovery, admin recovery.
 * Does NOT mandate MFA for existing production users.
 */

import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  startMfaChallenge,
  verifyMfaChallenge,
  consumeRecoveryCode,
  adminResetMfa,
  generateTotp,
  isMfaEnrolled,
  getLoginAttemptState,
  authorize,
  markSessionMfaSatisfied,
  requireActiveSession,
  getPrincipal,
  appendAudit,
  assertNotEnforcingOnExistingUsers,
} from '../phase6/index'
import type { AuthSession, SecurityPrincipal } from '../phase6/types'
import { assertStagingOnly } from './config'

export interface MfaEnrollmentResult {
  secretBase32: string
  otpauthUrl: string
  recoveryCodes: string[]
  mandatoryForExistingUsers: false
}

export function stagingBeginEnrollment(principalId: string): MfaEnrollmentResult {
  assertStagingOnly()
  assertNotEnforcingOnExistingUsers()
  const started = beginTotpEnrollment(principalId)
  return {
    ...started,
    mandatoryForExistingUsers: false,
  }
}

export function stagingConfirmEnrollment(principalId: string, code: string): boolean {
  assertStagingOnly()
  return confirmTotpEnrollment(principalId, code)
}

export function stagingStartChallenge(principalId: string): { challengeId: string; expiresAt: string } {
  return startMfaChallenge(principalId)
}

export function stagingVerifyChallenge(challengeId: string, code: string): boolean {
  return verifyMfaChallenge(challengeId, code)
}

export function stagingRecoverWithCode(principalId: string, code: string): boolean {
  return consumeRecoveryCode(principalId, code)
}

/**
 * After successful MFA or recovery, mark session reauthenticated.
 */
export function stagingSatisfySessionMfa(sessionId: string): AuthSession {
  return markSessionMfaSatisfied(sessionId)
}

/**
 * Administrative recovery: office manager / admin may reset MFA for a principal
 * after server-side authorization. Issues temporary recovery enrollment path.
 */
export function stagingAdminResetMfa(input: {
  session: AuthSession
  admin: SecurityPrincipal
  targetPrincipalId: string
}): { reset: true; mustReenroll: true; mandatoryStillOff: true } {
  assertStagingOnly()
  assertNotEnforcingOnExistingUsers()

  const authz = authorize({
    session: input.session,
    principal: input.admin,
    action: 'office.manage_permissions',
    resourceTenantId: input.session.tenantId,
    resourceOfficeId: input.admin.officeId ?? input.session.officeId,
  })

  // Admins also allowed via admin.audit_read-like privilege for MFA reset
  const adminOk = input.admin.role === 'admin'
  if (!authz.allowed && !adminOk) {
    appendAudit({
      actorId: input.admin.id,
      tenantId: input.session.tenantId,
      action: 'admin_action',
      resource: `mfa:${input.targetPrincipalId}`,
      outcome: 'denied',
      meta: { action: 'mfa_admin_reset', code: authz.code },
    })
    throw new Error(authz.code || 'insufficient_role')
  }

  adminResetMfa(input.targetPrincipalId, input.admin.id)
  appendAudit({
    actorId: input.admin.id,
    tenantId: input.session.tenantId,
    action: 'permission_change',
    resource: `mfa:${input.targetPrincipalId}`,
    outcome: 'success',
    meta: { action: 'admin_mfa_reset', mandatoryStillOff: true },
  })

  return { reset: true, mustReenroll: true, mandatoryStillOff: true }
}

/** Helper for authenticator-app test: generate current TOTP from enrollment secret. */
export function stagingGenerateTotp(secretBase32: string, atMs?: number): string {
  return generateTotp(secretBase32, atMs)
}

export function stagingMfaStatus(principalId: string): {
  enrolled: boolean
  lockout?: ReturnType<typeof getLoginAttemptState>
  mandatoryForExistingUsers: false
} {
  return {
    enrolled: isMfaEnrolled(principalId),
    lockout: getLoginAttemptState(principalId),
    mandatoryForExistingUsers: false,
  }
}

export function stagingRequireSession(sessionId: string): AuthSession {
  return requireActiveSession(sessionId).session
}

export function stagingGetPrincipal(id: string): SecurityPrincipal | undefined {
  return getPrincipal(id)
}
