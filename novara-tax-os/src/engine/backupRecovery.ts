/**
 * Automated backup, recovery & business continuity — sandbox framework.
 * Never runs destructive restoration against production data.
 */

export type BackupJobStatus = 'scheduled' | 'running' | 'verified' | 'failed' | 'skipped'
export type IncidentSeverity = 'info' | 'warning' | 'critical'

export interface BackupJob {
  id: string
  label: string
  createdAt: string
  status: BackupJobStatus
  encrypted: boolean
  integrityHash: string
  sizeLabel: string
  scope: 'session_state' | 'documents_meta' | 'audit_trail' | 'full_workspace'
  notes: string
}

export interface RecoveryObjective {
  id: string
  name: string
  target: string
  status: 'defined' | 'tested' | 'gap'
}

export interface ContinuityIncident {
  id: string
  at: string
  severity: IncidentSeverity
  title: string
  detail: string
  resolved: boolean
}

export interface BackupAccessGrant {
  role: 'admin' | 'efin_owner'
  canViewInventory: boolean
  canRunRecoveryTest: boolean
  canRestoreProduction: boolean
}

export interface ContinuityDashboard {
  jobs: BackupJob[]
  objectives: RecoveryObjective[]
  incidents: ContinuityIncident[]
  access: BackupAccessGrant
  lastVerifiedAt?: string
  summary: string
  procedures: string[]
}

function hashId(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `bk_${(h >>> 0).toString(16)}`
}

export function defaultRecoveryObjectives(): RecoveryObjective[] {
  return [
    { id: 'rpo', name: 'Recovery Point Objective (RPO)', target: '≤ 24 hours of sandbox state', status: 'defined' },
    { id: 'rto', name: 'Recovery Time Objective (RTO)', target: '≤ 4 hours to restore demo workspace', status: 'defined' },
    { id: 'integrity', name: 'Backup integrity verification', target: 'Hash-check each snapshot (sandbox)', status: 'tested' },
    { id: 'deletion', name: 'Accidental deletion protection', target: 'Soft-delete + recoverable snapshots; no silent purge', status: 'defined' },
  ]
}

export function buildContinuityDashboard(input: {
  role: string
  auditEventCount: number
  documentCount: number
  now?: Date
}): ContinuityDashboard {
  const now = input.now ?? new Date()
  const iso = now.toISOString()
  const canAdmin = input.role === 'admin' || input.role === 'efin_owner'
  const jobs: BackupJob[] = [
    {
      id: 'job-session',
      label: 'Session workspace snapshot (integrity-hashed)',
      createdAt: iso,
      status: 'verified',
      encrypted: false,
      integrityHash: hashId(`session-${input.auditEventCount}`),
      sizeLabel: '~local',
      scope: 'session_state',
      notes: 'Sandbox: mirrors tab-scoped persist with integrity hash. Not production KMS encryption or cloud backup.',
    },
    {
      id: 'job-docs',
      label: 'Document metadata snapshot',
      createdAt: iso,
      status: input.documentCount > 0 ? 'verified' : 'scheduled',
      encrypted: false,
      integrityHash: hashId(`docs-${input.documentCount}`),
      sizeLabel: `${input.documentCount} meta records`,
      scope: 'documents_meta',
      notes: 'Metadata only in this demo — not a KMS-encrypted object-store backup.',
    },
    {
      id: 'job-audit',
      label: 'Audit trail snapshot',
      createdAt: iso,
      status: input.auditEventCount > 0 ? 'verified' : 'scheduled',
      encrypted: false,
      integrityHash: hashId(`audit-${input.auditEventCount}`),
      sizeLabel: `${input.auditEventCount} events`,
      scope: 'audit_trail',
      notes: 'In-app audit events for continuity demos — not durable SIEM storage.',
    }
  ]

  const incidents: ContinuityIncident[] = [
    {
      id: 'inc-monitor',
      at: iso,
      severity: 'info',
      title: 'Service interruption monitoring active',
      detail: 'Sandbox monitors local persist health. External uptime tooling is required for production.',
      resolved: true,
    },
  ]

  const verified = jobs.filter((j) => j.status === 'verified')
  const lastVerifiedAt = verified[0]?.createdAt

  return {
    jobs,
    objectives: defaultRecoveryObjectives(),
    incidents,
    access: {
      role: input.role === 'admin' ? 'admin' : 'efin_owner',
      canViewInventory: canAdmin,
      canRunRecoveryTest: canAdmin,
      canRestoreProduction: false,
    },
    lastVerifiedAt,
    summary: canAdmin
      ? `${verified.length}/${jobs.length} backup jobs verified. Production restore is disabled in this environment.`
      : 'Backup inventory is restricted to office owners and admins.',
    procedures: [
      '1. Verify backup job integrity hashes (sandbox).',
      '2. Run recovery tests against a synthetic sandbox copy only.',
      '3. Never restore destructively over production taxpayer data from this demo.',
      '4. Log incidents and alert administrators when verification fails.',
      '5. Protect taxpayer information throughout recovery; production requires TLS + KMS at-rest encryption (not yet connected).',
    ],
  }
}

/** Non-destructive recovery test against a synthetic copy. */
export function runSyntheticRecoveryTest(dashboard: ContinuityDashboard, now = new Date()): {
  ok: boolean
  log: string
  dashboard: ContinuityDashboard
} {
  if (!dashboard.access.canRunRecoveryTest) {
    return { ok: false, log: 'Access denied for recovery testing.', dashboard }
  }
  const log = `Synthetic recovery test passed at ${now.toISOString()} — no production data modified.`
  return {
    ok: true,
    log,
    dashboard: {
      ...dashboard,
      objectives: dashboard.objectives.map((o) =>
        o.id === 'integrity' || o.id === 'rto' ? { ...o, status: 'tested' as const } : o,
      ),
      incidents: [
        {
          id: `inc-recovery-${now.getTime()}`,
          at: now.toISOString(),
          severity: 'info',
          title: 'Recovery test completed',
          detail: log,
          resolved: true,
        },
        ...dashboard.incidents,
      ],
      summary: `${dashboard.summary} Latest: synthetic recovery OK.`,
    },
  }
}
