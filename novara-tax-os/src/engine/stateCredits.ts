/**
 * State-by-state credit law differences for TY staging.
 * Some states stack EITC / family credits on federal; others have no PIT at all.
 * Live nationwide state e-file stays OFF until each jurisdiction is authorized.
 */

export type StateCreditKind = 'eitc' | 'child' | 'renter' | 'other'

export interface StateCreditRule {
  id: string
  kind: StateCreditKind
  label: string
  /** Plain-language note for UI / landing. */
  summary: string
  /** Fraction of federal EITC mirrored when kind is eitc (0 = none). */
  federalEitcMatchRate: number
  /** Flat demo max when not EITC-based. */
  flatMax?: number
}

export interface StateCreditProfile {
  code: string
  name: string
  hasPersonalIncomeTax: boolean
  credits: StateCreditRule[]
  /** One-line landing / interview copy. */
  lawDifference: string
}

const NO_PIT = (code: string, name: string): StateCreditProfile => ({
  code,
  name,
  hasPersonalIncomeTax: false,
  credits: [],
  lawDifference: `${name} has no state personal income tax — no state EITC to add on top of federal.`,
})

/** Staging catalog — expand as more states are validated. */
export const STATE_CREDIT_PROFILES: Record<string, StateCreditProfile> = {
  TX: NO_PIT('TX', 'Texas'),
  FL: NO_PIT('FL', 'Florida'),
  CA: {
    code: 'CA',
    name: 'California',
    hasPersonalIncomeTax: true,
    credits: [
      {
        id: 'ca_eitc',
        kind: 'eitc',
        label: 'California EITC',
        summary: 'Refundable state EITC for low-to-moderate earners (staging match of federal).',
        federalEitcMatchRate: 0.45,
      },
      {
        id: 'ca_renter',
        kind: 'renter',
        label: 'CA renter credit',
        summary: 'Small nonrefundable credit for eligible renters.',
        federalEitcMatchRate: 0,
        flatMax: 60,
      },
      {
        id: 'ca_young_child',
        kind: 'child',
        label: 'Young Child Tax Credit (staging)',
        summary: 'Additional state support when a young child qualifies with CalEITC.',
        federalEitcMatchRate: 0,
        flatMax: 1000,
      },
    ],
    lawDifference:
      'California adds its own EITC (and related young-child support) on top of federal — more state credits than no-tax states.',
  },
  NY: {
    code: 'NY',
    name: 'New York',
    hasPersonalIncomeTax: true,
    credits: [
      {
        id: 'ny_eitc',
        kind: 'eitc',
        label: 'New York EITC',
        summary: 'State EITC generally mirrors a percentage of federal EITC.',
        federalEitcMatchRate: 0.3,
      },
      {
        id: 'ny_household',
        kind: 'other',
        label: 'NY household credit (staging)',
        summary: 'Income-based household credit for lower AGI filers.',
        federalEitcMatchRate: 0,
        flatMax: 75,
      },
    ],
    lawDifference:
      'New York offers a state EITC patterned on federal plus other household credits — different from Texas/Florida.',
  },
  IL: {
    code: 'IL',
    name: 'Illinois',
    hasPersonalIncomeTax: true,
    credits: [
      {
        id: 'il_eitc',
        kind: 'eitc',
        label: 'Illinois EITC',
        summary: 'Illinois matches a portion of federal EITC.',
        federalEitcMatchRate: 0.2,
      },
    ],
    lawDifference: 'Illinois has a flat income tax and a state EITC match — fewer add-ons than CA, more than TX/FL.',
  },
}

export function normalizeFilingState(raw: string | undefined | null): string {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (!s) return ''
  if (s === 'tx' || s === 'texas') return 'TX'
  if (s === 'fl' || s === 'florida') return 'FL'
  if (s === 'ca' || s === 'california') return 'CA'
  if (s === 'ny' || s === 'new york' || s === 'newyork') return 'NY'
  if (s === 'il' || s === 'illinois') return 'IL'
  if (/^[a-z]{2}$/.test(s)) return s.toUpperCase()
  // "1842 Harbor Ave, Austin, TX" / "... California 90210"
  const m = s.match(/,\s*([a-z]{2})\s*\d{0,5}\s*$/i) || s.match(/\b(texas|florida|california|new york|illinois)\b/i)
  if (m) return normalizeFilingState(m[1])
  return ''
}

export function getStateCreditProfile(rawState: string | undefined | null): StateCreditProfile | null {
  const code = normalizeFilingState(rawState)
  if (!code) return null
  return (
    STATE_CREDIT_PROFILES[code] ?? {
      code,
      name: code,
      hasPersonalIncomeTax: true,
      credits: [],
      lawDifference: `${code} state credits are reviewed individually — laws differ by state.`,
    }
  )
}

/** Extract state from a free-text address already on the return. */
export function filingStateFromAddress(address: string | undefined | null): string {
  return normalizeFilingState(address)
}

/**
 * Staging estimate of state refundable EITC-like credit from federal-ish EITC base.
 * Returns 0 when the state has no EITC (e.g. TX, FL).
 */
export function estimateStateEitcCredit(opts: {
  filingState: string | undefined | null
  federalEitcEstimate: number
  qualifyingChildren: number
}): number {
  const profile = getStateCreditProfile(opts.filingState)
  if (!profile || !profile.hasPersonalIncomeTax) return 0
  const eitc = profile.credits.find((c) => c.kind === 'eitc')
  if (!eitc || eitc.federalEitcMatchRate <= 0) return 0
  if (opts.federalEitcEstimate <= 0) return 0
  let amount = Math.round(opts.federalEitcEstimate * eitc.federalEitcMatchRate)
  const childBoost = profile.credits.find((c) => c.kind === 'child' && (c.flatMax ?? 0) > 0)
  if (childBoost && opts.qualifyingChildren > 0) {
    amount += Math.min(childBoost.flatMax ?? 0, (childBoost.flatMax ?? 0) * Math.min(1, opts.qualifyingChildren))
  }
  return amount
}

/** Landing / UI bullets summarizing how state laws differ. */
export function stateLawDifferenceBullets(): string[] {
  return Object.values(STATE_CREDIT_PROFILES).map((p) => p.lawDifference)
}
