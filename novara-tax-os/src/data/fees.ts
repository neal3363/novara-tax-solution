/**
 * Centralized NOVARA pricing — single source of truth for all tiers.
 * TC = Tax Client · TP = Tax Preparer · Office = Tax Office
 * Do not hardcode prices elsewhere; import from this module.
 */

export type FeeStatus = 'approved' | 'provisional' | 'partner_pending'
export type AccountTier = 'TC' | 'TP' | 'Office'
export type BillingAudience = 'TC' | 'TP' | 'Office' | 'bank' | 'admin'

export interface FeeItem {
  id: string
  label: string
  amount: number
  note?: string
  status: FeeStatus
  audience: BillingAudience
}

/** —— Official three-tier pricing —— */
export const PRICING = {
  TC: {
    label: 'Tax Client',
    registration: 0,
    personalReturn: 300,
    businessReturn: 399,
    unlimitedClients: false,
    unlimitedReturns: false,
  },
  TP: {
    label: 'Tax Preparer',
    registration: 599,
    personalReturn: 129,
    businessReturn: 249,
    unlimitedClients: true,
    unlimitedReturns: true,
  },
  Office: {
    label: 'Tax Office',
    /** Configurable billing frequency until finalized (demo default: annual) */
    subscriptionBillingFrequency: 'annual' as 'annual' | 'monthly',
    subscriptionLow: 899,
    subscriptionHigh: 1250,
    personalReturn: 89,
    businessReturn: 249,
    unlimitedClients: true,
    unlimitedReturns: true,
  },
  banking: {
    liveConnectivity: false,
    /**
     * Architecture supports office-selected providers and/or a NOVARA platform partner
     * (see bankProducts.ts). Never set liveConnectivity true until API + agreements verified.
     */
    providerSelectionMode: 'either' as const,
    disclosure:
      'Banking-product and refund-transfer fees are separate from NOVARA software fees, disclosed before authorization, and not activated until provider agreements and testing are complete. Offices may configure an approved partner or use the platform default when connected — neither is live in this build.',
  },
} as const

export const UNLIMITED_CLIENTS_COPY = 'Unlimited Clients & Unlimited Tax Returns'

/** Prior-year NOVARA surcharge — once per tax year in an order (not per personal/business). */
export const PRIOR_YEAR_SURCHARGE = 250

/** Named exports used across the app */
export const TC_REGISTRATION_FEE = PRICING.TC.registration
export const TC_PERSONAL_FEE = PRICING.TC.personalReturn
export const TC_BUSINESS_FEE = PRICING.TC.businessReturn

export const TP_REGISTRATION_FEE = PRICING.TP.registration
export const TP_PERSONAL_FEE = PRICING.TP.personalReturn
export const TP_BUSINESS_FEE = PRICING.TP.businessReturn

export const OFFICE_SUBSCRIPTION_FLOOR = PRICING.Office.subscriptionLow
export const OFFICE_SUBSCRIPTION_HIGH = PRICING.Office.subscriptionHigh
export const OFFICE_PERSONAL_FEE = PRICING.Office.personalReturn
export const OFFICE_BUSINESS_FEE = PRICING.Office.businessReturn

/** @deprecated Use TP_BUSINESS_FEE — kept only to catch old imports during migration */
export const TP_BUSINESS_TOTAL = TP_BUSINESS_FEE

export const OFFICE_TIERS = [
  {
    id: 'office-899',
    name: 'Office Standard',
    annual: OFFICE_SUBSCRIPTION_FLOOR,
    businessReturns: true,
    status: 'approved' as const,
    blurb: `${UNLIMITED_CLIENTS_COPY}. Personal return software fee ${formatMoneyInline(OFFICE_PERSONAL_FEE)}; business ${formatMoneyInline(OFFICE_BUSINESS_FEE)}. Billing frequency configurable.`,
  },
  {
    id: 'office-1250',
    name: 'Office Plus',
    annual: OFFICE_SUBSCRIPTION_HIGH,
    businessReturns: true,
    status: 'approved' as const,
    blurb: `${UNLIMITED_CLIENTS_COPY}. Same per-return software fees. Enhanced office reporting and staff tools. Billing frequency configurable until finalized.`,
  },
]

