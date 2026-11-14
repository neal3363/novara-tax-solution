/**
 * Amendment audit history — in-memory staging store.
 * Preserves original filed return snapshots separately from corrections.
 */

import type { AmendedAuditEntry } from '../types'
import type { IrsReturnInput } from '../../../irs/types'

export interface PreservedOriginalReturn {
  id: string
  tenantId: string
  taxpayerId: string
  taxYear: number
  preservedAt: string
  originalInput: IrsReturnInput
  label: string
}

const originals = new Map<string, PreservedOriginalReturn>()
const audits = new Map<string, AmendedAuditEntry[]>()

function key(tenantId: string, taxpayerId: string, taxYear: number): string {
  return `${tenantId}::${taxpayerId}::${taxYear}`
}

export function preserveOriginalReturn(opts: {
  tenantId: string
  taxpayerId: string
  taxYear: number
  originalInput: IrsReturnInput
  label?: string
  actorId: string
}): PreservedOriginalReturn {
  const id = `orig-${opts.tenantId}-${opts.taxpayerId}-${opts.taxYear}`
  const k = key(opts.tenantId, opts.taxpayerId, opts.taxYear)
  if (originals.has(k)) {
    // Never overwrite — preserve first filed snapshot
    appendAmendmentAudit({
      tenantId: opts.tenantId,
      taxpayerId: opts.taxpayerId,
      taxYear: opts.taxYear,
      actorId: opts.actorId,
      action: 'preserve_original_skipped',
      detail: { reason: 'original_already_preserved', id },
    })
    return originals.get(k)!
  }
  const rec: PreservedOriginalReturn = {
    id,
    tenantId: opts.tenantId,
    taxpayerId: opts.taxpayerId,
    taxYear: opts.taxYear,
    preservedAt: new Date().toISOString(),
    originalInput: structuredClone(opts.originalInput),
    label: opts.label ?? 'Original filed return',
  }
  originals.set(k, rec)
  appendAmendmentAudit({
    tenantId: opts.tenantId,
    taxpayerId: opts.taxpayerId,
    taxYear: opts.taxYear,
    actorId: opts.actorId,
    action: 'preserve_original',
    detail: { id, taxYear: opts.taxYear },
  })
  return rec
}

export function getPreservedOriginal(
  tenantId: string,
  taxpayerId: string,
  taxYear: number,
): PreservedOriginalReturn | null {
  return originals.get(key(tenantId, taxpayerId, taxYear)) ?? null
}

export function appendAmendmentAudit(opts: {
  tenantId: string
  taxpayerId: string
  taxYear: number
  actorId: string
  action: string
  detail: Record<string, unknown>
}): AmendedAuditEntry {
  const k = key(opts.tenantId, opts.taxpayerId, opts.taxYear)
  const entry: AmendedAuditEntry = {
    id: `amd-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actorId: opts.actorId,
    action: opts.action,
    detail: { ...opts.detail, tenantId: opts.tenantId, taxpayerId: opts.taxpayerId, taxYear: opts.taxYear },
  }
  const list = audits.get(k) ?? []
  list.push(entry)
  audits.set(k, list)
  return entry
}

export function listAmendmentAudit(
  tenantId: string,
  taxpayerId: string,
  taxYear: number,
): AmendedAuditEntry[] {
  return [...(audits.get(key(tenantId, taxpayerId, taxYear)) ?? [])]
}

export function resetAmendedStoreForTests(): void {
  originals.clear()
  audits.clear()
}
