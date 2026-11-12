/**
 * TP vs Office vs TC permission matrix.
 * FINAL RULE: TP = CLIENTS ONLY. OFFICE = PREPARERS + CLIENTS.
 * Enforce on frontend and backend (store/actions) — never UI-only.
 */

import type { AccountType, UserAccount } from '../data/types'
import { isCredentialVerified } from './credentials'

export type PermissionDeniedReason =
  | 'not_authenticated'
  | 'tc_clients_forbidden'
  | 'tp_staff_forbidden'
  | 'tp_assign_forbidden'
  | 'office_owner_only'
  | 'credentials_unverified'
  | 'efile_provider_required'
  | 'wrong_account_type'

export interface PermissionResult {
  allowed: boolean
  reason?: PermissionDeniedReason
  detail?: string
}

export function resolveAccountType(user: UserAccount | null | undefined): AccountType | null {
  if (!user) return null
  return user.accountType
}

export function isIndependentTp(user: UserAccount | null | undefined): boolean {
  return user?.accountType === 'independent_tp'
}

export function isOfficeOwner(user: UserAccount | null | undefined): boolean {
  return user?.accountType === 'office_owner'
}

export function isOfficePreparer(user: UserAccount | null | undefined): boolean {
  return user?.accountType === 'office_preparer'
}

/** TC: own return only — cannot create/manage other clients or preparers */
export function canManageOwnReturnOnly(user: UserAccount | null | undefined): boolean {
  return user?.accountType === 'tc'
}

/** Create clients — TP + Office (owner and assigned preparers). Not TC. */
export function canCreateClients(user: UserAccount | null | undefined): PermissionResult {
  if (!user) return { allowed: false, reason: 'not_authenticated' }
  if (user.accountType === 'tc') {
    return {
      allowed: false,
      reason: 'tc_clients_forbidden',
      detail: 'Tax Clients can only manage their own return.',
    }
  }
  if (
    user.accountType === 'independent_tp' ||
    user.accountType === 'office_owner' ||
    user.accountType === 'office_preparer'
  ) {
    return { allowed: true }
  }
  return { allowed: false, reason: 'wrong_account_type', detail: 'Account type cannot create clients.' }
}

/** Invite / add / remove / manage preparers — Office owner only */
export function canManageStaff(user: UserAccount | null | undefined): PermissionResult {
  if (!user) return { allowed: false, reason: 'not_authenticated' }
  if (user.accountType === 'independent_tp') {
    return {
      allowed: false,
      reason: 'tp_staff_forbidden',
      detail: 'Independent TP accounts cannot create, invite, or manage other preparers.',
    }
  }
  if (user.accountType === 'office_owner') return { allowed: true }
  return {
    allowed: false,
    reason: 'office_owner_only',
    detail: 'Only Tax Office owners can manage staff.',
  }
}

/** Assign / reassign clients to preparers — Office owner only */
export function canAssignClients(user: UserAccount | null | undefined): PermissionResult {
  if (!user) return { allowed: false, reason: 'not_authenticated' }
  if (user.accountType === 'independent_tp') {
    return {
      allowed: false,
      reason: 'tp_assign_forbidden',
      detail: 'Independent TP accounts cannot assign clients to other preparers.',
    }
  }
  if (user.accountType === 'office_owner') return { allowed: true }
  return {
    allowed: false,
    reason: 'office_owner_only',
    detail: 'Only Tax Office owners can assign clients to preparers.',
  }
}

/** Staff management UI / routes */
export function canAccessStaffFeatures(user: UserAccount | null | undefined): PermissionResult {
  return canManageStaff(user)
}

/** Monitor preparer activity — office owner (and optionally preparer sees own) */
export function canMonitorOfficePipeline(user: UserAccount | null | undefined): PermissionResult {
  if (!user) return { allowed: false, reason: 'not_authenticated' }
  if (user.accountType === 'office_owner') return { allowed: true }
  if (user.accountType === 'independent_tp') {
    return {
      allowed: false,
      reason: 'tp_staff_forbidden',
      detail: 'Office pipeline and staff monitoring are Office features only.',
    }
  }
  return { allowed: false, reason: 'office_owner_only' }
}

/**
 * Electronic transmission gate.
 * - TC: own return (consumer filing path) — no PTIN/EFIN
 * - Independent TP: verified PTIN + associated e-file provider (no EFIN on TP)
 * - Office owner / preparer: office verified EFIN; paid preparers need verified PTIN where applicable
 */
export function canTransmitTaxReturn(user: UserAccount | null | undefined): PermissionResult {
  if (!user) return { allowed: false, reason: 'not_authenticated' }

  if (user.accountType === 'tc') {
    return { allowed: true }
  }

  if (user.accountType === 'independent_tp') {
    if (!isCredentialVerified(user.credentials?.ptin)) {
      return {
        allowed: false,
        reason: 'credentials_unverified',
        detail: 'TP electronic filing requires a verified current-year PTIN.',
      }
    }
    if (user.credentials?.efileProvider?.status !== 'associated') {
      return {
        allowed: false,
        reason: 'efile_provider_required',
        detail: 'TP must associate with an authorized e-file provider before transmitting.',
      }
    }
    return { allowed: true }
  }

  if (user.accountType === 'office_owner') {
    if (!isCredentialVerified(user.credentials?.efin)) {
      return {
        allowed: false,
        reason: 'credentials_unverified',
        detail: 'Office electronic filing requires a verified EFIN.',
      }
    }
    return { allowed: true }
  }

  if (user.accountType === 'office_preparer') {
    if (!isCredentialVerified(user.credentials?.ptin)) {
      return {
        allowed: false,
        reason: 'credentials_unverified',
        detail: 'Office preparers require a verified PTIN where applicable before transmitting.',
      }
    }
    // Office EFIN is on the owner/tenant — preparer still needs provider/office filing authority
    if (user.credentials?.efileProvider?.status !== 'associated') {
      return {
        allowed: false,
        reason: 'efile_provider_required',
        detail: 'Office preparer must be authorized under the office e-file configuration.',
      }
    }
    return { allowed: true }
  }

  return { allowed: false, reason: 'wrong_account_type', detail: 'This account cannot transmit returns.' }
}

export function permissionSummary(user: UserAccount | null | undefined) {
  return {
    accountType: user?.accountType ?? null,
    createClients: canCreateClients(user).allowed,
    manageStaff: canManageStaff(user).allowed,
    assignClients: canAssignClients(user).allowed,
    staffFeatures: canAccessStaffFeatures(user).allowed,
    monitorPipeline: canMonitorOfficePipeline(user).allowed,
    transmit: canTransmitTaxReturn(user).allowed,
    unlimitedClients: user?.accountType === 'independent_tp' || user?.accountType === 'office_owner' || user?.accountType === 'office_preparer',
  }
}
