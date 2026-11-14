/**
 * Encrypted taxpayer document vault (Phase 6).
 * Encryption in transit is TLS at the edge; at-rest via AES-256-GCM + KMS envelope.
 * Do not claim operational until verifyEncryptionRoundTrip + vault self-test pass.
 */

import { getPhase6Flags } from './config'
import { hmacSha256Hex, randomId, randomToken, safeEqual, sha256Hex } from './cryptoUtil'
import {
  decryptWithDek,
  encryptWithDek,
  getKmsProvider,
  verifyEncryptionRoundTrip,
} from './kms'
import { scanUpload } from './malwareScan'
import { appendAudit } from './auditLog'
import { authorize } from './authorize'
import type { AuthSession, SecurityPrincipal } from './types'

export interface VaultObject {
  docId: string
  tenantId: string
  ownerId: string
  officeId?: string
  filename: string
  contentType: string
  keyId: string
  encryptedDek: Buffer
  iv: Buffer
  tag: Buffer
  ciphertext: Buffer
  aad: string
  sha256: string
  createdAt: string
  deletedAt?: string
  retainUntil: string
  malwareClean: boolean
}

export interface SignedAccessToken {
  token: string
  expiresAt: string
}

const objects = new Map<string, VaultObject>()
const TOKEN_HMAC_KEY = () => process.env.NOVARA_VAULT_TOKEN_HMAC || randomToken(32)
let tokenKey = TOKEN_HMAC_KEY()

export function resetVaultForTests(): void {
  objects.clear()
  tokenKey = randomToken(32)
}

export async function vaultUpload(input: {
  session: AuthSession
  principal: SecurityPrincipal
  ownerId: string
  officeId?: string
  filename: string
  contentType: string
  bytes: Buffer
  retentionDays?: number
  assignedPreparerIds?: string[]
}): Promise<{ docId: string; encryptionClaim: 'verified' | 'unverified' }> {
  const authz = authorize({
    session: input.session,
    principal: input.principal,
    action: 'document.write',
    resourceTenantId: input.session.tenantId,
    resourceOwnerId: input.ownerId,
    resourceOfficeId: input.officeId,
    assignedPreparerIds: input.assignedPreparerIds,
  })
  if (!authz.allowed) {
    appendAudit({
      actorId: input.principal.id,
      tenantId: input.session.tenantId,
      action: 'document_upload',
      resource: `doc:denied`,
      outcome: 'denied',
      meta: { code: authz.code },
    })
    throw new Error(authz.code)
  }

  const scan = await scanUpload(input.bytes, input.filename)
  if (!scan.clean) {
    appendAudit({
      actorId: input.principal.id,
      tenantId: input.session.tenantId,
      action: 'security_incident',
      resource: `upload:${input.filename}`,
      outcome: 'denied',
      meta: { threat: scan.threatName ?? 'unknown', scanner: scan.scanner },
    })
    throw new Error('malware_detected')
  }

  const kms = getKmsProvider()
  const keyId = `vault-${input.session.tenantId}`
  const dk = kms.generateDataKey(keyId)
  const aad = `${input.session.tenantId}|${input.ownerId}|${input.filename}`
  const { ciphertext, iv, tag } = encryptWithDek(dk.plaintext, input.bytes, aad)
  // Zeroize plaintext DEK reference where possible
  dk.plaintext.fill(0)

  const docId = randomId('doc')
  const retentionDays = input.retentionDays ?? 2555 // ~7 years default policy
  const obj: VaultObject = {
    docId,
    tenantId: input.session.tenantId,
    ownerId: input.ownerId,
    officeId: input.officeId,
    filename: input.filename,
    contentType: input.contentType,
    keyId: dk.keyId,
    encryptedDek: dk.encryptedDek,
    iv,
    tag,
    ciphertext,
    aad,
    sha256: sha256Hex(ciphertext),
    createdAt: new Date().toISOString(),
    retainUntil: new Date(Date.now() + retentionDays * 86400000).toISOString(),
    malwareClean: true,
  }
  objects.set(docId, obj)

  appendAudit({
    actorId: input.principal.id,
    tenantId: input.session.tenantId,
    action: 'document_upload',
    resource: `doc:${docId}`,
    outcome: 'success',
    meta: { filename: input.filename, bytes: input.bytes.length, contentType: input.contentType },
  })

  const flags = getPhase6Flags()
  return {
    docId,
    encryptionClaim: flags.vaultEncryptionVerified ? 'verified' : 'unverified',
  }
}

export function issueSignedDownloadToken(input: {
  session: AuthSession
  principal: SecurityPrincipal
  docId: string
  ttlSec?: number
  assignedPreparerIds?: string[]
}): SignedAccessToken {
  const obj = objects.get(input.docId)
  if (!obj || obj.deletedAt) throw new Error('not_found')
  const authz = authorize({
    session: input.session,
    principal: input.principal,
    action: 'document.read',
    resourceTenantId: obj.tenantId,
    resourceOwnerId: obj.ownerId,
    resourceOfficeId: obj.officeId,
    assignedPreparerIds: input.assignedPreparerIds,
  })
  if (!authz.allowed) throw new Error(authz.code)

  const ttl = input.ttlSec ?? 120
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
  const body = `${obj.docId}|${input.principal.id}|${expiresAt}|${obj.tenantId}`
  const sig = hmacSha256Hex(tokenKey, body)
  const token = Buffer.from(JSON.stringify({ body, sig })).toString('base64url')
  return { token, expiresAt }
}

