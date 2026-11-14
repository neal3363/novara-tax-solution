/**
 * Client intake engagement letters & IRC 7216-oriented consent lifecycle.
 * Additive — does not replace filingAuthorizations Form 8879 / e-file consents.
 * A general engagement letter is NOT authorization for every use/disclosure.
 */

export type EngagementConsentKind =
  | 'engagement_letter'
  | 'privacy_notice'
  | 'section_7216_use_disclosure'
  | 'electronic_communication'
  | 'intake_completeness'

export type ConsentLifecycleStatus = 'pending' | 'signed' | 'expired' | 'withdrawn'

export interface EngagementDocumentVersion {
  kind: EngagementConsentKind
  version: string
  title: string
  body: string
  /** Months until expiry; null = no automatic expiry */
  expiresAfterMonths: number | null
}

export interface EngagementConsentRecord {
  id: string
  kind: EngagementConsentKind
  version: string
  status: ConsentLifecycleStatus
  signedAt?: string
  signerName?: string
  expiresAt?: string
  withdrawnAt?: string
  withdrawalReason?: string
  contentHash: string
}

export interface ConsentAuditEntry {
  id: string
  at: string
  kind: EngagementConsentKind
  version: string
  action: 'presented' | 'signed' | 'withdrawn' | 'expired' | 'downloaded'
  detail: string
}

export interface EngagementConsentState {
  intakeAnswers: Record<string, string>
  records: EngagementConsentRecord[]
  audit: ConsentAuditEntry[]
  updatedAt: string
}

export const ENGAGEMENT_DOCUMENTS: EngagementDocumentVersion[] = [
  {
    kind: 'engagement_letter',
    version: 'engagement-2025-v1',
    title: 'Tax preparation engagement letter',
    body: 'This letter confirms the scope of tax preparation services for the selected tax year(s). It does not authorize unrelated uses or disclosures of tax return information beyond preparation and filing.',
    expiresAfterMonths: 12,
  },
  {
    kind: 'privacy_notice',
    version: 'privacy-2025-v1',
    title: 'Taxpayer privacy notice',
    body: 'NOVARA and your tax office protect confidential tax information. Review how information is collected, used, and retained for preparation.',
    expiresAfterMonths: null,
  },
  {
    kind: 'section_7216_use_disclosure',
    version: '7216-2025-v1',
    title: 'IRC §7216 consent — use and disclosure',
    body: 'Separate consent for use or disclosure of tax return information as required under IRC §7216 and applicable regulations. A signed engagement letter alone is not sufficient for all uses or disclosures.',
    expiresAfterMonths: 12,
  },
  {
    kind: 'electronic_communication',
    version: 'ecomm-2025-v1',
    title: 'Consent to electronic communication',
    body: 'Authorize NOVARA and your tax office to communicate with you electronically about your tax return (secure messages, document requests, status updates).',
    expiresAfterMonths: 24,
  },
  {
    kind: 'intake_completeness',
    version: 'intake-2025-v1',
    title: 'Client intake acknowledgment',
    body: 'I confirm intake answers are complete and accurate to the best of my knowledge, and that I will provide missing information when requested.',
    expiresAfterMonths: 12,
  },
]

const INTAKE_FIELDS = [
  { id: 'preferred_name', label: 'Preferred name', fromProfile: 'name' },
  { id: 'mailing_address', label: 'Mailing address', fromProfile: null },
  { id: 'phone', label: 'Phone', fromProfile: null },
  { id: 'email', label: 'Email', fromProfile: 'email' },
  { id: 'prior_preparer', label: 'Prior-year preparer (if any)', fromProfile: null },
  { id: 'communication_pref', label: 'Preferred contact method', fromProfile: null },
] as const

function hashText(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return `ec_${h.toString(16)}`
}

export function emptyEngagementConsentState(): EngagementConsentState {
  return {
    intakeAnswers: {},
    records: ENGAGEMENT_DOCUMENTS.map((d) => ({
      id: `ec-${d.kind}`,
      kind: d.kind,
      version: d.version,
      status: 'pending',
      contentHash: hashText(d.version + d.body),
    })),
    audit: ENGAGEMENT_DOCUMENTS.map((d) => ({
      id: `aud-presented-${d.kind}`,
      at: new Date().toISOString(),
      kind: d.kind,
      version: d.version,
      action: 'presented' as const,
      detail: `Presented ${d.title}`,
    })),
    updatedAt: new Date().toISOString(),
  }
}

