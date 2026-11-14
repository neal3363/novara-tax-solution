/**
 * IRS Publication 4557 + FTC Safeguards Rule control mapping for NOVARA.
 * Internal readiness only — does not replace independent AppSec assessment.
 *
 * References:
 * - Pub 4557: https://www.irs.gov/pub/irs-pdf/p4557.pdf
 * - FTC Safeguards Rule: https://www.ftc.gov/legal-library/browse/rules/safeguards-rule
 */

export type ControlStatus = 'implemented_staging' | 'scaffolded' | 'owner_required' | 'external_required'

export interface SafeguardControl {
  id: string
  source: 'pub4557' | 'ftc_safeguards' | 'both'
  title: string
  status: ControlStatus
  evidenceHint: string
}

export function pub4557AndFtcSafeguardControls(): SafeguardControl[] {
  return [
    {
      id: 'sg-inventory',
      source: 'both',
      title: 'Inventory of systems storing taxpayer / customer information',
      status: 'scaffolded',
      evidenceHint: 'ENV inventory + Cloudflare/D1/R2 templates; production inventory after deploy',
    },
    {
      id: 'sg-access-control',
      source: 'both',
      title: 'Access control / least privilege (TC, TP, Office, Admin)',
      status: 'implemented_staging',
      evidenceHint: 'phase6/7 authorize + tenant isolation tests',
    },
    {
      id: 'sg-encryption-rest',
      source: 'both',
      title: 'Encryption at rest for documents and sensitive fields',
      status: 'scaffolded',
      evidenceHint: 'phase6 vault/kms stubs; production KMS custody EXT-HOST-KEYS',
    },
    {
      id: 'sg-encryption-transit',
      source: 'both',
      title: 'Encryption in transit (TLS)',
      status: 'scaffolded',
      evidenceHint: 'HTTPS on hosted demo; production Cloudflare SSL after DNS',
    },
    {
      id: 'sg-auth-session',
      source: 'both',
      title: 'Authentication and session security',
      status: 'implemented_staging',
      evidenceHint: 'sessionHardening + api/session; production IdP still owner-gated',
    },
    {
      id: 'sg-ssn-minimization',
      source: 'pub4557',
      title: 'SSN minimization (last4 / masked; no full SSN in client persistence paths)',
      status: 'implemented_staging',
      evidenceHint: 'naturalLanguageFacts + speak-fill tests; vault encryption for docs',
    },
    {
      id: 'sg-malware',
      source: 'pub4557',
      title: 'Malware scanning of uploaded documents',
      status: 'implemented_staging',
      evidenceHint: 'phase6/7 malware scan stubs',
    },
    {
      id: 'sg-audit-log',
      source: 'both',
      title: 'Audit logging of access to sensitive data and transmissions',
      status: 'implemented_staging',
      evidenceHint: 'MeF secure logs + phase6 auditLog; durable production store pending',
    },
    {
      id: 'sg-incident',
      source: 'both',
      title: 'Incident response plan',
      status: 'scaffolded',
      evidenceHint: 'BUSINESS_CONTINUITY.md; owner must approve IR contacts',
    },
    {
      id: 'sg-vendor',
      source: 'ftc_safeguards',
      title: 'Service provider oversight (Stripe, bank, cloud, ESP)',
      status: 'owner_required',
      evidenceHint: 'Contracts + DPAs with Stripe, refund bank, Cloudflare, ESP',
    },
    {
      id: 'sg-risk-assessment',
      source: 'ftc_safeguards',
      title: 'Written risk assessment',
      status: 'owner_required',
      evidenceHint: 'Owner/counsel + AppSec firm input',
    },
    {
      id: 'sg-independent-test',
      source: 'both',
      title: 'Independent security testing / penetration test',
      status: 'external_required',
      evidenceHint: 'EXT-APPSEC — automated internal scans do not satisfy',
    },
    {
      id: 'sg-employee',
      source: 'both',
      title: 'Employee training / background for those with taxpayer data access',
      status: 'owner_required',
      evidenceHint: 'Owner HR / compliance program',
    },
    {
      id: 'sg-disposal',
      source: 'pub4557',
      title: 'Secure disposal / retention of taxpayer data',
      status: 'scaffolded',
      evidenceHint: 'R2 lifecycle templates; retention policy needs counsel',
    },
  ]
}

export function controlsBlockingIndependentAssessmentClaim(): SafeguardControl[] {
  return pub4557AndFtcSafeguardControls().filter(
    (c) => c.status === 'external_required' || c.id === 'sg-independent-test',
  )
}

export const INDEPENDENT_TEST_DISCLAIMER =
  'Internal automated scans and staging security suites do NOT substitute for an independent penetration test by a qualified external assessor.'
