/**
 * NOVARA Tax OS — Independent Tax Software Company Charter
 *
 * NOVARA develops, owns, controls, licenses, and operates proprietary tax software.
 * It is NOT a franchise, white-label reseller, or dependent frontend for another
 * commercial tax software provider (e.g. Drake, Lacerte, TaxAct OEM, etc.).
 *
 * Production locks remain OFF until IRS / banking / AppSec / owner authorization.
 */

export const COMPANY_CHARTER_VERSION = 'novara-independent-company-2025.1'

export type OperatingModel =
  | 'independent_software_company'
  | 'white_label_reseller'
  | 'franchise'
  | 'dependent_frontend'

/** Hard invariant — product must remain an independent software company. */
export const REQUIRED_OPERATING_MODEL: OperatingModel = 'independent_software_company'

export const FORBIDDEN_OPERATING_MODELS: OperatingModel[] = [
  'white_label_reseller',
  'franchise',
  'dependent_frontend',
]

export type CompanyPillarId =
  | 'proprietary_ai_prep'
  | 'federal_state_calc_engines'
  | 'forms_schedules_validation'
  | 'direct_irs_mef'
  | 'irs_software_developer_transmitter'
  | 'tc_tp_office_products'
  | 'subscription_licensing_fees'
  | 'refund_banking_partners'
  | 'secure_cloud_infra'
  | 'branded_web_ios_android'
  | 'support_admin_maintenance'
  | 'nationwide_distribution_updates'

export type PillarStatus =
  | 'implemented'
  | 'staging'
  | 'scaffolded'
  | 'simulated'
  | 'blocked_external'
  | 'missing'

export interface CompanyPillar {
  id: CompanyPillarId
  title: string
  status: PillarStatus
  ownsIp: boolean
  detail: string
  blockedBy?: string[]
}

export function companyIndependenceStatement(): string {
  return [
    'NOVARA Tax OS operates as a fully independent tax software company.',
    'We develop, own, control, license, and operate proprietary tax preparation software,',
    'calculation engines, MeF transmission (subject to IRS authorization),',
    'TC/TP/Office commercial products, and branded distribution channels.',
    'We are not a franchise, white-label reseller, or dependent frontend for another tax software provider.',
  ].join(' ')
}

export function assertIndependentOperatingModel(model: OperatingModel): void {
  if (model !== REQUIRED_OPERATING_MODEL) {
    throw new Error(
      `NOVARA STOP: operating model must be ${REQUIRED_OPERATING_MODEL}, got ${model}`,
    )
  }
  if (FORBIDDEN_OPERATING_MODELS.includes(model)) {
    throw new Error(`NOVARA STOP: forbidden operating model ${model}`)
  }
}