/** Ask only for intake fields not already reliably available. */
export function missingIntakeFields(input: {
  answers: Record<string, string>
  knownName?: string
  knownEmail?: string
}): { id: string; label: string }[] {
  return INTAKE_FIELDS.filter((f) => {
    const existing = input.answers[f.id]?.trim()
    if (existing) return false
    if (f.fromProfile === 'name' && input.knownName?.trim()) return false
    if (f.fromProfile === 'email' && input.knownEmail?.trim()) return false
    return true
  }).map((f) => ({ id: f.id, label: f.label }))
}

export function identifyMissingAuthorizations(state: EngagementConsentState, now = new Date()): EngagementConsentRecord[] {
  return state.records.filter((r) => {
    if (r.status === 'pending' || r.status === 'withdrawn') return true
    if (r.status === 'expired') return true
    if (r.expiresAt && new Date(r.expiresAt).getTime() < now.getTime()) return true
    return false
  })
}

export function signEngagementConsent(
  state: EngagementConsentState,
  kind: EngagementConsentKind,
  signerName: string,
  now = new Date(),
): EngagementConsentState {
  const doc = ENGAGEMENT_DOCUMENTS.find((d) => d.kind === kind)
  if (!doc) return state
  const expiresAt =
    doc.expiresAfterMonths != null
      ? new Date(now.getTime() + doc.expiresAfterMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
      : undefined
  const records = state.records.map((r) =>
    r.kind === kind
      ? {
          ...r,
          status: 'signed' as const,
          signedAt: now.toISOString(),
          signerName: signerName.trim(),
          expiresAt,
          withdrawnAt: undefined,
          withdrawalReason: undefined,
          version: doc.version,
          contentHash: hashText(doc.version + doc.body),
        }
      : r,
  )
  return {
    ...state,
    records,
    audit: [
      {
        id: `aud-sign-${kind}-${now.getTime()}`,
        at: now.toISOString(),
        kind,
        version: doc.version,
        action: 'signed',
        detail: `Signed by ${signerName.trim()} (version ${doc.version})`,
      },
      ...state.audit,
    ],
    updatedAt: now.toISOString(),
  }
}

export function withdrawEngagementConsent(
  state: EngagementConsentState,
  kind: EngagementConsentKind,
  reason: string,
  now = new Date(),
): EngagementConsentState {
  const rec = state.records.find((r) => r.kind === kind)
  if (!rec) return state
  return {
    ...state,
    records: state.records.map((r) =>
      r.kind === kind
        ? {
            ...r,
            status: 'withdrawn' as const,
            withdrawnAt: now.toISOString(),
            withdrawalReason: reason.trim() || 'Withdrawn by taxpayer',
          }
        : r,
    ),
    audit: [
      {
        id: `aud-withdraw-${kind}-${now.getTime()}`,
        at: now.toISOString(),
        kind,
        version: rec.version,
        action: 'withdrawn',
        detail: reason.trim() || 'Withdrawn by taxpayer',
      },
      ...state.audit,
    ],
    updatedAt: now.toISOString(),
  }
}

export function engagementConsentDownloadText(state: EngagementConsentState, clientName: string): string {
  const lines = [
    `NOVARA Tax OS — Signed engagement & consent package`,
    `Taxpayer: ${clientName}`,
    `Generated: ${new Date().toISOString()}`,
    '',
  ]
  for (const r of state.records) {
    const doc = ENGAGEMENT_DOCUMENTS.find((d) => d.kind === r.kind)
    lines.push(`--- ${doc?.title ?? r.kind} ---`)
    lines.push(`Version: ${r.version}`)
    lines.push(`Status: ${r.status}`)
    lines.push(`Content hash: ${r.contentHash}`)
    if (r.signedAt) lines.push(`Signed: ${r.signedAt} by ${r.signerName ?? ''}`)
    if (r.expiresAt) lines.push(`Expires: ${r.expiresAt}`)
    if (r.withdrawnAt) lines.push(`Withdrawn: ${r.withdrawnAt} — ${r.withdrawalReason ?? ''}`)
    lines.push(doc?.body ?? '')
    lines.push('')
  }
  lines.push('Audit trail:')
  for (const a of state.audit) {
    lines.push(`- ${a.at} | ${a.action} | ${a.kind} v${a.version} | ${a.detail}`)
  }
  return lines.join('\n')
}
