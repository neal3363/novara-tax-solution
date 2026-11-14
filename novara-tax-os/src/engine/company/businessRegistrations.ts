/**
 * Business, commercial, and third-party registrations the owner must complete
 * for NOVARA as an independent nationally available tax software company.
 */

export type RegistrationOwner = 'owner' | 'counsel' | 'developer_prep_only'

export interface RegistrationItem {
  id: string
  category:
    | 'entity'
    | 'tax'
    | 'irs'
    | 'state'
    | 'payments'
    | 'banking'
    | 'infrastructure'
    | 'mobile'
    | 'marketing'
    | 'legal'
    | 'insurance'
    | 'security'
  title: string
  ownerAction: string
  estimatedCostBandUsd: string
  blocksLiveLaunch: boolean
  registrationOwner: RegistrationOwner
}

export function businessRegistrationChecklist(): RegistrationItem[] {
  return [
    {
      id: 'biz-entity',
      category: 'entity',
      title: 'Legal entity in good standing (LLC/Corp) + EIN',
      ownerAction: 'Maintain formation docs; EINs match IRS e-file Application',
      estimatedCostBandUsd: '500–5,000 setup (varies by counsel/state)',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'biz-boe',
      category: 'entity',
      title: 'Beneficial ownership / KYC for banks and Stripe',
      ownerAction: 'Complete underwriting questionnaires for Stripe + refund bank',
      estimatedCostBandUsd: '0–1,000 admin',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'biz-trademark',
      category: 'legal',
      title: 'Trademark / brand protection for NOVARA Tax OS',
      ownerAction: 'Counsel file trademark; clear conflicting marks',
      estimatedCostBandUsd: '1,000–5,000+',
      blocksLiveLaunch: false,
      registrationOwner: 'counsel',
    },
    {
      id: 'biz-insurance',
      category: 'insurance',
      title: 'Cyber liability + E&O / professional liability',
      ownerAction: 'Bind policies before processing real taxpayer PII at scale',
      estimatedCostBandUsd: '3,000–25,000+/yr',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'irs-efile-app',
      category: 'irs',
      title: 'IRS e-file Application — Software Developer + Transmitter',
      ownerAction: 'Complete suitability; obtain EFIN/ETINs/Software IDs',
      estimatedCostBandUsd: 'IRS schedule + fingerprint fees',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'state-efile',
      category: 'state',
      title: 'Per-state software / e-file provider approvals',
      ownerAction: 'Apply to each state where live e-file is offered',
      estimatedCostBandUsd: '0–several thousand per state (varies)',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'stripe-live',
      category: 'payments',
      title: 'Stripe live merchant + Price IDs = fees.ts',
      ownerAction: 'Verify business; create prices; keep live charges OFF until auth',
      estimatedCostBandUsd: 'Stripe % + fixed per charge',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'bank-partner',
      category: 'banking',
      title: 'Refund-transfer banking partner agreement',
      ownerAction: 'Select partner; sign; sandbox settle; secrets bind',
      estimatedCostBandUsd: 'TBD partner underwriting',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'cloudflare',
      category: 'infrastructure',
      title: 'Cloudflare account + official domain DNS',
      ownerAction: 'Purchase domain; configure zone; authorize deploy',
      estimatedCostBandUsd: '20–500+/mo + domain',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'email-esp',
      category: 'infrastructure',
      title: 'Business email + transactional ESP',
      ownerAction: 'Google Workspace/M365 + ESP domain verify',
      estimatedCostBandUsd: '15–200+/mo',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'apple-dev',
      category: 'mobile',
      title: 'Apple Developer Program',
      ownerAction: 'Enroll; App Store Connect for future iOS app',
      estimatedCostBandUsd: '99/yr',
      blocksLiveLaunch: false,
      registrationOwner: 'owner',
    },
    {
      id: 'google-play',
      category: 'mobile',
      title: 'Google Play Console',
      ownerAction: 'Enroll; listing for future Android app',
      estimatedCostBandUsd: '25 one-time',
      blocksLiveLaunch: false,
      registrationOwner: 'owner',
    },
    {
      id: 'gsc-ga',
      category: 'marketing',
      title: 'Google Search Console + GA4',
      ownerAction: 'Verify owned domain after DNS cutover',
      estimatedCostBandUsd: '0',
      blocksLiveLaunch: false,
      registrationOwner: 'owner',
    },
    {
      id: 'privacy-tos',
      category: 'legal',
      title: 'Counsel-approved Privacy Policy & Terms of Service',
      ownerAction: 'Engage counsel; publish only after approval',
      estimatedCostBandUsd: '2,000–25,000+',
      blocksLiveLaunch: true,
      registrationOwner: 'counsel',
    },
    {
      id: 'appsec',
      category: 'security',
      title: 'Independent application security assessment',
      ownerAction: 'Engage firm; remediate critical/high before live PII',
      estimatedCostBandUsd: '5,000–40,000+',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'pci',
      category: 'security',
      title: 'PCI obligations for hosted-checkout model',
      ownerAction: 'Complete SAQ/AoC matching Stripe-hosted model',
      estimatedCostBandUsd: '0–5,000+ depending on SAQ',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
    {
      id: 'support-desk',
      category: 'infrastructure',
      title: 'Production helpdesk / ticket system',
      ownerAction: 'Select vendor; staff coverage for filing season',
      estimatedCostBandUsd: '50–500+/mo + labor',
      blocksLiveLaunch: true,
      registrationOwner: 'owner',
    },
  ]
}

export function thirdPartyAgreementsRequired(): {
  id: string
  counterparty: string
  purpose: string
  stripeIsNotSubstitute: boolean
}[] {
  return [
    {
      id: 'agr-stripe',
      counterparty: 'Stripe',
      purpose: 'NOVARA software billing only (subscriptions / per-return fees)',
      stripeIsNotSubstitute: true,
    },
    {
      id: 'agr-refund-bank',
      counterparty: 'Approved refund-transfer banking partner',
      purpose: 'IRS refund settlement, fee withhold, client disbursement',
      stripeIsNotSubstitute: true,
    },
    {
      id: 'agr-esp',
      counterparty: 'Email service provider',
      purpose: 'Transactional notices (deposit confirmed, filing status)',
      stripeIsNotSubstitute: false,
    },
    {
      id: 'agr-appsec',
      counterparty: 'Independent security firm',
      purpose: 'Penetration test / AppSec assessment',
      stripeIsNotSubstitute: false,
    },
    {
      id: 'agr-cloud',
      counterparty: 'Cloudflare (and/or complementary cloud)',
      purpose: 'Workers, DNS, WAF, D1/R2 production hosting',
      stripeIsNotSubstitute: false,
    },
  ]
}
