import type { AccountType, Role } from '../../../data/types'

export type SecurityPrincipalKind = 'user' | 'service' | 'guest_blocked'

export interface SecurityPrincipal {
  id: string
  email: string
  role: Role
  accountType: AccountType
  tenantId: string
  officeId?: string
  /** Tax Office management capability */
  officeManager?: boolean
  mfaEnrolled: boolean
  mfaVerifiedThisSession: boolean
  kind: SecurityPrincipalKind
}

export type SessionStatus = 'active' | 'expired' | 'revoked'

export interface AuthSession {
  sessionId: string
  principalId: string
  tenantId: string
  role: Role
  accountType: AccountType
  officeId?: string
  officeManager: boolean
  createdAt: string
  expiresAt: string
  lastSeenAt: string
  revokedAt?: string
  status: SessionStatus
  mfaSatisfied: boolean
  /** Binding for session fixation / hijack resistance */
  fingerprintHash: string
  /** Absolute idle timeout seconds */
  idleTimeoutSec: number
}

export type AuthzAction =
  | 'client.read'
  | 'client.write'
  | 'document.read'
  | 'document.write'
  | 'document.delete'
  | 'office.manage_staff'
  | 'office.manage_permissions'
  | 'return.submit'
  | 'admin.audit_read'
  | 'session.revoke'
  | 'payment.charge'
  | 'billing.read'
  | 'bank.apply'

export interface AuthzRequest {
  session: AuthSession
  principal: SecurityPrincipal
  action: AuthzAction
  resourceTenantId: string
  resourceOwnerId?: string
  resourceOfficeId?: string
  assignedPreparerIds?: string[]
}

export interface AuthzResult {
  allowed: boolean
  reason: string
  code:
    | 'ok'
    | 'unauthenticated'
    | 'session_invalid'
    | 'wrong_tenant'
    | 'wrong_office'
    | 'insufficient_role'
    | 'not_assigned'
    | 'taxpayer_own_only'
    | 'mfa_required'
    | 'guest_forbidden'
}

export type AuditAction =
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'session_revoke'
  | 'mfa_enroll'
  | 'mfa_verify'
  | 'mfa_recovery'
  | 'mfa_failure'
  | 'client_access'
  | 'document_download'
  | 'document_upload'
  | 'permission_change'
  | 'admin_action'
  | 'return_submit'
  | 'security_incident'
  | 'vault_delete'
  | 'key_rotate'

export interface AuditRecord {
  id: string
  at: string
  actorId: string
  tenantId: string
  action: AuditAction
  resource: string
  outcome: 'success' | 'denied' | 'error'
  /** Safe metadata — never SSN or full documents */
  meta: Record<string, string | number | boolean>
  prevHash: string
  hash: string
}
