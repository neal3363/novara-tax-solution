/**
 * Server-side authorization — RBAC + tenant/office isolation.
 * Do not rely on frontend RoleGate for security.
 */

import { getPhase6Flags } from './config'
import type { AuthzRequest, AuthzResult } from './types'

export function authorize(req: AuthzRequest): AuthzResult {
  const { session, principal, action } = req
  const flags = getPhase6Flags()

  if (principal.kind === 'guest_blocked' || flags.rejectGuestOnProductionApis && principal.id.startsWith('guest-')) {
    return {
      allowed: false,
      reason: 'Guest access forbidden on production security path',
      code: 'guest_forbidden',
    }
  }

  if (session.status !== 'active') {
    return { allowed: false, reason: 'Session expired or revoked', code: 'session_invalid' }
  }

  if (session.principalId !== principal.id) {
    return { allowed: false, reason: 'Session/principal mismatch', code: 'unauthenticated' }
  }

  // MFA gate when mandatory flag on OR principal enrolled and action is sensitive
  const sensitive =
    action.startsWith('document.') ||
    action.startsWith('client.') ||
    action === 'return.submit' ||
    action === 'office.manage_staff' ||
    action === 'office.manage_permissions'
  if (sensitive) {
    if (flags.mfaMandatoryForExistingUsers && !session.mfaSatisfied) {
      return { allowed: false, reason: 'MFA required', code: 'mfa_required' }
    }
    // Even when not mandatory: if enrolled, require MFA for sensitive actions (opt-in hardening)
    if (principal.mfaEnrolled && !session.mfaSatisfied && flags.mfaEnrollmentEnabled) {
      // Soft policy: only enforce when productionAuthPath is on
      if (flags.productionAuthPath) {
        return { allowed: false, reason: 'MFA reauthentication required', code: 'mfa_required' }
      }
    }
  }

  // Tenant isolation
  if (req.resourceTenantId !== session.tenantId && principal.role !== 'admin') {
    return { allowed: false, reason: 'Cross-tenant access denied', code: 'wrong_tenant' }
  }

  switch (action) {
    case 'client.read':
    case 'client.write':
    case 'document.read':
    case 'document.write':
    case 'document.delete':
    case 'return.submit':
      return authorizeClientScoped(req)
    case 'office.manage_staff':
    case 'office.manage_permissions':
      return authorizeOfficeManage(req)
    case 'admin.audit_read':
      if (principal.role === 'admin' || (principal.officeManager && principal.accountType === 'office_owner')) {
        return { allowed: true, reason: 'Office/admin audit read', code: 'ok' }
      }
      return { allowed: false, reason: 'Insufficient role for audit', code: 'insufficient_role' }
    case 'session.revoke':
      return { allowed: true, reason: 'Principal may revoke own/admin sessions via dedicated API checks', code: 'ok' }
    default:
      return { allowed: false, reason: 'Unknown action', code: 'insufficient_role' }
  }
}

function authorizeClientScoped(req: AuthzRequest): AuthzResult {
  const { principal, action } = req

  if (principal.role === 'admin') {
    return {
      allowed: false,
      reason: 'Admin requires audited support grant (not default browse)',
      code: 'insufficient_role',
    }
  }

  if (principal.accountType === 'tc' || principal.role === 'taxpayer') {
    if (req.resourceOwnerId && req.resourceOwnerId !== principal.id) {
      return { allowed: false, reason: 'Tax Client may only access own records', code: 'taxpayer_own_only' }
    }
    if (action === 'office.manage_staff') {
      return { allowed: false, reason: 'TC cannot manage office', code: 'insufficient_role' }
    }
    return { allowed: true, reason: 'TC own-record access', code: 'ok' }
  }

  // Independent TP
  if (principal.accountType === 'independent_tp') {
    if (req.resourceTenantId !== principal.tenantId) {
      return { allowed: false, reason: 'TP tenant mismatch', code: 'wrong_tenant' }
    }
    return { allowed: true, reason: 'Independent TP tenant access', code: 'ok' }
  }

  // Office owner / preparer
  if (principal.accountType === 'office_owner' || principal.accountType === 'office_preparer') {
    if (req.resourceOfficeId && principal.officeId && req.resourceOfficeId !== principal.officeId) {
      return { allowed: false, reason: 'Cross-office access denied', code: 'wrong_office' }
    }
    if (principal.accountType === 'office_preparer') {
      const assigned = req.assignedPreparerIds ?? []
      if (req.resourceOwnerId && assigned.length > 0 && !assigned.includes(principal.id)) {
        return { allowed: false, reason: 'Client not assigned to preparer', code: 'not_assigned' }
      }
    }
    if (action === 'document.delete' && principal.accountType === 'office_preparer' && !principal.officeManager) {
      return { allowed: false, reason: 'Preparer cannot delete without manager permission', code: 'insufficient_role' }
    }
    return { allowed: true, reason: 'Office-scoped access', code: 'ok' }
  }

  if (principal.role === 'preparer' || principal.role === 'efin_owner') {
    if (req.resourceTenantId !== principal.tenantId) {
      return { allowed: false, reason: 'Wrong tenant', code: 'wrong_tenant' }
    }
    return { allowed: true, reason: 'Preparer/EFIN tenant access', code: 'ok' }
  }

  return { allowed: false, reason: 'No matching authorization rule', code: 'insufficient_role' }
}

function authorizeOfficeManage(req: AuthzRequest): AuthzResult {
  const { principal } = req
  if (principal.accountType === 'office_owner' && principal.officeManager) {
    if (req.resourceOfficeId && principal.officeId && req.resourceOfficeId !== principal.officeId) {
      return { allowed: false, reason: 'Cannot manage another office', code: 'wrong_office' }
    }
    return { allowed: true, reason: 'Office owner management', code: 'ok' }
  }
  return { allowed: false, reason: 'Only office managers may manage staff/permissions', code: 'insufficient_role' }
}

/** API guard helper — throws on deny for server handlers. */
export function assertAuthorized(req: AuthzRequest): void {
  const r = authorize(req)
  if (!r.allowed) {
    const err = new Error(r.code)
    ;(err as Error & { authz: AuthzResult }).authz = r
    throw err
  }
}
