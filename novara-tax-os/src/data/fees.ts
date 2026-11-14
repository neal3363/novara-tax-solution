/**
 * Centralized NOVARA pricing — single source of truth for all tiers.
 * TC = Tax Client · TP = Tax Preparer · Office = Tax Office
 * Do not hardcode prices elsewhere; import from this module.
 *
 * Approved structure (2026-11-14):
 * - TC: personal $300 / business $399 (unchanged)
 * - TP: pay-per-return only (no annual subscription) — $89 / $119 / $249
 * - Office: annual plans $899 / $1,199 / $1,499 — covered returns have $0 NOVARA per-return fee
 */

export type FeeStatus = 'approved' | 'provisional' | 'partner_pending'
export type AccountTier = 'TC' | 'TP' | 'Office'
export type BillingAudience = 'TC' | 'TP' | 'Office' | 'bank' | 'admin'

/** Return categories for NOVARA software fee selection */
export type ReturnKind = 'personal' | 'self_employed' | 'business_entity'

export type OfficePlanId = 'office-personal' | 'office-self-employed' | 'office-business'

export interface FeeItem {
  id: string
  label: string
  amount: number
  note?: string
  status: FeeStatus
  audience: BillingAudience
  /** Display hint: per return vs per year */
  cadence?: 'per_return' | 'per_year' | 'one_time' | 'included'
}

export const RETURN_KIND_LABELS: Record<ReturnKind, string> = {
  personal: 'Personal return',
  self_employed: 'Self-employed / Form 1040 with Schedule C',
  business_entity: 'Business entity (Form 1065, 1120-S, or 1120)',
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
    /** No annual TP subscription — pay per completed return only */
    registration: 0,
    billingModel: 'pay_per_return' as const,
    personalReturn: 89,
    selfEmployedReturn: 119,
    businessEntityReturn: 249,
    unlimitedClients: true,
    /** Unlimited clients; fees are per completed return, not capped returns */
    unlimitedReturns: true,
    canManagePreparers: false,
    disclosure:
      'TP prices are total NOVARA fees per completed return (not surcharges). TP sets their own client preparation charges. Bank-product, processing, and sponsor-office fees are disclosed separately.',
  },
  Office: {
    label: 'Tax Office',
    subscriptionBillingFrequency: 'annual' as 'annual' | 'monthly',
    /** Covered returns: no additional NOVARA per-return preparation fee */
    perReturnSoftwareFee: 0,
    unlimitedClients: true,
    unlimitedReturns: true,
    canManagePreparers: true,
    disclosure:
      'Office annual subscription covers eligible return types with no additional NOVARA per-return fee for covered returns, including work by preparers under that office. Bank-product fees remain separate.',
    plans: {
      personal: {
        id: 'office-personal' as OfficePlanId,
        name: 'Office Personal',
        annual: 899,
        allows: ['personal'] as const satisfies readonly ReturnKind[],
        blurb: 'Personal returns only. Unlimited clients & returns, preparer management, client assignment, office oversight.',
      },
      selfEmployed: {
        id: 'office-self-employed' as OfficePlanId,
        name: 'Office Self-Employed',
        annual: 1199,
        allows: ['personal', 'self_employed'] as const satisfies readonly ReturnKind[],
        blurb: 'Personal and Schedule C returns. Unlimited clients & returns, preparer management, client assignment, office oversight.',
      },
      business: {
        id: 'office-business' as OfficePlanId,
        name: 'Office Business',
        annual: 1499,
        allows: ['personal', 'self_employed', 'business_entity'] as const satisfies readonly ReturnKind[],
        blurb: 'Personal, Schedule C, 1065, 1120-S, and 1120. Unlimited clients & returns, preparer management, client assignment, office oversight.',
      },
    },
  },
  banking: {
    liveConnectivity: false,
    providerSelectionMode: 'either' as const,
    disclosure:
      'Banking-product and refund-transfer fees are separate from NOVARA software fees, disclosed before authorization, and not activated until provider agreements and testing are complete. Offices may configure an approved partner or use the platform default when connected — neither is live in this build.',
  },
  /**
   * Existing customer billing agreements are preserved.
   * Do not auto-migrate or re-charge subscribers when catalog prices change.
   */
  preserveExistingBillingAgreements: true,
} as const

