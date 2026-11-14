/**
 * Phase 2C — Security architecture design (isolated).
 * Not connected to production taxpayer records or role changes.
 * Documents required server-side controls; provides stub interfaces only.
 */

export type SecurityControlStatus =
  | 'designed'
  | 'stub_module'
  | 'staging_connected'
  | 'not_connected'
  | 'requires_approval'

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
    status: 'staging_connected',
    purpose: 'Enforce RBAC + tenant isolation on every tax-data API call (not browser-only).',
    interfaces: ['authorize()', 'staging-security-api/security/authorize.ts', 'phase7/protectedOps'],
    dependencies: ['phase6 sessions', 'phase7 staging API'],
    notes:
      'Phase 7 staging APIs require server authorize for protected ops. Not wired to UI RoleGate. productionAuthPath OFF.',
  },
  {
    id: 'mfa',
    name: 'Multi-factor authentication',
    status: 'staging_connected',
    purpose: 'Require MFA for TP / Office / Admin before accessing taxpayer data.',
    interfaces: ['staging-security-api/security/mfa.ts', 'phase7/mfaWorkflows', 'adminResetMfa'],
    dependencies: ['TOTP RFC 6238', 'optional WebAuthn stub'],
    notes:
      'Phase 7 staging MFA enroll/verify/recovery/admin reset. mfaMandatoryForExistingUsers remains false (STOP).',
  },
  {
    id: 'kms-storage',
    name: 'Encrypted document storage + KMS',
    status: 'staging_connected',
    purpose: 'At-rest encryption for documents and secrets via envelope encryption.',
    interfaces: ['stagingCloudKmsProvider', 'staging-security-api/security/vault.ts', 'durable vault store'],
    dependencies: ['staging-cloud-kms-adapter', 'phase6 vault'],
    notes:
      'Phase 7 staging KMS + durable encrypted blobs. Production cloud account NOT claimed operational.',
  },
  {
    id: 'signed-doc-access',
    name: 'Signed document access tokens',
    status: 'staging_connected',
    purpose: 'Short-lived HMAC/JWT document URLs instead of unsigned base64 tokens.',
    interfaces: ['issueSignedDownloadToken', 'staging-security-api/security/vault.ts'],
    dependencies: ['HMAC secret (runtime)', 'phase6/7 vault'],
    notes: 'Staging vault API issues short-lived signed tokens; auth required on every op.',
  },
  {
    id: 'durable-audit',
    name: 'Durable audit logging',
    status: 'staging_connected',
    purpose: 'Append-only, hash-chained audit log retained outside tab memory.',
    interfaces: ['durableAppendAudit', 'staging-security-api/security/audit.ts'],
    dependencies: ['phase7 durable JSONL store', 'phase6 hash chain'],
    notes: 'Staging durable append-only audit with tamper verify. No SSNs/full documents. Not production SIEM.',
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
