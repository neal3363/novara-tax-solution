/**
 * Multi-tenant isolation for NOVARA Tax OS.
 * Authorization is enforced here (not only in UI filters). Never trust a
 * client-supplied tenantId without verifying the actor’s membership.
 */

import type { DocumentRecord, Role, TaxReturn, UserAccount } from '../data/types'
import { assertUnlimitedProfessionalAccess, roleToTier } from '../data/fees'

export type AccessDeniedReason =
  | 'not_authenticated'
  | 'wrong_tenant'
  | 'not_assigned'
  | 'taxpayer_own_only'
  | 'admin_unscoped'
  | 'cross_tenant_forbidden'

export interface AccessResult {
  allowed: boolean
  reason?: AccessDeniedReason
  detail?: string
}

export interface TenantScopedReturn extends TaxReturn {
  tenantId: string
  /** Explicit preparer assignment within an office tenant */
  assignedPreparerIds?: string[]
}

export interface TenantScopedDocument extends DocumentRecord {
  tenantId: string
  /** Taxpayer / client this file belongs to */
  clientId?: string
  storagePath: string
}

/** Build a logically isolated vault path — never share across tenants. */
export function vaultStoragePath(tenantId: string, ownerOrClientId: string, fileId: string) {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '')
  const safeOwner = ownerOrClientId.replace(/[^a-zA-Z0-9_-]/g, '')
  return `vault/${safeTenant}/${safeOwner}/${fileId}`
}

/** Short-lived authorized document link (demo). Token embeds tenant + expiry. */
export function issueDocumentAccessToken(
  actor: UserAccount,
  doc: TenantScopedDocument,
  ttlSeconds = 300,
): { token: string; expiresAt: string } | null {
  const check = canAccessDocument(actor, doc)
  if (!check.allowed) return null
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  const token = btoa(
    JSON.stringify({
      tid: actor.tenantId,
      did: doc.id,
      uid: actor.id,
      exp: expiresAt,
    }),
  )
  return { token, expiresAt }
}

export function verifyDocumentAccessToken(
  token: string,
  actor: UserAccount,
  doc: TenantScopedDocument,
): AccessResult {
  try {
    const payload = JSON.parse(atob(token)) as { tid: string; did: string; uid: string; exp: string }
    if (payload.uid !== actor.id) return { allowed: false, reason: 'not_authenticated', detail: 'Token user mismatch' }
    if (payload.tid !== actor.tenantId) return { allowed: false, reason: 'wrong_tenant', detail: 'Token tenant mismatch' }
    if (payload.did !== doc.id) return { allowed: false, reason: 'cross_tenant_forbidden', detail: 'Token document mismatch' }
    if (new Date(payload.exp).getTime() < Date.now())
      return { allowed: false, reason: 'not_authenticated', detail: 'Token expired' }
    return canAccessDocument(actor, doc)
  } catch {
    return { allowed: false, reason: 'not_authenticated', detail: 'Invalid token' }
  }
}

export function canAccessReturn(actor: UserAccount | null | undefined, ret: TenantScopedReturn): AccessResult {
  if (!actor) return { allowed: false, reason: 'not_authenticated' }

  if (actor.role === 'admin') {
    // Narrow support access only — not unrestricted document/return browsing by default
    return {
      allowed: false,
      reason: 'admin_unscoped',
      detail: 'Administrators need an audited support grant to open taxpayer returns.',
    }
  }

  if (actor.role === 'taxpayer') {
    if (ret.clientId !== actor.id) {
      return { allowed: false, reason: 'taxpayer_own_only', detail: 'Taxpayers may only open their own returns.' }
    }
    // Same person at another preparer/office does not auto-share — tenant must match engagement
    if (ret.tenantId !== actor.tenantId) {
      return {
        allowed: false,
        reason: 'wrong_tenant',
        detail: 'This return belongs to a different engagement tenant; consent-based transfer required.',
      }
    }
    return { allowed: true }
  }

  // TP / Office staff — tenant match is mandatory
  if (ret.tenantId !== actor.tenantId) {
    return { allowed: false, reason: 'wrong_tenant', detail: 'Cross-tenant return access denied.' }
  }

  if (actor.role === 'preparer') {
    const assigned =
      !ret.assignedPreparerIds?.length ||
      ret.assignedPreparerIds.includes(actor.id) ||
      ret.preparerId === actor.id
    if (!assigned) {
      return { allowed: false, reason: 'not_assigned', detail: 'Return not assigned to this preparer.' }
    }
    return { allowed: true }
  }

  if (actor.role === 'efin_owner') {
    return { allowed: true }
  }

  return { allowed: false, reason: 'cross_tenant_forbidden' }
}