export const UNLIMITED_CLIENTS_COPY = 'Unlimited Clients & Unlimited Tax Returns'

/** Prior-year NOVARA surcharge — once per tax year in an order (not per personal/business). */
export const PRIOR_YEAR_SURCHARGE = 250

/** Named exports used across the app */
export const TC_REGISTRATION_FEE = PRICING.TC.registration
export const TC_PERSONAL_FEE = PRICING.TC.personalReturn
export const TC_BUSINESS_FEE = PRICING.TC.businessReturn

/** @deprecated TP has no annual subscription — always 0 */
export const TP_REGISTRATION_FEE = PRICING.TP.registration
export const TP_PERSONAL_FEE = PRICING.TP.personalReturn
export const TP_SELF_EMPLOYED_FEE = PRICING.TP.selfEmployedReturn
/** Business entity return (1065 / 1120-S / 1120) — standalone total, not a surcharge */
export const TP_BUSINESS_FEE = PRICING.TP.businessEntityReturn

export const OFFICE_SUBSCRIPTION_PERSONAL = PRICING.Office.plans.personal.annual
export const OFFICE_SUBSCRIPTION_SELF_EMPLOYED = PRICING.Office.plans.selfEmployed.annual
export const OFFICE_SUBSCRIPTION_BUSINESS = PRICING.Office.plans.business.annual
/** Lowest / highest Office annual plan (for range displays) */
export const OFFICE_SUBSCRIPTION_FLOOR = OFFICE_SUBSCRIPTION_PERSONAL
export const OFFICE_SUBSCRIPTION_HIGH = OFFICE_SUBSCRIPTION_BUSINESS
/** Covered Office returns: $0 additional NOVARA per-return fee */
export const OFFICE_PERSONAL_FEE = PRICING.Office.perReturnSoftwareFee
export const OFFICE_BUSINESS_FEE = PRICING.Office.perReturnSoftwareFee
export const OFFICE_SELF_EMPLOYED_FEE = PRICING.Office.perReturnSoftwareFee

/** @deprecated Use TP_BUSINESS_FEE */
export const TP_BUSINESS_TOTAL = TP_BUSINESS_FEE

export const OFFICE_TIERS = [
  {
    id: PRICING.Office.plans.personal.id,
    name: PRICING.Office.plans.personal.name,
    annual: OFFICE_SUBSCRIPTION_PERSONAL,
    allows: PRICING.Office.plans.personal.allows,
    businessReturns: false,
    status: 'approved' as const,
    blurb: `${PRICING.Office.plans.personal.blurb} ${formatMoneyInline(OFFICE_SUBSCRIPTION_PERSONAL)}/year.`,
  },
  {
    id: PRICING.Office.plans.selfEmployed.id,
    name: PRICING.Office.plans.selfEmployed.name,
    annual: OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
    allows: PRICING.Office.plans.selfEmployed.allows,
    businessReturns: false,
    status: 'approved' as const,
    blurb: `${PRICING.Office.plans.selfEmployed.blurb} ${formatMoneyInline(OFFICE_SUBSCRIPTION_SELF_EMPLOYED)}/year.`,
  },
  {
    id: PRICING.Office.plans.business.id,
    name: PRICING.Office.plans.business.name,
    annual: OFFICE_SUBSCRIPTION_BUSINESS,
    allows: PRICING.Office.plans.business.allows,
    businessReturns: true,
    status: 'approved' as const,
    blurb: `${PRICING.Office.plans.business.blurb} ${formatMoneyInline(OFFICE_SUBSCRIPTION_BUSINESS)}/year.`,
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
    cadence: 'per_return',
    note: 'Direct client preparation fee. Credits and deductions are calculated by NOVARA — clients do not apply them manually.',
  },
  {
    id: 'tc-business',
    label: 'Business tax return (TC)',
    amount: TC_BUSINESS_FEE,
    status: 'approved',
    audience: 'TC',
    cadence: 'per_return',
  },
]

