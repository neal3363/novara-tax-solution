/**
 * Federal + state electronic filing authorization matrix for NOVARA as
 * an independent software company / transmitter.
 *
 * Staging calc support ≠ state e-file authorization.
 * nationwideStateFiling remains false until per-state approvals exist.
 */

export type StateEfileStatus =
  | 'staging_calc_only'
  | 'no_personal_income_tax'
  | 'unsupported_calc'
  | 'efile_approval_required'
  | 'efile_approved' // never set without owner evidence

export interface StateFilingRequirement {
  stateCode: string
  name: string
  calcStatus: StateEfileStatus
  efileRequiredForProduction: boolean
  agencyHint: string
  notes: string
  officialInfoUrl?: string
}

/** Priority states already covered by Phase 11 staging calcs. */
export function priorityStateFilingRequirements(): StateFilingRequirement[] {
  return [
    {
      stateCode: 'TX',
      name: 'Texas',
      calcStatus: 'no_personal_income_tax',
      efileRequiredForProduction: false,
      agencyHint: 'No personal income tax return for individuals',
      notes: 'Business franchise/other filings out of Phase 11 personal scope',
    },
    {
      stateCode: 'FL',
      name: 'Florida',
      calcStatus: 'no_personal_income_tax',
      efileRequiredForProduction: false,
      agencyHint: 'No personal income tax return for individuals',
      notes: 'Business filings out of Phase 11 personal scope',
    },
    {
      stateCode: 'CA',
      name: 'California',
      calcStatus: 'staging_calc_only',
      efileRequiredForProduction: true,
      agencyHint: 'FTB e-file / software developer participation',
      notes: 'Must complete FTB software provider / ATS-equivalent before live CA e-file',
      officialInfoUrl: 'https://www.ftb.ca.gov/tax-professionals/efile/',
    },
    {
      stateCode: 'NY',
      name: 'New York',
      calcStatus: 'staging_calc_only',
      efileRequiredForProduction: true,
      agencyHint: 'NYS Tax e-file software developer requirements',
      notes: 'NYC/Yonkers not in current staging scope; separate approvals may apply',
      officialInfoUrl: 'https://www.tax.ny.gov/bus/efile/',
    },
    {
      stateCode: 'IL',
      name: 'Illinois',
      calcStatus: 'staging_calc_only',
      efileRequiredForProduction: true,
      agencyHint: 'Illinois Department of Revenue e-file / software approval',
      notes: 'Complete IDOR software developer testing before live IL e-file',
      officialInfoUrl: 'https://tax.illinois.gov/taxprofessionals/electronicfiling.html',
    },
  ]
}

/** Representative expansion states — calc unsupported; e-file approval required before claim. */
export function expansionStateEfilePlaceholders(): StateFilingRequirement[] {
  const stubs: { code: string; name: string; url?: string }[] = [
    { code: 'GA', name: 'Georgia', url: 'https://dor.georgia.gov/' },
    { code: 'NC', name: 'North Carolina', url: 'https://www.ncdor.gov/' },
    { code: 'PA', name: 'Pennsylvania', url: 'https://www.revenue.pa.gov/' },
    { code: 'OH', name: 'Ohio', url: 'https://tax.ohio.gov/' },
    { code: 'MI', name: 'Michigan', url: 'https://www.michigan.gov/taxes' },
    { code: 'NJ', name: 'New Jersey', url: 'https://www.nj.gov/treasury/taxation/' },
    { code: 'VA', name: 'Virginia', url: 'https://www.tax.virginia.gov/' },
    { code: 'AZ', name: 'Arizona', url: 'https://azdor.gov/' },
    { code: 'WA', name: 'Washington', url: 'https://dor.wa.gov/' },
    { code: 'CO', name: 'Colorado', url: 'https://tax.colorado.gov/' },
  ]
  return stubs.map((s) => ({
    stateCode: s.code,
    name: s.name,
    calcStatus: 'unsupported_calc' as const,
    efileRequiredForProduction: true,
    agencyHint: `${s.name} revenue department software / e-file participation`,
    notes: 'Not in Phase 11 calc set; do not claim support or e-file until calc + approval complete',
    officialInfoUrl: s.url,
  }))
}

export function federalFilingRequirements(): {
  id: string
  requirement: string
  status: 'scaffolded' | 'blocked'
  evidence: string
}[] {
  return [
    {
      id: 'fed-sw-dev',
      requirement: 'IRS Authorized e-file Provider — Software Developer',
      status: 'blocked',
      evidence: 'EXT-IRS-PROVIDER',
    },
    {
      id: 'fed-transmitter',
      requirement: 'IRS Authorized e-file Provider — Transmitter',
      status: 'blocked',
      evidence: 'EXT-IRS-PROVIDER',
    },
    {
      id: 'fed-ats',
      requirement: 'Official MeF ATS (Pub 1436) acceptances',
      status: 'blocked',
      evidence: 'EXT-IRS-ATS',
    },
    {
      id: 'fed-etin',
      requirement: 'NOVARA EFIN + Test/Production ETINs + Software IDs',
      status: 'blocked',
      evidence: 'EXT-IRS-EFIN-ETIN',
    },
    {
      id: 'fed-safeguard',
      requirement: 'Pub 4557 safeguarding + independent AppSec',
      status: 'scaffolded',
      evidence: 'EXT-APPSEC',
    },
  ]
}

export function statesRequiringEfileApprovalBeforeLive(): StateFilingRequirement[] {
  return [...priorityStateFilingRequirements(), ...expansionStateEfilePlaceholders()].filter(
    (s) => s.efileRequiredForProduction,
  )
}

export const STATE_EFILE_DISCLAIMER =
  'Staging state tax calculations are not state e-file authorization. Nationwide state filing remains disabled until each state grants software/e-file approval and calcs are production-validated.'