export const STARTER_INCLUDES = [
  'Tax office dashboard',
  'Office and staff management',
  'Unlimited clients & unlimited tax returns',
  'Tax preparation workflows',
  'AI-assisted tax benefit discovery',
  'Return tracking and electronic signature workflows',
  'E-file management, where enabled',
]

export const TC_FEES: FeeItem[] = [
  {
    id: 'tc-personal',
    label: 'Personal tax return (TC)',
    amount: TC_PERSONAL_FEE,
    status: 'approved',
    audience: 'TC',
    note: 'Direct client preparation fee. Credits and deductions are calculated by NOVARA — clients do not apply them manually.',
  },
  {
    id: 'tc-business',
    label: 'Business tax return (TC)',
    amount: TC_BUSINESS_FEE,
    status: 'approved',
    audience: 'TC',
  },
]

export const TP_FEES: FeeItem[] = [
  {
    id: 'tp-registration',
    label: 'TP registration / upfront fee',
    amount: TP_REGISTRATION_FEE,
    status: 'approved',
    audience: 'TP',
    note: 'One-time registration. Unlimited clients & unlimited tax returns after approval.',
  },
  {
    id: 'tp-personal',
    label: 'Personal tax return (TP software)',
    amount: TP_PERSONAL_FEE,
    status: 'approved',
    audience: 'TP',
    note: 'NOVARA software fee per personal return. Separate from any client preparation fee the TP charges.',
  },
  {
    id: 'tp-business',
    label: 'Business tax return (TP software)',
    amount: TP_BUSINESS_FEE,
    status: 'approved',
    audience: 'TP',
    note: 'NOVARA software fee per business return. Never also charge the TC retail price on the same software line.',
  },
]

export const OFFICE_FEES: FeeItem[] = [
  {
    id: 'office-sub-899',
    label: 'Office subscription — Standard',
    amount: OFFICE_SUBSCRIPTION_FLOOR,
    status: 'approved',
    audience: 'Office',
    note: `${UNLIMITED_CLIENTS_COPY}. Frequency configurable (demo: annual).`,
  },
  {
    id: 'office-sub-1250',
    label: 'Office subscription — Plus',
    amount: OFFICE_SUBSCRIPTION_HIGH,
    status: 'approved',
    audience: 'Office',
    note: `${UNLIMITED_CLIENTS_COPY}. Frequency configurable (demo: annual).`,
  },
  {
    id: 'office-personal',
    label: 'Personal tax return (Office software)',
    amount: OFFICE_PERSONAL_FEE,
    status: 'approved',
    audience: 'Office',
  },
  {
    id: 'office-business',
    label: 'Business tax return (Office software)',
    amount: OFFICE_BUSINESS_FEE,
    status: 'approved',
    audience: 'Office',
  },
]

/** @deprecated Consumer catalog replaced by TC_FEES — alias for gradual migration */
export const CONSUMER_PRICES: FeeItem[] = TC_FEES

export const BANKING_FEES_NOTE = PRICING.banking.disclosure

