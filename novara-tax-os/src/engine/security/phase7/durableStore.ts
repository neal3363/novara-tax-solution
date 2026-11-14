/**
 * Durable staging storage for audit, vault ciphertext, and session snapshots.
 * Filesystem-backed under .novara-staging-security/ — synthetic data only.
 * Access-controlled by process FS permissions; not a production SIEM.
 */

import { mkdirSync, appendFileSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import type { AuditRecord } from '../phase6/types'

export interface DurableVaultBlob {
  docId: string
  tenantId: string
  ownerId: string
  officeId?: string
  filename: string
  contentType: string
  keyId: string
  encryptedDekB64: string
  ivB64: string
  tagB64: string
  ciphertextB64: string
  aad: string
  sha256: string
  createdAt: string
  deletedAt?: string
  retainUntil: string
  malwareClean: boolean
}

export interface DurableSessionSnapshot {
  sessionId: string
  principalId: string
  tenantId: string
  role: string
  accountType: string
  status: string
  expiresAt: string
  revokedAt?: string
  mfaSatisfied: boolean
  savedAt: string
}

function defaultRoot(): string {
  return process.env.NOVARA_STAGING_SECURITY_DIR
    || join(process.cwd(), '.novara-staging-security')
}

let root = defaultRoot()

/**
 * Restrict durable roots to staging-safe directories (tmpdir, cwd staging dir, or env dir).
 * Blocks client-controlled path traversal outside those trees.
 */
export function setDurableRoot(path: string): void {
  const resolved = resolve(path)
  const allowedPrefixes = [
    resolve(tmpdir()) + sep,
    resolve(process.cwd(), '.novara-staging-security'),
  ]
  if (process.env.NOVARA_STAGING_SECURITY_DIR) {
    allowedPrefixes.push(resolve(process.env.NOVARA_STAGING_SECURITY_DIR))
  }
  const ok = allowedPrefixes.some((prefix) => {
    if (prefix.endsWith(sep)) return resolved.startsWith(prefix) || resolved + sep === prefix
    return resolved === prefix || resolved.startsWith(prefix + sep)
  })
  if (!ok) {
    throw new Error('durable_root_not_allowed')
  }
  root = resolved
}

export function getDurableRoot(): string {
  return root
}

export function ensureDurableDirs(): void {
  for (const sub of ['', 'audit', 'vault', 'sessions', 'kms', 'quarantine']) {
    const p = sub ? join(root, sub) : root
    if (!existsSync(p)) mkdirSync(p, { recursive: true, mode: 0o700 })
  }
}

function auditPath(): string {
  return join(root, 'audit', 'chain.jsonl')
}

function vaultMetaPath(docId: string): string {
  return join(root, 'vault', `${docId}.json`)
}

function sessionPath(sessionId: string): string {
  return join(root, 'sessions', `${sessionId}.json`)
}

/**
 * Append audit record to durable JSONL (append-only).
 * Re-chains onto the durable tip so the file is self-consistent even when
 * the in-memory Phase 6 chain has a different history.
 */
export function durableAppendAudit(rec: AuditRecord): void {
  ensureDurableDirs()
  const existing = durableLoadAudit()
  const prevHash = existing.length > 0 ? existing[existing.length - 1]!.hash : 'genesis'
  const meta = rec.meta ?? {}
  const payload = `${prevHash}|${rec.id}|${rec.at}|${rec.actorId}|${rec.tenantId}|${rec.action}|${rec.resource}|${rec.outcome}|${JSON.stringify(meta)}`
  const hash = createHash('sha256').update(payload).digest('hex')
  const linked: AuditRecord = { ...rec, meta, prevHash, hash }
  appendFileSync(auditPath(), `${JSON.stringify(linked)}\n`, { mode: 0o600 })
}

export function durableLoadAudit(): AuditRecord[] {
  ensureDurableDirs()
  if (!existsSync(auditPath())) return []
  const text = readFileSync(auditPath(), 'utf8')
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRecord)
}

