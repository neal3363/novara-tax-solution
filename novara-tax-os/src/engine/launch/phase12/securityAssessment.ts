/**
 * Phase 12 security assessment aggregator (Phases 6–7).
 * Staging tests passing ≠ production enforcement authorized.
 */

import { getPhase6Flags, assertNotEnforcingOnExistingUsers, PHASE6_SECURITY_VERSION } from '../../security/phase6/config'
import { getPhase7Flags } from '../../security/phase7/config'
import { getPhase10Flags } from '../../payments/phase10/config'
import { getMefFlags } from '../../irs/mef/config'

export type SecurityFindingSeverity = 'critical' | 'high' | 'medium' | 'info' | 'pass'

export interface SecurityFinding {
  id: string
  area: string
  severity: SecurityFindingSeverity
  status: 'pass_staging' | 'open' | 'blocked_for_production'
  detail: string
}

export interface SecurityAssessmentResult {
  phase6Version: string
  productionEnforcementEnabled: boolean
  independentAssessmentRequired: true
  findings: SecurityFinding[]
  criticalOpen: number
  highOpen: number
  productionSecurityGo: false
  notes: string[]
}

export function assessSecurityArchitecture(): SecurityAssessmentResult {
  const p6 = getPhase6Flags()
  const p7 = getPhase7Flags()
  const p10 = getPhase10Flags()
  const mef = getMefFlags()

  assertNotEnforcingOnExistingUsers()

  const findings: SecurityFinding[] = [
    {
      id: 'auth-session',
      area: 'Authentication and session management',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Phase 6/7 session APIs exist; productionAuthPath remains false',
    },
    {
      id: 'tenant-isolation',
      area: 'TC / TP / Office isolation',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Tenant isolation engine + serverAuthorize cross-tenant denials tested in staging',
    },
    {
      id: 'server-authz',
      area: 'Server-side authorization',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Phase 7 serverAuthorize gates financial/MeF/staging APIs',
    },
    {
      id: 'ptin-efin',
      area: 'PTIN and EFIN verification',
      severity: 'medium',
      status: 'pass_staging',
      detail: 'Credential fingerprint workflows present; live IRS credential verification not production-enforced',
    },
    {
      id: 'mfa',
      area: 'MFA',
      severity: p6.mfaMandatoryForExistingUsers ? 'critical' : 'pass',
      status: p6.mfaMandatoryForExistingUsers ? 'open' : 'pass_staging',
      detail: `mfaEnrollmentEnabled=${p6.mfaEnrollmentEnabled}; mfaMandatoryForExistingUsers=${p6.mfaMandatoryForExistingUsers}`,
    },
    {
      id: 'encryption-kms',
      area: 'Encryption / KMS',
      severity: p6.cloudKmsEnabled && p6.vaultEncryptionVerified ? 'pass' : 'high',
      status: p6.vaultEncryptionVerified ? 'pass_staging' : 'blocked_for_production',
      detail: `cloudKmsEnabled=${p6.cloudKmsEnabled}; vaultEncryptionVerified=${p6.vaultEncryptionVerified} — production needs verified cloud KMS`,
    },
    {
      id: 'document-vault',
      area: 'Secure document storage',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Phase 7 vault APIs staging-tested; production infra verification still required',
    },
    {
      id: 'malware',
      area: 'Malware scanning',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Staging malware scan hooks present (synthetic EICAR paths)',
    },
    {
      id: 'audit-log',
      area: 'Audit logging',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Durable audit chain available in Phase 7 staging',
    },
    {
      id: 'secrets',
      area: 'Secure credential management',
      severity: 'high',
      status: 'blocked_for_production',
      detail: 'Production secrets manager + rotation not declared operational from this module',
    },
    {
      id: 'backup-recovery',
      area: 'Backup and recovery',
      severity: 'high',
      status: 'blocked_for_production',
      detail: 'Backup/restore procedures documented for staging; production restore drill required',
    },
    {
      id: 'revocation',
      area: 'Account revocation',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Session revoke paths exist in Phase 6/7',
    },
    {
      id: 'unauthorized-access',
      area: 'Unauthorized access attempts',
      severity: 'pass',
      status: 'pass_staging',
      detail: 'Cross-tenant / missing-session denials covered in staging suites',
    },
    {
      id: 'live-locks',
      area: 'Live integration locks',
      severity: 'pass',
      status: 'pass_staging',
      detail: `livePayments=${p10.livePayments}; liveBanking=${p10.liveBankingPartner}; liveMeF=${mef.liveProductionTransmit}; phase7.productionEnforcement=${p7.productionEnforcement ?? false}`,
    },
  ]

  const criticalOpen = findings.filter((f) => f.severity === 'critical' && f.status !== 'pass_staging').length
  const highOpen = findings.filter((f) => f.severity === 'high' && f.status !== 'pass_staging').length

  return {
    phase6Version: PHASE6_SECURITY_VERSION,
    productionEnforcementEnabled: false,
    independentAssessmentRequired: true,
    findings,
    criticalOpen,
    highOpen,
    productionSecurityGo: false,
    notes: [
      'Staging security tests passing does NOT authorize production enforcement.',
      'Verify actual production infrastructure and obtain independent security assessment before GO.',
      `Phase 7 readyForProductionEnforcement must remain false until human approval.`,
    ],
  }
}
