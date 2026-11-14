/**
 * Stripe software-billing Price ID mapping to approved fees.ts amounts.
 *
 * Live charges stay disabled until owner sets NOVARA_STRIPE_LIVE_ENABLED=false
 * (default) and binds real Price IDs via environment / Cursor app secrets.
 *
 * Stripe is NEVER a substitute for an authorized IRS refund-settlement bank.
 */

import { PRICING, type OfficePlanId } from '../../../data/fees'

export type StripeBillingChannel = 'software_subscription' | 'refund_settlement_forbidden'

export interface StripePriceSlot {
  productKey: string
  channel: StripeBillingChannel
  planId: string
  amountUsd: number
  /** Env var name that must hold the live Stripe Price ID when owner authorizes */
  priceIdEnvVar: string
  /** Env var for matching Product ID (optional metadata) */
  productIdEnvVar: string
  liveEnabledEnvVar: 'NOVARA_STRIPE_LIVE_ENABLED'
}

function slot(
  productKey: string,
  planId: string,
  amountUsd: number,
): StripePriceSlot {
  const envKey = productKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return {
    productKey,
    channel: 'software_subscription',
    planId,
    amountUsd,
    priceIdEnvVar: `STRIPE_PRICE_${envKey}`,
    productIdEnvVar: `STRIPE_PRODUCT_${envKey}`,
    liveEnabledEnvVar: 'NOVARA_STRIPE_LIVE_ENABLED',
  }
}

/** Maps approved fees.ts amounts to Stripe Price ID env slots — amounts must not change. */
export function approvedSoftwareStripePriceCatalog(): StripePriceSlot[] {
  return [
    slot('tc_personal', 'tc-personal', PRICING.TC.personalReturn),
    slot('tc_business', 'tc-business', PRICING.TC.businessReturn),
    slot('tp_personal', 'tp-personal', PRICING.TP.personalReturn),
    slot('tp_self_employed', 'tp-self-employed', PRICING.TP.selfEmployedReturn),
    slot('tp_business_entity', 'tp-business-entity', PRICING.TP.businessEntityReturn),
    slot(
      'office_personal',
      PRICING.Office.plans.personal.id as OfficePlanId,
      PRICING.Office.plans.personal.annual,
    ),
    slot(
      'office_self_employed',
      PRICING.Office.plans.selfEmployed.id as OfficePlanId,
      PRICING.Office.plans.selfEmployed.annual,
    ),
    slot(
      'office_business',
      PRICING.Office.plans.business.id as OfficePlanId,
      PRICING.Office.plans.business.annual,
    ),
  ]
}

export function isStripeLiveEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NOVARA_STRIPE_LIVE_ENABLED === 'true'
}

export function resolveStripePriceId(
  slot: StripePriceSlot,
  env: Record<string, string | undefined> = process.env,
): { ok: true; priceId: string } | { ok: false; error: string } {
  if (!isStripeLiveEnabled(env)) {
    return { ok: false, error: 'stripe_live_disabled_pending_owner_authorization' }
  }
  const priceId = env[slot.priceIdEnvVar]?.trim()
  if (!priceId) {
    return { ok: false, error: `missing_${slot.priceIdEnvVar}` }
  }
  if (!priceId.startsWith('price_')) {
    return { ok: false, error: 'invalid_stripe_price_id_format' }
  }
  return { ok: true, priceId }
}

export const REFUND_SETTLEMENT_STRIPE_BAN =
  'Do not use Stripe Connect/charges for IRS refund settlement. Use an approved refund-transfer banking partner only.'