/** Twelve company pillars from the independent-software-company mandate. */
export function independentCompanyPillars(): CompanyPillar[] {
  return [
    {
      id: 'proprietary_ai_prep',
      title: 'Proprietary AI-powered tax preparation software',
      status: 'staging',
      ownsIp: true,
      detail:
        'Interview, speak-fill, document intake, benefit discovery — NOVARA-owned; production PII plane gated',
    },
    {
      id: 'federal_state_calc_engines',
      title: 'Federal and supported state calculation engines',
      status: 'staging',
      ownsIp: true,
      detail:
        'Isolated IRS federal engine + Phase 11 state models (TX/FL/CA/NY/IL); taxpayer cutover OFF',
      blockedBy: ['activateIrsCalcEngine', 'nationwideStateFiling'],
    },
    {
      id: 'forms_schedules_validation',
      title: 'IRS-compliant forms, schedules, and validation',
      status: 'staging',
      ownsIp: true,
      detail: 'Form/schedule stubs + MeF XML compose/validate; full season XSD packs pending IRS',
      blockedBy: ['official_irs_schema_packs'],
    },
    {
      id: 'direct_irs_mef',
      title: 'Direct IRS MeF electronic filing',
      status: 'simulated',
      ownsIp: true,
      detail: 'Phase 8 MeF pipeline with mock transmitter; liveProductionTransmit=false',
      blockedBy: ['EXT-IRS-ATS', 'EXT-IRS-EFIN-ETIN', 'liveProductionTransmit'],
    },
    {
      id: 'irs_software_developer_transmitter',
      title: 'IRS Software Developer and Transmitter roles',
      status: 'scaffolded',
      ownsIp: true,
      detail: 'Pathway + gates documented; credentials not yet obtained by owner',
      blockedBy: ['EXT-IRS-PROVIDER', 'EXT-IRS-EFIN-ETIN'],
    },
    {
      id: 'tc_tp_office_products',
      title: 'Software for individuals, preparers, and tax offices',
      status: 'implemented',
      ownsIp: true,
      detail: 'TC / TP / Office product surfaces with RBAC — commercial license targets',
    },
    {
      id: 'subscription_licensing_fees',
      title: 'Subscription plans, licensing, and per-return fees',
      status: 'implemented',
      ownsIp: true,
      detail: 'Approved fees.ts SSOT; Stripe live Price IDs / charges blocked pending owner',
      blockedBy: ['EXT-STRIPE-PRICES', 'livePayments'],
    },
    {
      id: 'refund_banking_partners',
      title: 'Authorized refund-transfer banking partners',
      status: 'scaffolded',
      ownsIp: true,
      detail: 'Sandbox settlement pipeline; Stripe forbidden as refund rail',
      blockedBy: ['EXT-BANK-PARTNER'],
    },
    {
      id: 'secure_cloud_infra',
      title: 'Secure cloud infrastructure, databases, APIs, documents',
      status: 'scaffolded',
      ownsIp: true,
      detail: 'Cloudflare Workers/D1/R2 templates; not deployed; browser-local not system of record',
      blockedBy: ['EXT-HOST-KEYS', 'EXT-CF-DNS'],
    },
    {
      id: 'branded_web_ios_android',
      title: 'Branded website, iOS, and Android applications',
      status: 'staging',
      ownsIp: true,
      detail: 'Responsive web + public demo; native store apps not yet built',
      blockedBy: ['EXT-IOS', 'EXT-ANDROID', 'EXT-CF-DNS'],
    },
    {
      id: 'support_admin_maintenance',
      title: 'Customer service, support, admin, and maintenance',
      status: 'scaffolded',
      ownsIp: true,
      detail: 'Draft Help page + support ops scaffold; staffed helpdesk blocked',
      blockedBy: ['EXT-SUPPORT', 'EXT-EMAIL'],
    },
    {
      id: 'nationwide_distribution_updates',
      title: 'Nationwide distribution, tax-year updates, expansion',
      status: 'scaffolded',
      ownsIp: true,
      detail: 'Commercial distribution model documented; nationwide state e-file OFF',
      blockedBy: ['EXT-STATE-EFILE', 'nationwideStateFiling', 'EXT-HUMAN-LAUNCH'],
    },
  ]
}

export function pillarsBlockingLiveCompanyLaunch(): CompanyPillar[] {
  return independentCompanyPillars().filter(
    (p) =>
      p.status === 'blocked_external' ||
      p.status === 'missing' ||
      p.status === 'simulated' ||
      p.status === 'scaffolded' ||
      (p.blockedBy && p.blockedBy.length > 0 && p.status !== 'implemented'),
  )
}

export function assertNotResellerOrWhiteLabel(claims: {
  whiteLabelOfThirdParty?: boolean
  franchiseModel?: boolean
  dependsOnThirdPartyCalcEngine?: boolean
  dependsOnThirdPartyTransmitterPlatform?: boolean
}): { ok: true } | { ok: false; violations: string[] } {
  const violations: string[] = []
  if (claims.whiteLabelOfThirdParty) violations.push('white_label_of_third_party_forbidden')
  if (claims.franchiseModel) violations.push('franchise_model_forbidden')
  if (claims.dependsOnThirdPartyCalcEngine) {
    violations.push('third_party_calc_engine_dependency_forbidden')
  }
  if (claims.dependsOnThirdPartyTransmitterPlatform) {
    violations.push('third_party_transmitter_platform_dependency_forbidden')
  }
  return violations.length ? { ok: false, violations } : { ok: true }
}
