/**
 * Durable security audit logging with hash chain (tamper evidence).
 * Never log SSNs or full tax documents.
 */

import { randomId, sha256Hex } from './cryptoUtil'
import type { AuditAction, AuditRecord } from './types'

const FORBIDDEN_META_KEYS = [
  'ssn',
  'socialSecurityNumber',
  'tin',
  'fullSsn',
  'documentBytes',
  'ciphertext',
  'plaintext',
  'password',
  'totpSecret',
  'recoveryCode',
]

const chain: AuditRecord[] = []
let lastHash = 'genesis'

export function resetAuditLogForTests(): void {
  chain.length = 0
  lastHash = 'genesis'
}

function sanitizeMeta(meta: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_META_KEYS.some((f) => k.toLowerCase().includes(f.toLowerCase()))) continue
    if (typeof v === 'string' && /\b\d{3}-\d{2}-\d{4}\b/.test(v)) continue
    out[k] = v
  }
  return out
}

export function appendAudit(input: {
  actorId: string
  tenantId: string
  action: AuditAction
  resource: string
  outcome: 'success' | 'denied' | 'error'
  meta?: Record<string, string | number | boolean>
}): AuditRecord {
  const id = randomId('aud')
  const at = new Date().toISOString()
  const meta = sanitizeMeta(input.meta ?? {})
  const payload = `${lastHash}|${id}|${at}|${input.actorId}|${input.tenantId}|${input.action}|${input.resource}|${input.outcome}|${JSON.stringify(meta)}`
  const hash = sha256Hex(payload)
  const rec: AuditRecord = {
    id,
    at,
    actorId: input.actorId,
    tenantId: input.tenantId,
    action: input.action,
    resource: input.resource,
    outcome: input.outcome,
    meta,
    prevHash: lastHash,
    hash,
  }
  chain.push(rec)
  lastHash = hash
  return { ...rec }
}

export function verifyAuditChain(): { ok: boolean; brokenAt?: string } {
  let prev = 'genesis'
  for (const rec of chain) {
    if (rec.prevHash !== prev) return { ok: false, brokenAt: rec.id }
    const payload = `${rec.prevHash}|${rec.id}|${rec.at}|${rec.actorId}|${rec.tenantId}|${rec.action}|${rec.resource}|${rec.outcome}|${JSON.stringify(rec.meta)}`
    if (sha256Hex(payload) !== rec.hash) return { ok: false, brokenAt: rec.id }
    prev = rec.hash
  }
  return { ok: true }
}

/** Tamper attempt for tests — should break chain verification. */
export function __tamperAuditForTests(index: number, patch: Partial<AuditRecord>): void {
  const rec = chain[index]
  if (!rec) return
  Object.assign(rec, patch)
}

export function listAudit(filter?: { actorId?: string; action?: AuditAction; tenantId?: string }): AuditRecord[] {
  return chain
    .filter((r) => {
      if (filter?.actorId && r.actorId !== filter.actorId) return false
      if (filter?.action && r.action !== filter.action) return false
      if (filter?.tenantId && r.tenantId !== filter.tenantId) return false
      return true
    })
    .map((r) => ({ ...r }))
}

export function auditLogLength(): number {
  return chain.length
}
