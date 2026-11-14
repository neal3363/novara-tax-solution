/**
 * Modular bank-product / refund-transfer architecture.
 *
 * Offices may configure their own approved provider OR use a platform-selected
 * provider — subject to provider agreements. Until liveConnectivity is true and
 * API credentials are verified, eligibility returns "provider_offline" and
 * NOVARA does not invent approvals or disbursements.
 */

import { PRICING } from '../data/fees'

export type BankProviderSelectionMode = 'office_choice' | 'platform_default' | 'either'

export type BankProductStatus =
  | 'provider_offline'
  | 'not_configured'
  | 'eligibility_unknown'
  | 'awaiting_consent'
  | 'submitted_to_provider'
  | 'approved'
  | 'declined'
  | 'funded'
  | 'settled'
  | 'exception'

export interface BankProviderConfig {
  id: string
  displayName: string
  selectionMode: BankProviderSelectionMode
  /** Office tenant that owns this config — null = platform default */
  officeTenantId: string | null
  products: BankProductOffer[]
  /** Never claim live unless explicitly verified */
  liveConnectivity: boolean
  disclosure: string
}

export interface BankProductOffer {
  code: string
  name: string
  kind: 'refund_transfer' | 'refund_advance' | 'fee_settlement'
  feeScheduleNote: string
  /** Fee amount if known — separate from NOVARA software fees */
  estimatedFee: number | null
  requiresTaxpayerConsent: boolean
  requiresEsign: boolean
}

export interface BankProductApplication {
  id: string
  providerId: string
  productCode: string
  status: BankProductStatus
  statusSource: 'novara' | 'provider' | 'irs'
  lastMessage: string
  updatedAt: string
  /** Never store full SSN / full account */
  taxpayerConsentAt?: string
}

export interface BankEligibilityResult {
  eligibleToApply: boolean
  status: BankProductStatus
  reasons: string[]
  liveConnectivity: boolean
}

const PLATFORM_DISCLOSURE =
  'Banking-product and refund-transfer fees are separate from NOVARA software fees, disclosed before authorization, and not activated until provider agreements and testing are complete.'

/** Built-in configs — offline until a verified partner is connected */
export function listBankProviderConfigs(officeTenantId?: string | null): BankProviderConfig[] {
  const platform: BankProviderConfig = {
    id: 'novara-platform-default',
    displayName: 'NOVARA platform banking partner (not connected)',
    selectionMode: 'platform_default',
    officeTenantId: null,
    liveConnectivity: false,
    disclosure: PRICING.banking.disclosure || PLATFORM_DISCLOSURE,
    products: [
      {
        code: 'rt_standard',
        name: 'Refund transfer',
        kind: 'refund_transfer',
        feeScheduleNote: 'Provider fee schedule TBD — disclosed before consent when live.',
        estimatedFee: null,
        requiresTaxpayerConsent: true,
        requiresEsign: true,
      },
      {
        code: 'ra_optional',
        name: 'Refund advance (optional lender product)',
        kind: 'refund_advance',
        feeScheduleNote: 'Approval and funding are never guaranteed. Terms disclosed by lender when live.',
        estimatedFee: null,
        requiresTaxpayerConsent: true,
        requiresEsign: true,
      },
    ],
  }

  const office: BankProviderConfig = {
    id: 'office-configured-partner',
    displayName: 'Office-selected banking partner (not connected)',
    selectionMode: 'office_choice',
    officeTenantId: officeTenantId ?? 'office-placeholder',
    liveConnectivity: false,
    disclosure: PLATFORM_DISCLOSURE,
    products: [
      {
        code: 'office_rt',
        name: 'Office refund transfer',
        kind: 'refund_transfer',
        feeScheduleNote: 'Configured per office agreement when a provider is verified.',
        estimatedFee: null,
        requiresTaxpayerConsent: true,
        requiresEsign: true,
      },
    ],
  }

  return [platform, office]
}

export function evaluateBankProductEligibility(
  provider: BankProviderConfig,
  productCode: string,
): BankEligibilityResult {
  if (!provider.liveConnectivity || !PRICING.banking.liveConnectivity) {
    return {
      eligibleToApply: false,
      status: 'provider_offline',
      liveConnectivity: false,
      reasons: [
        `${provider.displayName} is not live.`,
        'NOVARA will not simulate bank-product approval or disbursement.',
        'Connect and verify the provider API before offering this product to taxpayers.',
      ],
    }
  }
  const product = provider.products.find((p) => p.code === productCode)
  if (!product) {
    return {
      eligibleToApply: false,
      status: 'not_configured',
      liveConnectivity: true,
      reasons: ['Product code is not configured for this provider.'],
    }
  }
  return {
    eligibleToApply: true,
    status: 'eligibility_unknown',
    liveConnectivity: true,
    reasons: ['Provider is live — run the provider eligibility API before presenting terms.'],
  }
}

export function createOfflineBankApplication(
  providerId: string,
  productCode: string,
): BankProductApplication {
  return {
    id: `bp-${Date.now()}`,
    providerId,
    productCode,
    status: 'provider_offline',
    statusSource: 'novara',
    lastMessage: 'Provider offline — application was recorded as unavailable, not approved.',
    updatedAt: new Date().toISOString(),
  }
}
