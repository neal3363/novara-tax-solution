/**
 * Server-side protected operations for staging API.
 * Authorization always runs on the server — frontend RoleGate is not trusted.
 */

import {
  authorize,
  requireActiveSession,
  getSession,
  appendAudit,
  revokeSession,
  vaultUpload,
  issueSignedDownloadToken,
  downloadWithSignedToken,
  secureDelete,
  vaultSelfTest,
  exportEncryptedVaultObject,
} from '../phase6/index'
import type { AuthSession, AuthzAction, SecurityPrincipal } from '../phase6/types'
import { durableAppendAudit, durableSaveSession, durableRevokeSession, durableSaveVaultBlob, durableMarkVaultDeleted } from './durableStore'
import { getPhase7Flags } from './config'

export function resolveSessionPrincipal(sessionId: string): {
  session: AuthSession
  principal: SecurityPrincipal
} {
  return requireActiveSession(sessionId)
}

export function serverAuthorize(input: {
  sessionId: string
  action: AuthzAction
  resourceTenantId: string
  resourceOwnerId?: string
  resourceOfficeId?: string
  assignedPreparerIds?: string[]
}) {
  const { session, principal } = resolveSessionPrincipal(input.sessionId)
  const result = authorize({
    session,
    principal,
    action: input.action,
    resourceTenantId: input.resourceTenantId,
    resourceOwnerId: input.resourceOwnerId,
    resourceOfficeId: input.resourceOfficeId,
    assignedPreparerIds: input.assignedPreparerIds,
  })

  appendAudit({
    actorId: principal.id,
    tenantId: session.tenantId,
    action: input.action.startsWith('client.')
      ? 'client_access'
      : input.action === 'return.submit'
        ? 'return_submit'
        : input.action.startsWith('document.')
          ? 'document_download'
          : input.action.startsWith('office.')
            ? 'permission_change'
            : 'admin_action',
    resource: `${input.action}:${input.resourceOwnerId ?? input.resourceTenantId}`,
    outcome: result.allowed ? 'success' : 'denied',
    meta: { code: result.code, reason: result.reason },
  })

  return { ...result, session, principal }
}

export function persistSessionSnapshot(session: AuthSession): void {
  if (!getPhase7Flags().durableStoreEnabled) return
  durableSaveSession({
    sessionId: session.sessionId,
    principalId: session.principalId,
    tenantId: session.tenantId,
    role: session.role,
    accountType: session.accountType,
    status: session.status,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    mfaSatisfied: session.mfaSatisfied,
    savedAt: new Date().toISOString(),
  })
}

export function stagingRevokeSession(sessionId: string, actorId: string) {
  const before = getSession(sessionId)
  const revoked = revokeSession(sessionId, actorId)
  if (revoked && getPhase7Flags().durableStoreEnabled) {
    durableRevokeSession(sessionId, revoked.revokedAt ?? new Date().toISOString())
  }
  if (revoked) {
    const rec = appendAudit({
      actorId,
      tenantId: revoked.tenantId,
      action: 'session_revoke',
      resource: `session:${sessionId}`,
      outcome: 'success',
      meta: { prevStatus: before?.status ?? 'missing' },
    })
    if (getPhase7Flags().durableStoreEnabled) durableAppendAudit(rec)
  }
  return revoked
}

export async function stagingVaultUpload(input: {
  sessionId: string
  ownerId: string
  officeId?: string
  filename: string
  contentType: string
  bytes: Buffer
  assignedPreparerIds?: string[]
}) {
  const { session, principal } = resolveSessionPrincipal(input.sessionId)
  const result = await vaultUpload({
    session,
    principal,
    ownerId: input.ownerId,
    officeId: input.officeId,
    filename: input.filename,
    contentType: input.contentType,
    bytes: input.bytes,
    assignedPreparerIds: input.assignedPreparerIds,
  })

  if (getPhase7Flags().durableStoreEnabled) {
    const full = exportEncryptedVaultObject(result.docId)
    if (full) {
      durableSaveVaultBlob({
        docId: full.docId,
        tenantId: full.tenantId,
        ownerId: full.ownerId,
        officeId: full.officeId,
        filename: full.filename,
        contentType: full.contentType,
        keyId: full.keyId,
        encryptedDekB64: full.encryptedDek.toString('base64'),
        ivB64: full.iv.toString('base64'),
        tagB64: full.tag.toString('base64'),
        ciphertextB64: full.ciphertext.toString('base64'),
        aad: full.aad,
        sha256: full.sha256,
        createdAt: full.createdAt,
        deletedAt: full.deletedAt,
        retainUntil: full.retainUntil,
        malwareClean: full.malwareClean,
      })
    }
  }

  return result
}

export function stagingIssueDownloadToken(input: {
  sessionId: string
  docId: string
  ttlSec?: number
  assignedPreparerIds?: string[]
}) {
  const { session, principal } = resolveSessionPrincipal(input.sessionId)
  return issueSignedDownloadToken({
    session,
    principal,
    docId: input.docId,
    ttlSec: input.ttlSec,
    assignedPreparerIds: input.assignedPreparerIds,
  })
}

export function stagingDownload(input: { sessionId: string; token: string }) {
  const { session, principal } = resolveSessionPrincipal(input.sessionId)
  return downloadWithSignedToken({ token: input.token, session, principal })
}

export function stagingSecureDelete(input: {
  sessionId: string
  docId: string
  assignedPreparerIds?: string[]
}) {
  const { session, principal } = resolveSessionPrincipal(input.sessionId)
  secureDelete({
    session,
    principal,
    docId: input.docId,
    assignedPreparerIds: input.assignedPreparerIds,
  })
  if (getPhase7Flags().durableStoreEnabled) durableMarkVaultDeleted(input.docId)
}

export function stagingVaultSelfTest() {
  return vaultSelfTest()
}

export function mirrorAuditToDurable(): void {
  // no-op helper placeholder — individual ops call durableAppendAudit
}
