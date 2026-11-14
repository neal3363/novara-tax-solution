/**
 * Sensitive data protection checks for SSNs, tax docs, banking, sessions.
 * Complements existing phase6 vault / speak-fill last4 rules.
 */

export type SensitiveClass =
  | 'ssn_full'
  | 'ssn_last4'
  | 'tax_document'
  | 'bank_account'
  | 'refund_settlement'
  | 'etin_secret'
  | 'session_token'

export interface SensitiveDataRule {
  klass: SensitiveClass
  allowedInBrowserLocalStorage: boolean
  allowedInClientLogs: boolean
  storageRequirement: string
  testHint: string
}

export function sensitiveDataProtectionRules(): SensitiveDataRule[] {
  return [
    {
      klass: 'ssn_full',
      allowedInBrowserLocalStorage: false,
      allowedInClientLogs: false,
      storageRequirement: 'Server-side encrypted vault only when legally required; prefer last4',
      testHint: 'speak-fill reduces to ssn_last4; never persist full SSN in sessionStorage',
    },
    {
      klass: 'ssn_last4',
      allowedInBrowserLocalStorage: false,
      allowedInClientLogs: false,
      storageRequirement: 'Session-scoped app state with tenant isolation; minimize retention',
      testHint: 'tenant isolation + role gates',
    },
    {
      klass: 'tax_document',
      allowedInBrowserLocalStorage: false,
      allowedInClientLogs: false,
      storageRequirement: 'Encrypted object storage (R2) — not browser-local as system of record',
      testHint: 'document vault path authz; no public URL guessing',
    },
    {
      klass: 'bank_account',
      allowedInBrowserLocalStorage: false,
      allowedInClientLogs: false,
      storageRequirement: 'Masked display; full numbers only via authorized partner APIs',
      testHint: 'refund settlement masks; Stripe not used for IRS refund rail',
    },
    {
      klass: 'refund_settlement',
      allowedInBrowserLocalStorage: false,
      allowedInClientLogs: false,
      storageRequirement: 'Partner webhook HMAC + durable ledger; live OFF until agreement',
      testHint: 'refundBankPartner signature verification',
    },
    {
      klass: 'etin_secret',
      allowedInBrowserLocalStorage: false,
      allowedInClientLogs: false,
      storageRequirement: 'Cloud secrets / KMS only — never git',
      testHint: 'efinGate forbids raw secrets in payload',
    },
    {
      klass: 'session_token',
      allowedInBrowserLocalStorage: false,
      allowedInClientLogs: false,
      storageRequirement: 'HttpOnly secure cookies / server session when production IdP live',
      testHint: 'sessionHardening + publish-security session rules',
    },
  ]
}

export function assertNoSensitiveInBrowserLocalAsSystemOfRecord(): {
  ok: boolean
  violations: string[]
} {
  const violations = sensitiveDataProtectionRules()
    .filter((r) => r.allowedInBrowserLocalStorage)
    .map((r) => r.klass)
  // All rules currently forbid browser-local as SoR — any true is a logic bug
  return { ok: violations.length === 0, violations }
}
