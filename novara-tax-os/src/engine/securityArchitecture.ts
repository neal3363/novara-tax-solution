/**
 * Phase 2C — Security architecture design (isolated).
 * Not connected to production taxpayer records or role changes.
 * Documents required server-side controls; provides stub interfaces only.
 */

export type SecurityControlStatus = 'designed' | 'stub_module' | 'not_connected' | 'requires_approval'

export interface SecurityArchitectureComponent {
  id: string
  name: string
  status: SecurityControlStatus
  purpose: string
  interfaces: string[]
  dependencies: string[]
  notes: string
}

/** Designed server-side authorization model (not wired to store/RoleGate). */
export interface AuthzDecision {
  allowed: boolean
  reason: string
  principalId: string
  tenantId: string
  action: string
  resource: string
}

export interface MfaChallenge {
  challengeId: string
  method: 'totp' | 'webauthn' | 'sms_otp'
  expiresAt: string
}

export interface EncryptedBlobMeta {
  keyId: string
  algorithm: 'AES-256-GCM'
  ciphertextRef: string
  aad: string
}

export interface DurableAuditEvent {
  id: string
  at: string
  actorId: string
  tenantId: string
  action: string
  resource: string
  outcome: 'success' | 'denied' | 'error'
  /** Hash chain pointer for tamper evidence */
  prevHash: string
  hash: string
}

export const SECURITY_ARCHITECTURE: SecurityArchitectureComponent[] = [
  {
    id: 'server-authz',
    name: 'Server-side authorization',
    status: 'designed',
    purpose: 'Enforce RBAC + tenant isolation on every tax-data API call (not browser-only).',
    interfaces: ['authorize(principal, action, resource) → AuthzDecision'],
    dependencies: ['identity provider', 'tenant membership store'],
    notes: 'Existing accountPermissions.ts remains client demo until API gateway adopts this contract.',
  },
  {
    id: 'mfa',
    name: 'Multi-factor authentication',
    status: 'designed',
    purpose: 'Require MFA for TP / Office / Admin before accessing taxpayer data.',
    interfaces: ['startMfa(userId)', 'verifyMfa(challengeId, code)'],
    dependencies: ['IdP (OIDC) or TOTP/WebAuthn service'],
    notes: 'WISP lists MFA as planned. Do not change existing roles without further approval.',
  },
  {
    id: 'kms-storage',
    name: 'Encrypted document storage + KMS',
    status: 'designed',
    purpose: 'At-rest encryption for documents and secrets via envelope encryption.',
    interfaces: ['encryptObject(bytes, aad)', 'decryptObject(meta)', 'rotateKey(keyId)'],
    dependencies: ['cloud KMS', 'object store'],
    notes: 'Replaces fingerprint-only demo storage for production vault.',
  },
  {
    id: 'signed-doc-access',
    name: 'Signed document access tokens',
    status: 'stub_module',
    purpose: 'Short-lived HMAC/JWT document URLs instead of unsigned base64 tokens.',
    interfaces: ['issueSignedDocUrl(docId, ttl)', 'verifySignedDocUrl(token)'],
    dependencies: ['HMAC secret in KMS'],
    notes: 'tenantIsolation.issueDocumentAccessToken must not be used as production ACL.',
  },
  {
    id: 'durable-audit',
    name: 'Durable audit logging',
    status: 'designed',
    purpose: 'Append-only, hash-chained audit log retained outside tab memory.',
    interfaces: ['appendAudit(event)', 'verifyChain(fromId, toId)'],
    dependencies: ['append-only store / SIEM'],
    notes: 'Current auditEvents ring buffer is demo-only.',
  },
]

/** Stub: always denies — forces explicit server wiring before use. */
export function authorizeStub(input: {
  principalId: string
  tenantId: string
  action: string
  resource: string
}): AuthzDecision {
  return {
    allowed: false,
    reason: 'Server authorization not connected — stub denies all (safe default).',
    principalId: input.principalId,
    tenantId: input.tenantId,
    action: input.action,
    resource: input.resource,
  }
}

/** Stub MFA challenge factory — not connected to login. */
export function createMfaChallengeStub(userId: string, method: MfaChallenge['method'] = 'totp'): MfaChallenge {
  return {
    challengeId: `mfa-stub-${userId}-${Date.now()}`,
    method,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  }
}

/** Stub envelope metadata — no real ciphertext. */
export function encryptBlobStub(plaintextLength: number, aad: string): EncryptedBlobMeta {
  return {
    keyId: 'kms-key-stub-unconnected',
    algorithm: 'AES-256-GCM',
    ciphertextRef: `stub://object/${plaintextLength}`,
    aad,
  }
}

export function securityArchitectureSummary(): string {
  const lines = [
    'NOVARA Phase 2C security architecture (designed / stub — not connected to production data)',
    ...SECURITY_ARCHITECTURE.map(
      (c) => `- [${c.status}] ${c.name}: ${c.purpose}`,
    ),
  ]
  return lines.join('\n')
}