export const TP_FEES: FeeItem[] = [
  {
    id: 'tp-personal',
    label: 'Personal return (TP) — per return',
    amount: TP_PERSONAL_FEE,
    status: 'approved',
    audience: 'TP',
    cadence: 'per_return',
    note: 'Standalone total NOVARA fee per completed personal return. Not a surcharge. Separate from any client preparation fee the TP charges.',
  },
  {
    id: 'tp-self-employed',
    label: 'Self-employed / Schedule C (TP) — per return',
    amount: TP_SELF_EMPLOYED_FEE,
    status: 'approved',
    audience: 'TP',
    cadence: 'per_return',
    note: 'Standalone total NOVARA fee for Form 1040 with Schedule C. Not stacked on the personal fee.',
  },
  {
    id: 'tp-business-entity',
    label: 'Business entity return (TP) — per return',
    amount: TP_BUSINESS_FEE,
    status: 'approved',
    audience: 'TP',
    cadence: 'per_return',
    note: 'Standalone total NOVARA fee for Form 1065, 1120-S, or 1120. Never also charge the TC retail price on the same software line.',
  },
]

export const OFFICE_FEES: FeeItem[] = [
  {
    id: 'office-sub-personal',
    label: 'Office subscription — Personal (per year)',
    amount: OFFICE_SUBSCRIPTION_PERSONAL,
    status: 'approved',
    audience: 'Office',
    cadence: 'per_year',
    note: `${UNLIMITED_CLIENTS_COPY}. Covers personal returns with $0 additional NOVARA per-return fee.`,
  },
  {
    id: 'office-sub-self-employed',
    label: 'Office subscription — Self-Employed (per year)',
    amount: OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
    status: 'approved',
    audience: 'Office',
    cadence: 'per_year',
    note: `${UNLIMITED_CLIENTS_COPY}. Covers personal and Schedule C returns with $0 additional NOVARA per-return fee.`,
  },
  {
    id: 'office-sub-business',
    label: 'Office subscription — Business (per year)',
    amount: OFFICE_SUBSCRIPTION_BUSINESS,
    status: 'approved',
    audience: 'Office',
    cadence: 'per_year',
    note: `${UNLIMITED_CLIENTS_COPY}. Covers personal, Schedule C, 1065, 1120-S, and 1120 with $0 additional NOVARA per-return fee.`,
  },
  {
    id: 'office-covered-return',
    label: 'Covered return under Office subscription',
    amount: 0,
    status: 'approved',
    audience: 'Office',
    cadence: 'included',
    note: 'No additional NOVARA per-return preparation fee for returns covered by the active Office plan (including office-employed preparers).',
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
      { label: 'Personal return', amount: TC_PERSONAL_FEE, cadence: 'per_return' as const },
      { label: 'Business return', amount: TC_BUSINESS_FEE, cadence: 'per_return' as const },
    ],
    path: '/register/tc',
    role: 'taxpayer' as const,
  },
  {
    tier: 'TP' as AccountTier,
    title: 'I’m a Tax Preparer',
    subtitle: 'TP — Tax Preparer',
    registrationLabel: 'No annual subscription',
    registrationAmount: 0,
    lines: [
      { label: 'Personal — per return', amount: TP_PERSONAL_FEE, cadence: 'per_return' as const },
      { label: 'Self-employed / Sch. C — per return', amount: TP_SELF_EMPLOYED_FEE, cadence: 'per_return' as const },
      { label: 'Business entity — per return', amount: TP_BUSINESS_FEE, cadence: 'per_return' as const },
    ],
    badge: UNLIMITED_CLIENTS_COPY,
    path: '/register/tp',
    role: 'preparer' as const,
  },
  {
    tier: 'Office' as AccountTier,
    title: 'I Own a Tax Office',
    subtitle: 'Office — Tax Office',
    registrationLabel: 'Annual subscription',
    registrationAmount: null as number | null,
    registrationRange: [OFFICE_SUBSCRIPTION_FLOOR, OFFICE_SUBSCRIPTION_HIGH] as [number, number],
    lines: [
      { label: 'Personal plan — per year', amount: OFFICE_SUBSCRIPTION_PERSONAL, cadence: 'per_year' as const },
      { label: 'Self-Employed plan — per year', amount: OFFICE_SUBSCRIPTION_SELF_EMPLOYED, cadence: 'per_year' as const },
      { label: 'Business plan — per year', amount: OFFICE_SUBSCRIPTION_BUSINESS, cadence: 'per_year' as const },
      { label: 'Covered return software fee', amount: 0, cadence: 'included' as const },
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

export function officePlanById(planId: OfficePlanId | string | undefined) {
  if (!planId) return PRICING.Office.plans.personal
  const found = OFFICE_TIERS.find((t) => t.id === planId)
  if (found) {
    return (
      Object.values(PRICING.Office.plans).find((p) => p.id === found.id) ?? PRICING.Office.plans.personal
    )
  }
  // Legacy amount mapping for preserved agreements / old registrations
  if (planId === '899' || planId === 'office-899') return PRICING.Office.plans.personal
  if (planId === '1199') return PRICING.Office.plans.selfEmployed
  if (planId === '1250' || planId === 'office-1250' || planId === '1499') return PRICING.Office.plans.business
  return PRICING.Office.plans.personal
}

export function officePlanAllowsReturn(
  planId: OfficePlanId | string | undefined,
  kind: ReturnKind,
): boolean {
  const plan = officePlanById(planId)
  return (plan.allows as readonly ReturnKind[]).includes(kind)
}

/** Map legacy boolean business flag → return kind (self-employed must be explicit). */
export function returnKindFromFlags(input: {
  isBusiness?: boolean
  hasScheduleC?: boolean
  kind?: ReturnKind
}): ReturnKind {
  if (input.kind) return input.kind
  if (input.isBusiness) return 'business_entity'
  if (input.hasScheduleC) return 'self_employed'
  return 'personal'
}

/**
 * Authoritative NOVARA software fee for a completed return.
 * Office-employed preparers inherit Office subscription coverage (never standalone TP fees).
 */
export function novaraSoftwareFeeForReturn(input: {
  tier: AccountTier
  kind: ReturnKind
  /** Active Office plan — required for Office eligibility checks */
  officePlanId?: OfficePlanId | string
  /** When true, charge is under Office subscription even if actor is a preparer login */
  officeEmployedPreparer?: boolean
}): { amount: number; fee: FeeItem; eligible: boolean; reason?: string } {
  const { tier, kind } = input

  if (input.officeEmployedPreparer || tier === 'Office') {
    const planId = input.officePlanId
    if (!officePlanAllowsReturn(planId, kind)) {
      return {
        amount: 0,
        fee: OFFICE_FEES.find((f) => f.id === 'office-covered-return')!,
        eligible: false,
        reason: `Office plan does not cover ${RETURN_KIND_LABELS[kind]}. Upgrade required before filing this return type.`,
      }
    }
    return {
      amount: 0,
      fee: OFFICE_FEES.find((f) => f.id === 'office-covered-return')!,
      eligible: true,
    }
  }

  if (tier === 'TP') {
    if (kind === 'personal') {
      return { amount: TP_PERSONAL_FEE, fee: TP_FEES.find((f) => f.id === 'tp-personal')!, eligible: true }
    }
    if (kind === 'self_employed') {
      return {
        amount: TP_SELF_EMPLOYED_FEE,
        fee: TP_FEES.find((f) => f.id === 'tp-self-employed')!,
        eligible: true,
      }
    }
    return {
      amount: TP_BUSINESS_FEE,
      fee: TP_FEES.find((f) => f.id === 'tp-business-entity')!,
      eligible: true,
    }
  }

  // TC
  if (kind === 'business_entity' || kind === 'self_employed') {
    // TC business retail remains the business return fee; Sch C personal filers use personal unless explicitly business
    if (kind === 'business_entity') {
      return { amount: TC_BUSINESS_FEE, fee: TC_FEES.find((f) => f.id === 'tc-business')!, eligible: true }
    }
  }
  return { amount: TC_PERSONAL_FEE, fee: TC_FEES.find((f) => f.id === 'tc-personal')!, eligible: true }
}

/** @deprecated Prefer novaraSoftwareFeeForReturn — maps isBusiness → personal | business_entity */
export function returnSoftwareFee(tier: AccountTier, isBusiness: boolean): FeeItem {
  const kind: ReturnKind = isBusiness ? 'business_entity' : 'personal'
  return novaraSoftwareFeeForReturn({ tier, kind }).fee
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
  selfEmployedReturns?: number
  businessReturns: number
  /** Which software fee schedule to use for per-return lines */
  schedule?: 'TP' | 'Office'
  officePlanId?: OfficePlanId | string
}) {
  const schedule = input.schedule ?? 'Office'
  const selfEmp = input.selfEmployedReturns ?? 0

  if (schedule === 'Office') {
    // Covered returns: $0 per-return under active subscription
    const personalRate = 0
    const selfEmployedRate = 0
    const businessRate = 0
    const individualFees = 0
    const selfEmployedFees = 0
    const businessFees = 0
    const perReturnTotal = 0
    const total = input.subscriptionAnnual
    return {
      individualFees,
      selfEmployedFees,
      businessFees,
      perReturnTotal,
      total,
      personalRate,
      selfEmployedRate,
      businessRate,
      model: 'office_subscription_includes_returns' as const,
    }
  }

  const personalRate = TP_PERSONAL_FEE
  const selfEmployedRate = TP_SELF_EMPLOYED_FEE
  const businessRate = TP_BUSINESS_FEE
  const individualFees = input.individualReturns * personalRate
  const selfEmployedFees = selfEmp * selfEmployedRate
  const businessFees = input.businessReturns * businessRate
  const perReturnTotal = individualFees + selfEmployedFees + businessFees
  // No annual TP subscription
  const total = perReturnTotal
  return {
    individualFees,
    selfEmployedFees,
    businessFees,
    perReturnTotal,
    total,
    personalRate,
    selfEmployedRate,
    businessRate,
    model: 'tp_pay_per_return' as const,
  }
}

/** Quota helpers — TP/Office never enforce client or return caps */
export function clientQuotaForTier(tier: AccountTier): number | null {
  if (tier === 'TP' || tier === 'Office') return null
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

export function assertApprovedTpOfficePricing(): { ok: boolean; detail: string } {
  const ok =
    TP_REGISTRATION_FEE === 0 &&
    TP_PERSONAL_FEE === 89 &&
    TP_SELF_EMPLOYED_FEE === 119 &&
    TP_BUSINESS_FEE === 249 &&
    OFFICE_SUBSCRIPTION_PERSONAL === 899 &&
    OFFICE_SUBSCRIPTION_SELF_EMPLOYED === 1199 &&
    OFFICE_SUBSCRIPTION_BUSINESS === 1499 &&
    OFFICE_PERSONAL_FEE === 0 &&
    OFFICE_BUSINESS_FEE === 0 &&
    PRICING.TP.canManagePreparers === false &&
    PRICING.Office.canManagePreparers === true &&
    PRICING.preserveExistingBillingAgreements === true
  return {
    ok,
    detail: ok
      ? 'TP pay-per-return 89/119/249; Office annual 899/1199/1499; covered Office returns $0'
      : 'TP/Office pricing mismatch',
  }
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
  opts?: {
    currentTaxYear?: number
    seasonYear?: number
    includeEnrollment?: boolean
    officePlanId?: OfficePlanId | string
  },
): MultiYearOrderQuote {
  const currentTaxYear = opts?.currentTaxYear ?? new Date().getUTCFullYear() - 1
  const seasonYear = opts?.seasonYear ?? currentTaxYear + 1

  const lines: MultiYearFeeLine[] = []
  let basePreparationTotal = 0
  const priorYears = new Set<number>()

  const sorted = [...selections].sort((a, b) => b.taxYear - a.taxYear)
  for (const sel of sorted) {
    const kinds: ReturnKind[] = []
    if (sel.kind === 'personal' || sel.kind === 'both') kinds.push('personal')
    if (sel.kind === 'business' || sel.kind === 'both') kinds.push('business_entity')

    for (const rk of kinds) {
      const priced = novaraSoftwareFeeForReturn({
        tier,
        kind: rk,
        officePlanId: opts?.officePlanId,
      })
      lines.push({
        id: `base-${rk}-${sel.taxYear}`,
        label: `${sel.taxYear} ${RETURN_KIND_LABELS[rk]} (${tier})${sel.filingMode === 'amended' ? ' — amended' : ''}${
          priced.amount === 0 && tier === 'Office' ? ' — included in subscription' : ''
        }`,
        amount: priced.amount,
        taxYear: sel.taxYear,
        kind: 'base',
      })
      basePreparationTotal += priced.amount
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
      // No annual TP subscription
      enrollmentOrSubscription = 0
    } else if (tier === 'Office') {
      const plan = officePlanById(opts.officePlanId)
      enrollmentOrSubscription = plan.annual
      lines.push({
        id: `office-subscription-${plan.id}`,
        label: `${plan.name} subscription (per year — separate from per-return)`,
        amount: plan.annual,
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
