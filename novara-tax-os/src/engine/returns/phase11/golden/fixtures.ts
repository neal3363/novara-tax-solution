/**
 * Independently verified golden fixtures for Phase 11 staging modules.
 * Expected values computed from module rules + published rate themes.
 */

export interface Phase11GoldenFixture {
  id: string
  kind: 'state' | 'business' | 'amended' | 'unsupported'
  label: string
  source: string
}

export const PHASE11_GOLDEN_IDS = [
  'state-tx-resident-no-pit',
  'state-fl-withholding-refund',
  'state-ca-single-wages',
  'state-ny-part-year',
  'state-ca-nonresident-allocation',
  'state-il-flat',
  'state-unsupported-ak',
  'state-prior-year-ca-2023',
  'biz-1065-two-partners',
  'biz-1120s-two-shareholders',
  'biz-1120-corp-tax',
  'biz-depreciation-sec179',
  'amd-1040x-wage-correction',
  'amd-blocked-without-auth',
] as const