export function durableVerifyAuditChain(records?: AuditRecord[]): { ok: boolean; brokenAt?: string; count: number } {
  const chain = records ?? durableLoadAudit()
  let prev = 'genesis'
  for (const rec of chain) {
    if (rec.prevHash !== prev) return { ok: false, brokenAt: rec.id, count: chain.length }
    const payload = `${rec.prevHash}|${rec.id}|${rec.at}|${rec.actorId}|${rec.tenantId}|${rec.action}|${rec.resource}|${rec.outcome}|${JSON.stringify(rec.meta)}`
    const hash = createHash('sha256').update(payload).digest('hex')
    if (hash !== rec.hash) return { ok: false, brokenAt: rec.id, count: chain.length }
    prev = rec.hash
  }
  return { ok: true, count: chain.length }
}

/** Tamper durable file for tests (should break verify). */
export function __tamperDurableAuditForTests(): void {
  ensureDurableDirs()
  if (!existsSync(auditPath())) return
  const lines = readFileSync(auditPath(), 'utf8').split('\n').filter(Boolean)
  if (!lines[0]) return
  const rec = JSON.parse(lines[0]) as AuditRecord
  rec.action = 'admin_action'
  lines[0] = JSON.stringify(rec)
  writeFileSync(auditPath(), `${lines.join('\n')}\n`, { mode: 0o600 })
}

export function durableSaveVaultBlob(blob: DurableVaultBlob): void {
  ensureDurableDirs()
  writeFileSync(vaultMetaPath(blob.docId), JSON.stringify(blob), { mode: 0o600 })
}

export function durableLoadVaultBlob(docId: string): DurableVaultBlob | null {
  ensureDurableDirs()
  const p = vaultMetaPath(docId)
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf8')) as DurableVaultBlob
}

export function durableMarkVaultDeleted(docId: string): void {
  const blob = durableLoadVaultBlob(docId)
  if (!blob) return
  blob.deletedAt = new Date().toISOString()
  blob.ciphertextB64 = ''
  blob.encryptedDekB64 = ''
  durableSaveVaultBlob(blob)
}

export function durableSaveSession(snap: DurableSessionSnapshot): void {
  ensureDurableDirs()
  writeFileSync(sessionPath(snap.sessionId), JSON.stringify(snap), { mode: 0o600 })
}

export function durableLoadSession(sessionId: string): DurableSessionSnapshot | null {
  ensureDurableDirs()
  const p = sessionPath(sessionId)
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf8')) as DurableSessionSnapshot
}

export function durableRevokeSession(sessionId: string, revokedAt: string): void {
  const snap = durableLoadSession(sessionId)
  if (!snap) return
  snap.status = 'revoked'
  snap.revokedAt = revokedAt
  durableSaveSession(snap)
}

export function quarantineFile(filename: string, bytes: Buffer, reason: string): string {
  ensureDurableDirs()
  const id = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const meta = join(root, 'quarantine', `${id}.meta.json`)
  const bin = join(root, 'quarantine', `${id}.bin`)
  writeFileSync(bin, bytes, { mode: 0o600 })
  writeFileSync(meta, JSON.stringify({ filename, reason, at: new Date().toISOString(), id }), { mode: 0o600 })
  return id
}

export function resetDurableStoreForTests(): void {
  ensureDurableDirs()
  // Truncate audit; leave dirs
  writeFileSync(auditPath(), '', { mode: 0o600 })
  // Best-effort clear vault/sessions/quarantine by renaming root in tests via setDurableRoot
}

export function wipeDurableRootForTests(): void {
  // Caller should setDurableRoot to a temp path; remove known files
  ensureDurableDirs()
  for (const sub of ['audit', 'vault', 'sessions', 'kms', 'quarantine'] as const) {
    const dir = join(root, sub)
    if (!existsSync(dir)) continue
    // Use rename to trash then recreate empty
    const trash = `${dir}.trash-${Date.now()}`
    try {
      renameSync(dir, trash)
      mkdirSync(dir, { recursive: true, mode: 0o700 })
      // leave trash; tests use temp roots
    } catch {
      /* ignore */
    }
  }
  if (existsSync(auditPath())) unlinkSync(auditPath())
}