export function canAccessDocument(actor: UserAccount | null | undefined, doc: TenantScopedDocument): AccessResult {
  if (!actor) return { allowed: false, reason: 'not_authenticated' }

  if (actor.role === 'admin') {
    return {
      allowed: false,
      reason: 'admin_unscoped',
      detail: 'Administrators need an audited support grant to open taxpayer documents.',
    }
  }

  if (doc.tenantId !== actor.tenantId) {
    return { allowed: false, reason: 'wrong_tenant', detail: 'Cross-tenant document access denied.' }
  }

  if (actor.role === 'taxpayer') {
    if (doc.ownerId !== actor.id && doc.clientId !== actor.id) {
      return { allowed: false, reason: 'taxpayer_own_only', detail: 'Taxpayers may only open their own vault files.' }
    }
    return { allowed: true }
  }

  if (actor.role === 'efin_owner') {
    return { allowed: true }
  }

  if (actor.role === 'preparer') {
    // Solo TP owns the whole tenant vault; office staff need client assignment via returns
    return { allowed: true }
  }

  return { allowed: false, reason: 'cross_tenant_forbidden' }
}

/**
 * Preparer document access when office assignment lists exist on related returns.
 * Call with the actor’s tenant returns to enforce “authorized clients only.”
 */
export function canAccessDocumentWithAssignments(
  actor: UserAccount | null | undefined,
  doc: TenantScopedDocument,
  tenantReturns: TenantScopedReturn[],
): AccessResult {
  const base = canAccessDocument(actor, doc)
  if (!base.allowed || !actor || actor.role !== 'preparer') return base
  const related = tenantReturns.filter(
    (r) => r.tenantId === doc.tenantId && (r.clientId === doc.clientId || r.clientId === doc.ownerId),
  )
  if (related.length === 0) return { allowed: true } // solo / unlinked vault still tenant-scoped
  const assigned = related.some(
    (r) =>
      !r.assignedPreparerIds?.length ||
      r.assignedPreparerIds.includes(actor.id) ||
      r.preparerId === actor.id,
  )
  if (!assigned) {
    return { allowed: false, reason: 'not_assigned', detail: 'Document belongs to a client not assigned to this preparer.' }
  }
  return { allowed: true }
}

export function filterReturnsForActor(
  actor: UserAccount | null | undefined,
  returns: TenantScopedReturn[],
): TenantScopedReturn[] {
  if (!actor) return []
  return returns.filter((r) => canAccessReturn(actor, r).allowed)
}

export function filterDocumentsForActor(
  actor: UserAccount | null | undefined,
  documents: TenantScopedDocument[],
): TenantScopedDocument[] {
  if (!actor) return []
  return documents.filter((d) => canAccessDocument(actor, d).allowed)
}

/** Reject client-supplied tenant spoofing — always use the authenticated user’s tenant. */
export function resolveWriteTenant(actor: UserAccount, claimedTenantId?: string): string {
  if (claimedTenantId && claimedTenantId !== actor.tenantId) {
    throw new Error('TENANT_SPOOF_REJECTED: client-supplied tenantId does not match authenticated tenant')
  }
  return actor.tenantId
}

export function assertNoClientQuota(actor: UserAccount, currentClientCount: number) {
  const tier = roleToTier(actor.role)
  if (!tier) return
  if (tier === 'TP' || tier === 'Office') {
    if (!assertUnlimitedProfessionalAccess(tier)) {
      throw new Error('Professional tier must allow unlimited clients')
    }
    // No cap — currentClientCount is informational only
    void currentClientCount
  }
}

export function assertNoReturnQuota(actor: UserAccount, currentReturnCount: number) {
  const tier = roleToTier(actor.role)
  if (tier === 'TP' || tier === 'Office') {
    if (!assertUnlimitedProfessionalAccess(tier)) {
      throw new Error('Professional tier must allow unlimited returns')
    }
    void currentReturnCount
  }
}

export function logSensitiveAccess(
  actor: UserAccount,
  action: string,
  resourceType: 'return' | 'document' | 'billing' | 'client',
  resourceId: string,
  allowed: boolean,
): { id: string; at: string; actorId: string; actorRole: Role | 'system'; action: string; summary: string; meta: Record<string, string | boolean> } {
  return {
    id: `acl-${Math.random().toString(36).slice(2, 9)}`,
    at: new Date().toISOString(),
    actorId: actor.id,
    actorRole: actor.role,
    action: allowed ? `access_granted_${action}` : `access_denied_${action}`,
    summary: `${allowed ? 'Allowed' : 'Denied'} ${resourceType} access (${resourceId}) for tenant ${actor.tenantId}.`,
    meta: {
      resourceType,
      resourceId,
      tenantId: actor.tenantId,
      allowed,
    },
  }
}

export function asScopedReturn(r: TaxReturn & { tenantId?: string; assignedPreparerIds?: string[] }): TenantScopedReturn {
  return {
    ...r,
    tenantId: r.tenantId ?? 'tenant-unknown',
    assignedPreparerIds: r.assignedPreparerIds,
  }
}

export function asScopedDocument(
  d: DocumentRecord & { tenantId?: string; clientId?: string; storagePath?: string },
): TenantScopedDocument {
  const tenantId = d.tenantId ?? 'tenant-unknown'
  return {
    ...d,
    tenantId,
    clientId: d.clientId ?? d.ownerId,
    storagePath: d.storagePath ?? vaultStoragePath(tenantId, d.ownerId, d.id),
  }
}
