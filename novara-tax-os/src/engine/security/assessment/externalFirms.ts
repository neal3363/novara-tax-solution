/**
 * Qualified external penetration-testing provider shortlist (planning only).
 * Owner must engage and contract — Cursor cannot perform independent AppSec.
 * Cost bands are estimates in USD; obtain formal quotes.
 */

export interface ExternalPentestFirm {
  id: string
  name: string
  focus: string
  typicalCostBandUsd: string
  website: string
  notes: string
}

export function recommendedExternalPentestFirms(): ExternalPentestFirm[] {
  return [
    {
      id: 'ncc',
      name: 'NCC Group',
      focus: 'Application & cloud penetration testing',
      typicalCostBandUsd: '15,000–40,000+',
      website: 'https://www.nccgroup.com/',
      notes: 'Enterprise AppSec; good for regulated data handling reviews',
    },
    {
      id: 'trailofbits',
      name: 'Trail of Bits',
      focus: 'Application security / cryptography-aware review',
      typicalCostBandUsd: '20,000–50,000+',
      website: 'https://www.trailofbits.com/',
      notes: 'Strong for crypto/KMS and high-assurance reviews',
    },
    {
      id: 'bishopfox',
      name: 'Bishop Fox',
      focus: 'Offensive security / pentest',
      typicalCostBandUsd: '15,000–45,000+',
      website: 'https://bishopfox.com/',
      notes: 'Common for SaaS web/API assessments',
    },
    {
      id: 'cobalt',
      name: 'Cobalt',
      focus: 'Pentest-as-a-service',
      typicalCostBandUsd: '8,000–25,000',
      website: 'https://www.cobalt.io/',
      notes: 'Faster scoping cycles; confirm tax-PII experience',
    },
    {
      id: 'bugcrowd-pentest',
      name: 'Bugcrowd / invited pentest',
      focus: 'Managed pentest or private bug bounty',
      typicalCostBandUsd: '5,000–20,000+',
      website: 'https://www.bugcrowd.com/',
      notes: 'Useful after baseline pentest for continuous coverage',
    },
  ]
}

export function estimatedAppsecBudgetUsd(): {
  initialPentest: string
  retest: string
  annualOngoing: string
} {
  return {
    initialPentest: '5,000–40,000+',
    retest: '1,500–5,000',
    annualOngoing: '10,000–40,000+ (optional continuous)',
  }
}
