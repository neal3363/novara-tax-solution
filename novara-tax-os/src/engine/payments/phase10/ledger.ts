/**
 * Financial transaction ledger + audit trail (sandbox).
 * Never stores raw PAN / full bank account numbers.
 */

import { randomBytes } from 'node:crypto'

export type LedgerEntryKind =
  | 'checkout_created'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_refunded'
  | 'subscription_created'
  | 'subscription_renewed'
  | 'subscription_canceled'
  | 'bank_settlement'
  | 'access_denied'
  | 'provider_outage'

export interface LedgerEntry {
  id: string
  at: string
  tenantId: string
  actorId: string
  kind: LedgerEntryKind
  amountCents?: number
  currency?: 'usd'
  refId?: string
  outcome: 'success' | 'denied' | 'error'
  meta: Record<string, string | number | boolean>
}

const FORBIDDEN = ['pan', 'cardNumber', 'cvv', 'accountNumber', 'ssn', 'password', 'secret']

const entries: LedgerEntry[] = []

export function resetLedgerForTests(): void {
  entries.length = 0
}

function sanitize(meta: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN.some((f) => k.toLowerCase().includes(f.toLowerCase()))) continue
    if (typeof v === 'string' && /^\d{13,19}$/.test(v.replace(/\s/g, ''))) continue
    out[k] = v
  }
  return out
}

export function appendLedger(input: Omit<LedgerEntry, 'id' | 'at' | 'meta'> & {
  meta?: Record<string, string | number | boolean>
}): LedgerEntry {
  const entry: LedgerEntry = {
    id: `led_${randomBytes(5).toString('hex')}`,
    at: new Date().toISOString(),
    tenantId: input.tenantId,
    actorId: input.actorId,
    kind: input.kind,
    amountCents: input.amountCents,
    currency: input.currency,
    refId: input.refId,
    outcome: input.outcome,
    meta: sanitize(input.meta ?? {}),
  }
  entries.push(entry)
  return { ...entry, meta: { ...entry.meta } }
}

export function listLedger(filter?: { tenantId?: string; kind?: LedgerEntryKind }): LedgerEntry[] {
  return entries
    .filter((e) => {
      if (filter?.tenantId && e.tenantId !== filter.tenantId) return false
      if (filter?.kind && e.kind !== filter.kind) return false
      return true
    })
    .map((e) => ({ ...e, meta: { ...e.meta } }))
}
