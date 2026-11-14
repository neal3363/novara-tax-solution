/**
 * Commercial software licensing model for NOVARA as an independent vendor.
 * Tax offices and preparers purchase/license NOVARA software — not a franchise.
 * Amounts must match src/data/fees.ts (approved pricing — do not change here).
 */

import { PRICING, type OfficePlanId, type ReturnKind } from '../../data/fees'

export type LicenseAudience = 'TC' | 'TP' | 'Office'

export type EntitlementKind =
  | 'per_return_software_fee'
  | 'annual_office_subscription'
  | 'covered_returns_included'

export interface CommercialSku {
  skuId: string
  audience: LicenseAudience
  entitlement: EntitlementKind
  label: string
  amountUsd: number
  returnKind?: ReturnKind
  officePlanId?: OfficePlanId
  /** Offices/TPs license NOVARA to prepare client returns */
  licensesSoftwareToProfessionals: boolean
}

/** Catalog of what NOVARA sells as its own software company. */
export function commercialSoftwareSkuCatalog(): CommercialSku[] {
  return [
    {
      skuId: 'tc-personal',
      audience: 'TC',
      entitlement: 'per_return_software_fee',
      label: 'Tax Client — personal return',
      amountUsd: PRICING.TC.personalReturn,
      returnKind: 'personal',
      licensesSoftwareToProfessionals: false,
    },
    {
      skuId: 'tc-business',
      audience: 'TC',
      entitlement: 'per_return_software_fee',
      label: 'Tax Client — business return',
      amountUsd: PRICING.TC.businessReturn,
      returnKind: 'business_entity',
      licensesSoftwareToProfessionals: false,
    },
    {
      skuId: 'tp-personal',
      audience: 'TP',
      entitlement: 'per_return_software_fee',
      label: 'Tax Preparer — personal return license fee',
      amountUsd: PRICING.TP.personalReturn,
      returnKind: 'personal',
      licensesSoftwareToProfessionals: true,
    },
    {
      skuId: 'tp-self-employed',
      audience: 'TP',
      entitlement: 'per_return_software_fee',
      label: 'Tax Preparer — self-employed return license fee',
      amountUsd: PRICING.TP.selfEmployedReturn,
      returnKind: 'self_employed',
      licensesSoftwareToProfessionals: true,
    },
    {
      skuId: 'tp-business-entity',
      audience: 'TP',
      entitlement: 'per_return_software_fee',
      label: 'Tax Preparer — business entity return license fee',
      amountUsd: PRICING.TP.businessEntityReturn,
      returnKind: 'business_entity',
      licensesSoftwareToProfessionals: true,
    },
    {
      skuId: 'office-personal',
      audience: 'Office',
      entitlement: 'annual_office_subscription',
      label: PRICING.Office.plans.personal.name,
      amountUsd: PRICING.Office.plans.personal.annual,
      officePlanId: PRICING.Office.plans.personal.id,
      licensesSoftwareToProfessionals: true,
    },
    {
      skuId: 'office-self-employed',
      audience: 'Office',
      entitlement: 'annual_office_subscription',
      label: PRICING.Office.plans.selfEmployed.name,
      amountUsd: PRICING.Office.plans.selfEmployed.annual,
      officePlanId: PRICING.Office.plans.selfEmployed.id,
      licensesSoftwareToProfessionals: true,
    },
    {
      skuId: 'office-business',
      audience: 'Office',
      entitlement: 'annual_office_subscription',
      label: PRICING.Office.plans.business.name,
      amountUsd: PRICING.Office.plans.business.annual,
      officePlanId: PRICING.Office.plans.business.id,
      licensesSoftwareToProfessionals: true,
    },
  ]
}

export function officeCoveredReturnSoftwareFeeUsd(): number {
  return PRICING.Office.perReturnSoftwareFee
}

export function assertCommercialPricingMatchesFees(): {
  ok: boolean
  mismatches: string[]
} {
  const mismatches: string[] = []
  const cat = commercialSoftwareSkuCatalog()
  const expect: Record<string, number> = {
    'tc-personal': 300,
    'tc-business': 399,
    'tp-personal': 89,
    'tp-self-employed': 119,
    'tp-business-entity': 249,
    'office-personal': 899,
    'office-self-employed': 1199,
    'office-business': 1499,
  }
  for (const [id, amount] of Object.entries(expect)) {
    const sku = cat.find((s) => s.skuId === id)
    if (!sku || sku.amountUsd !== amount) {
      mismatches.push(`${id}: expected ${amount} got ${sku?.amountUsd}`)
    }
  }
  if (officeCoveredReturnSoftwareFeeUsd() !== 0) {
    mismatches.push('office covered return fee must be 0')
  }
  return { ok: mismatches.length === 0, mismatches }
}

export const COMMERCIAL_POSITIONING = {
  sellsToTaxOffices: true,
  sellsToIndependentPreparers: true,
  sellsToIndividualTaxpayers: true,
  isFranchise: false,
  isWhiteLabelReseller: false,
  softwareLicensor: 'NOVARA',
  calcEngineOwner: 'NOVARA',
  transmitterPath: 'NOVARA_direct_IRS_MeF_when_authorized',
} as const