export const TIER_REGISTRATION_CARDS = [
  {
    tier: 'TC' as AccountTier,
    title: 'I’m Filing My Taxes',
    subtitle: 'TC — Tax Client',
    registrationLabel: 'Registration',
    registrationAmount: TC_REGISTRATION_FEE,
    lines: [
      { label: 'Personal return', amount: TC_PERSONAL_FEE },
      { label: 'Business return', amount: TC_BUSINESS_FEE },
    ],
    path: '/register/tc',
    role: 'taxpayer' as const,
  },
  {
    tier: 'TP' as AccountTier,
    title: 'I’m a Tax Preparer',
    subtitle: 'TP — Tax Preparer',
    registrationLabel: 'Upfront fee',
    registrationAmount: TP_REGISTRATION_FEE,
    lines: [
      { label: 'Personal return', amount: TP_PERSONAL_FEE },
      { label: 'Business return', amount: TP_BUSINESS_FEE },
    ],
    badge: UNLIMITED_CLIENTS_COPY,
    path: '/register/tp',
    role: 'preparer' as const,
  },
  {
    tier: 'Office' as AccountTier,
    title: 'I Own a Tax Office',
    subtitle: 'Office — Tax Office',
    registrationLabel: 'Subscription',
    registrationAmount: null as number | null,
    registrationRange: [OFFICE_SUBSCRIPTION_FLOOR, OFFICE_SUBSCRIPTION_HIGH] as [number, number],
    lines: [
      { label: 'Personal return', amount: OFFICE_PERSONAL_FEE },
      { label: 'Business return', amount: OFFICE_BUSINESS_FEE },
    ],
    badge: UNLIMITED_CLIENTS_COPY,
    path: '/register/office',
    role: 'efin_owner' as const,
  },
]

