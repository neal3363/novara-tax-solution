/**
 * Written Information Security Plan (WISP) — living control inventory for the SPA demo.
 * Does NOT claim IRS certification. Maps Pub 1345 / 4557 / 3112 themes to implemented vs required controls.
 */

export interface SecurityControl {
  id: string
  area: string
  requirement: string
  status: 'implemented' | 'partial' | 'planned' | 'external'
  evidence: string
}

export const WISP_CONTROLS: SecurityControl[] = [
  {
    id: 'auth-mfa',
    area: 'Authentication',
    requirement: 'MFA for professional/admin accounts',
    status: 'planned',
    evidence: 'Demo login is role-pick only; production needs IdP MFA.',
  },
  {
    id: 'auth-password',
    area: 'Authentication',
    requirement: 'Secure password policies + session expiration',
    status: 'partial',
    evidence: 'Session is tab-scoped (sessionStorage). Password auth not in this SPA demo.',
  },
  {
    id: 'rbac',
    area: 'Authorization',
    requirement: 'Role-based access TC / TP / Office',
    status: 'implemented',
    evidence: 'accountPermissions + RoleGate + tenantIsolation filters.',
  },
  {
    id: 'cred-ptin-efin',
    area: 'Credentials',
    requirement: 'Protect PTIN/EFIN; never store recoverable secrets',
    status: 'implemented',
    evidence: 'credentials.ts fingerprint + last-four only; decrypt API returns null.',
  },
  {
    id: 'tin-mask',
    area: 'Data protection',
    requirement: 'Mask SSNs/TINs in UI',
    status: 'implemented',
    evidence: 'documentIntakeEngine TIN fingerprints; UI shows masked identifiers.',
  },
  {
    id: 'tenant-isolation',
    area: 'Tenant isolation',
    requirement: 'Isolate TP/Office client/docs/returns/AI',
    status: 'implemented',
    evidence: 'tenantIsolation asserts on queries; UI scoped snapshot.',
  },
  {
    id: 'doc-links',
    area: 'Documents',
    requirement: 'Short-lived authorized document access links',
    status: 'partial',
    evidence: 'issueDocumentAccessToken helper; R2/private storage not wired in SPA.',
  },
  {
    id: 'upload-invite',
    area: 'Documents',
    requirement: 'Expiring upload invites without SSN in SMS',
    status: 'implemented',
    evidence: 'secureUploadInvite + Request Documents UI (sandbox messaging).',
  },
  {
    id: 'qa-gate',
    area: 'Quality / filing',
    requirement: 'Block filing on critical QA findings',
    status: 'implemented',
    evidence: 'qaEngine + transmit/signAndFile gates.',
  },
  {
    id: 'calc-engine',
    area: 'Tax accuracy',
    requirement: 'Deterministic calc + audit trail; LLM cannot invent tax',
    status: 'partial',
    evidence: 'benefitOptimizer + calcAuditTrail; full IRS tables/e-file still external.',
  },
  {
    id: 'logging',
    area: 'Monitoring',
    requirement: 'Security logging and access reviews',
    status: 'partial',
    evidence: 'auditEvents + logSensitiveAccess; SIEM/vendor oversight external.',
  },
  {
    id: 'irs-claim',
    area: 'Compliance claims',
    requirement: 'Do not claim IRS certification until requirements met',
    status: 'implemented',
    evidence: 'UI labels sandbox; WISP states no certification claim.',
  },
]

export function wispSummary() {
  const by = (s: SecurityControl['status']) => WISP_CONTROLS.filter((c) => c.status === s).length
  return {
    implemented: by('implemented'),
    partial: by('partial'),
    planned: by('planned'),
    external: by('external'),
    claimsIrsCertification: false as const,
    publicationsReferenced: ['Pub 1345', 'Pub 4557', 'Pub 3112'] as const,
  }
}