export function downloadWithSignedToken(input: {
  token: string
  session: AuthSession
  principal: SecurityPrincipal
}): { bytes: Buffer; filename: string; contentType: string; encryptionVerified: boolean } {
  let parsed: { body: string; sig: string }
  try {
    parsed = JSON.parse(Buffer.from(input.token, 'base64url').toString('utf8'))
  } catch {
    throw new Error('token_invalid')
  }
  const expected = hmacSha256Hex(tokenKey, parsed.body)
  if (!safeEqual(expected, parsed.sig)) throw new Error('token_misuse')
  const [docId, principalId, expiresAt, tenantId] = parsed.body.split('|')
  if (principalId !== input.principal.id) throw new Error('token_misuse')
  if (tenantId !== input.session.tenantId) throw new Error('token_misuse')
  if (new Date(expiresAt).getTime() < Date.now()) throw new Error('token_expired')

  const obj = objects.get(docId)
  if (!obj || obj.deletedAt) throw new Error('not_found')

  const authz = authorize({
    session: input.session,
    principal: input.principal,
    action: 'document.read',
    resourceTenantId: obj.tenantId,
    resourceOwnerId: obj.ownerId,
    resourceOfficeId: obj.officeId,
  })
  if (!authz.allowed) {
    appendAudit({
      actorId: input.principal.id,
      tenantId: input.session.tenantId,
      action: 'document_download',
      resource: `doc:${docId}`,
      outcome: 'denied',
      meta: { code: authz.code },
    })
    throw new Error(authz.code)
  }

  const kms = getKmsProvider()
  const dek = kms.decryptDataKey(obj.keyId, obj.encryptedDek)
  const bytes = decryptWithDek(dek, obj.ciphertext, obj.iv, obj.tag, obj.aad)
  dek.fill(0)

  appendAudit({
    actorId: input.principal.id,
    tenantId: input.session.tenantId,
    action: 'document_download',
    resource: `doc:${docId}`,
    outcome: 'success',
    meta: { filename: obj.filename },
  })

  return {
    bytes,
    filename: obj.filename,
    contentType: obj.contentType,
    encryptionVerified: getPhase6Flags().vaultEncryptionVerified,
  }
}

export function secureDelete(input: {
  session: AuthSession
  principal: SecurityPrincipal
  docId: string
  assignedPreparerIds?: string[]
}): void {
  const obj = objects.get(input.docId)
  if (!obj) throw new Error('not_found')
  const authz = authorize({
    session: input.session,
    principal: input.principal,
    action: 'document.delete',
    resourceTenantId: obj.tenantId,
    resourceOwnerId: obj.ownerId,
    resourceOfficeId: obj.officeId,
    assignedPreparerIds: input.assignedPreparerIds,
  })
  if (!authz.allowed) throw new Error(authz.code)

  obj.ciphertext.fill(0)
  obj.encryptedDek.fill(0)
  obj.deletedAt = new Date().toISOString()
  objects.set(obj.docId, obj)
  appendAudit({
    actorId: input.principal.id,
    tenantId: input.session.tenantId,
    action: 'vault_delete',
    resource: `doc:${obj.docId}`,
    outcome: 'success',
    meta: { retainUntil: obj.retainUntil },
  })
}

export function purgeExpiredDeleted(): number {
  const now = Date.now()
  let n = 0
  for (const [id, obj] of objects) {
    if (obj.deletedAt && new Date(obj.retainUntil).getTime() < now) {
      objects.delete(id)
      n++
    }
  }
  return n
}

export function vaultSelfTest(): {
  encryptionVerified: boolean
  note: string
} {
  const round = verifyEncryptionRoundTrip()
  return {
    encryptionVerified: round.verified && getPhase6Flags().vaultEncryptionVerified,
    note: round.verified
      ? 'Local envelope round-trip verified — cloud KMS still required for production claim'
      : 'Encryption verification failed — do not claim operational',
  }
}

export function getVaultObjectMeta(docId: string): Omit<VaultObject, 'ciphertext' | 'encryptedDek' | 'iv' | 'tag'> | null {
  const o = objects.get(docId)
  if (!o) return null
  const { ciphertext: _c, encryptedDek: _e, iv: _i, tag: _t, ...meta } = o
  return meta
}

/** Staging durability export — copies encrypted material only (never plaintext). */
export function exportEncryptedVaultObject(docId: string): VaultObject | null {
  const o = objects.get(docId)
  if (!o) return null
  return {
    ...o,
    encryptedDek: Buffer.from(o.encryptedDek),
    iv: Buffer.from(o.iv),
    tag: Buffer.from(o.tag),
    ciphertext: Buffer.from(o.ciphertext),
  }
}
