/**
 * Phase 4 — calculation gap inventory (updated after form expansion).
 * productionReady remains false for all forms. Do not claim production completeness.
 */

export type GapStatus =
  | 'unsupported'
  | 'partial'
  | 'stub_proposed'
  | 'needs_approval'
  | 'isolated-validated'
  | 'isolated-partial'

export interface CalculationGap {
  id: string
  form: string
  title: string
  status: GapStatus
  dependsOn: string[]
  taxYears: number[]
  whatExists: string
  proposedAddition: string
  blockedBy: string[]
  approvalRequired: boolean
  productionReady: false
}

export const CALCULATION_GAPS: CalculationGap[] = [
  {
    id: 'form-8962',
    form: 'Form 8962',
    title: 'Premium Tax Credit (benchmark SLCSP + APTC repayment)',
    status: 'isolated-validated',
    dependsOn: ['Form 1095-A', 'FPL tables', 'applicable percentage table'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists:
      'Isolated form8962.ts: annual + monthly SLCSP/enrollment, applicable figure, APTC repayment limitation. Golden-tested.',
    proposedAddition: 'Wire to UI only after cutover approval; expand state FPL variants.',
    blockedBy: ['Engine cutover not approved', 'Not connected to Maximizer'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'form-8995a',
    form: 'Form 8995-A',
    title: 'QBI deduction — wage/UBIA/SSTB phase-in',
    status: 'isolated-validated',
    dependsOn: ['Schedule C/E/K-1 QBI', 'W-2 wages', 'UBIA', 'taxable income before QBI'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Isolated form8995A.ts with below-threshold, phase-in, and above-phase-in paths including SSTB.',
    proposedAddition: 'Multi-trade aggregation worksheets; UI wiring after approval.',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'form-8863',
    form: 'Form 8863',
    title: 'Education credits (AOTC / LLC)',
    status: 'isolated-validated',
    dependsOn: ['Form 1098-T', 'qualified expenses', 'student eligibility'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Isolated form8863.ts with AOTC refundable 40% and LLC nonrefundable + phaseouts.',
    proposedAddition: 'Prior-year AOTC count enforcement inside engine; 1098-T box mapping.',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'schedule-b',
    form: 'Schedule B',
    title: 'Interest and Ordinary Dividends',
    status: 'isolated-validated',
    dependsOn: ['1099-INT', '1099-DIV'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Isolated scheduleB.ts aggregating interest/dividends and foreign-account flags.',
    proposedAddition: 'Nominee / seller-financed mortgage lines.',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'schedule-d',
    form: 'Schedule D',
    title: 'Capital Gains and Losses',
    status: 'isolated-validated',
    dependsOn: ['Form 8949', '1099-B', 'QD/LTCG worksheet'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists:
      'Isolated scheduleD.ts with ST/LT net, $3,000 loss limit, QD/LTCG preferential worksheet themes.',
    proposedAddition: '28% rate gains, unrecaptured §1250, Form 8949 detail rows.',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'schedule-e',
    form: 'Schedule E',
    title: 'Supplemental Income and Loss',
    status: 'isolated-validated',
    dependsOn: ['Rental worksheets', 'K-1', 'Form 8582'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists:
      'Isolated scheduleE.ts integrated with Form 8582 special allowance, MAGI phaseout, carryforwards, disposition.',
    proposedAddition: 'PTP full netting; real-estate-professional hour tests; multi-activity ordering polish.',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'form-8582',
    form: 'Form 8582',
    title: 'Passive Activity Loss Limitations',
    status: 'isolated-validated',
    dependsOn: ['Schedule E', 'MAGI', 'Pub 925'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists:
      'Isolated form8582.ts: $25k special allowance, MAGI phaseout, passive income offset, suspended PAL, disposition release.',
    proposedAddition: 'Commercial revitalization; full PTP worksheets.',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'form-6251',
    form: 'Form 6251',
    title: 'Alternative Minimum Tax',
    status: 'isolated-validated',
    dependsOn: ['AMT exemption/phaseout tables', 'preference items'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Isolated form6251Amt.ts with std-ded/SALT add-backs and 26%/28% TMT.',
    proposedAddition: 'Full preference-item schedule (ISO, private activity bonds, etc.).',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'form-8960',
    form: 'Form 8960',
    title: 'Net Investment Income Tax',
    status: 'isolated-validated',
    dependsOn: ['NII composition', 'MAGI thresholds'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Isolated form8960Niit.ts — 3.8% of lesser of NII or MAGI excess.',
    proposedAddition: 'Passive trade/business NII nuances.',
    blockedBy: ['Engine cutover not approved'],
    approvalRequired: true,
    productionReady: false,
  },
  {
    id: 'amended-recalc',
    form: 'Form 1040-X',
    title: 'Amended return recalculation',
    status: 'isolated-validated',
    dependsOn: ['Original return snapshot', 'corrected lines', 'IRS engine'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists:
      'Isolated form1040x.ts diffs original vs corrected through computeIrsFederalReturn. Amendments UI unchanged.',
    proposedAddition: 'Optional staff-only shadow wiring after dual-run parity approval.',
    blockedBy: ['Engine cutover not approved', 'Protected amendments module'],
    approvalRequired: true,
    productionReady: false,
  },
]

export function formatGapInventory(): string {
  return CALCULATION_GAPS.map(
    (g) =>
      `[${g.status}] ${g.form}: ${g.title}\n  Exists: ${g.whatExists}\n  Production ready: false\n  Approval: ${g.approvalRequired ? 'REQUIRED before UI/Maximizer wiring' : 'n/a'}`,
  ).join('\n\n')
}

export function gapsNeedingApproval(): CalculationGap[] {
  return CALCULATION_GAPS.filter((g) => g.approvalRequired)
}

export function completedPhase4Forms(): CalculationGap[] {
  return CALCULATION_GAPS.filter(
    (g) => g.status === 'isolated-validated' || g.status === 'isolated-partial',
  )
}
