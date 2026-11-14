/**
 * Secure transmission logging — no SSNs, full returns, or transmitter secrets.
 */

export type MefLogAction =
  | 'compose'
  | 'validate'
  | 'readiness_check'
  | 'authorization_check'
  | 'transmit_attempt'
  | 'transmit_blocked'
  | 'transmit_success'
  | 'ack_received'
  | 'reject_interpreted'
  | 'correction_resubmit'
  | 'duplicate_blocked'
  | 'outage'
  | 'security_denied'

export interface MefSecureLogEntry {
  id: string
  at: string
  action: MefLogAction
  submissionId?: string
  tenantId: string
  actorId: string
  outcome: 'success' | 'denied' | 'error'
  meta: Record<string, string | number | boolean>
}

const FORBIDDEN = ['ssn', 'tin', 'password', 'secret', 'certificatePem', 'xml', 'plaintext', 'ptinFull', 'efinFull']

const log: MefSecureLogEntry[] = []
let seq = 0

export function resetMefLogForTests(): void {
  log.length = 0
  seq = 0
}

function sanitize(meta: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN.some((f) => k.toLowerCase().includes(f.toLowerCase()))) continue
    if (typeof v === 'string' && /\b\d{3}-\d{2}-\d{4}\b/.test(v)) continue
    if (typeof v === 'string' && v.length > 500) continue
    out[k] = v
  }
  return out
}

export function appendMefLog(input: {
  action: MefLogAction
  tenantId: string
  actorId: string
  outcome: 'success' | 'denied' | 'error'
  submissionId?: string
  meta?: Record<string, string | number | boolean>
}): MefSecureLogEntry {
  const entry: MefSecureLogEntry = {
    id: `meflog_${++seq}`,
    at: new Date().toISOString(),
    action: input.action,
    submissionId: input.submissionId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    outcome: input.outcome,
    meta: sanitize(input.meta ?? {}),
  }
  log.push(entry)
  return { ...entry }
}

export function listMefLog(filter?: { submissionId?: string; action?: MefLogAction }): MefSecureLogEntry[] {
  return log
    .filter((e) => {
      if (filter?.submissionId && e.submissionId !== filter.submissionId) return false
      if (filter?.action && e.action !== filter.action) return false
      return true
    })
    .map((e) => ({ ...e, meta: { ...e.meta } }))
}

export function mefLogLength(): number {
  return log.length
}