function formatMoneyInline(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function returnSoftwareFee(tier: AccountTier, isBusiness: boolean): FeeItem {
  if (tier === 'TC') {
    return isBusiness ? TC_FEES.find((f) => f.id === 'tc-business')! : TC_FEES.find((f) => f.id === 'tc-personal')!
  }
  if (tier === 'TP') {
    return isBusiness ? TP_FEES.find((f) => f.id === 'tp-business')! : TP_FEES.find((f) => f.id === 'tp-personal')!
  }
  return isBusiness
    ? OFFICE_FEES.find((f) => f.id === 'office-business')!
    : OFFICE_FEES.find((f) => f.id === 'office-personal')!
}

export function roleToTier(role: string): AccountTier | null {
  if (role === 'taxpayer') return 'TC'
  if (role === 'preparer') return 'TP'
  if (role === 'efin_owner') return 'Office'
  return null
}

/** Prevent duplicate software charges on the same return id + fee id */
export function dedupeFeeLines(
  existing: { id?: string; label: string; amount: number; status: string }[],
  next: { label: string; amount: number; status: string },
) {
  if (existing.some((e) => e.label === next.label && e.amount === next.amount)) return existing
  return [...existing, next]
}

export function estimateNovaraAnnualCharges(input: {
  subscriptionAnnual: number
  individualReturns: number
  businessReturns: number
  /** Which software fee schedule to use for per-return lines */
  schedule?: 'TP' | 'Office'
}) {
  const schedule = input.schedule ?? 'Office'
  const personal = schedule === 'TP' ? TP_PERSONAL_FEE : OFFICE_PERSONAL_FEE
  const business = schedule === 'TP' ? TP_BUSINESS_FEE : OFFICE_BUSINESS_FEE
  const individualFees = input.individualReturns * personal
  const businessFees = input.businessReturns * business
  const perReturnTotal = individualFees + businessFees
  const total = input.subscriptionAnnual + perReturnTotal
  return { individualFees, businessFees, perReturnTotal, total, personalRate: personal, businessRate: business }
}

/** Quota helpers — TP/Office never enforce client or return caps */
export function clientQuotaForTier(tier: AccountTier): number | null {
  if (tier === 'TP' || tier === 'Office') return null // unlimited
  return null
}

export function assertUnlimitedProfessionalAccess(tier: AccountTier) {
  if (tier === 'TP') {
    return PRICING.TP.unlimitedClients && PRICING.TP.unlimitedReturns
  }
  if (tier === 'Office') {
    return PRICING.Office.unlimitedClients && PRICING.Office.unlimitedReturns
  }
  return true
}

export type YearReturnKind = 'personal' | 'business' | 'both'

export interface YearOrderSelection {
  taxYear: number
  /** personal | business | both — surcharge still once per year */
  kind: YearReturnKind
  filingMode: 'original' | 'amended'
}

export interface MultiYearFeeLine {
  id: string
  label: string
  amount: number
  taxYear?: number
  kind: 'base' | 'prior_year_surcharge' | 'enrollment' | 'subscription'
}

export interface MultiYearOrderQuote {
  currentTaxYear: number
  seasonYear: number
  lines: MultiYearFeeLine[]
  basePreparationTotal: number
  priorYearSurchargeTotal: number
  priorYearCount: number
  /** Preparation + prior-year surcharges only (excludes enrollment/subscription) */
  preparationGrandTotal: number
  enrollmentOrSubscription: number
  /** Full amount if enrollment is included in display — usually kept separate */
  displayTotalExcludingEnrollment: number
}

/**
 * Total NOVARA fee = sum of base preparation fees + ($250 × number of prior tax years).
 * Enrollment/subscription stays separate.
 */
export function quoteMultiYearOrder(
  tier: AccountTier,
  selections: YearOrderSelection[],
  opts?: { currentTaxYear?: number; seasonYear?: number; includeEnrollment?: boolean },
): MultiYearOrderQuote {
  const currentTaxYear = opts?.currentTaxYear ?? new Date().getUTCFullYear() - 1
  const seasonYear = opts?.seasonYear ?? currentTaxYear + 1
  const personal = tier === 'TC' ? TC_PERSONAL_FEE : tier === 'TP' ? TP_PERSONAL_FEE : OFFICE_PERSONAL_FEE
  const business = tier === 'TC' ? TC_BUSINESS_FEE : tier === 'TP' ? TP_BUSINESS_FEE : OFFICE_BUSINESS_FEE

  const lines: MultiYearFeeLine[] = []
  let basePreparationTotal = 0
  const priorYears = new Set<number>()

  const sorted = [...selections].sort((a, b) => b.taxYear - a.taxYear)
  for (const sel of sorted) {
    if (sel.kind === 'personal' || sel.kind === 'both') {
      lines.push({
        id: `base-personal-${sel.taxYear}`,
        label: `${sel.taxYear} personal return (${tier})${sel.filingMode === 'amended' ? ' — amended' : ''}`,
        amount: personal,
        taxYear: sel.taxYear,
        kind: 'base',
      })
      basePreparationTotal += personal
    }
    if (sel.kind === 'business' || sel.kind === 'both') {
      lines.push({
        id: `base-business-${sel.taxYear}`,
        label: `${sel.taxYear} business return (${tier})${sel.filingMode === 'amended' ? ' — amended' : ''}`,
        amount: business,
        taxYear: sel.taxYear,
        kind: 'base',
      })
      basePreparationTotal += business
    }
    if (sel.taxYear < currentTaxYear) priorYears.add(sel.taxYear)
  }

  let priorYearSurchargeTotal = 0
  Array.from(priorYears)
    .sort((a, b) => b - a)
    .forEach((y) => {
      lines.push({
        id: `prior-surcharge-${y}`,
        label: `${y} prior-year surcharge (once per year)`,
        amount: PRIOR_YEAR_SURCHARGE,
        taxYear: y,
        kind: 'prior_year_surcharge',
      })
      priorYearSurchargeTotal += PRIOR_YEAR_SURCHARGE
    })

  let enrollmentOrSubscription = 0
  if (opts?.includeEnrollment) {
    if (tier === 'TP') {
      enrollmentOrSubscription = TP_REGISTRATION_FEE
      lines.push({
        id: 'tp-enrollment',
        label: 'TP registration / upfront fee (separate)',
        amount: TP_REGISTRATION_FEE,
        kind: 'enrollment',
      })
    } else if (tier === 'Office') {
      enrollmentOrSubscription = OFFICE_SUBSCRIPTION_FLOOR
      lines.push({
        id: 'office-subscription',
        label: 'Office subscription (separate — plan selected at registration)',
        amount: OFFICE_SUBSCRIPTION_FLOOR,
        kind: 'subscription',
      })
    }
  }

  const preparationGrandTotal = basePreparationTotal + priorYearSurchargeTotal
  return {
    currentTaxYear,
    seasonYear,
    lines,
    basePreparationTotal,
    priorYearSurchargeTotal,
    priorYearCount: priorYears.size,
    preparationGrandTotal,
    enrollmentOrSubscription,
    displayTotalExcludingEnrollment: preparationGrandTotal,
  }
}
