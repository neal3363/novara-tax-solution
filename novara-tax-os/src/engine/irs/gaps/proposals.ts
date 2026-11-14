/**
 * Phase 3 — inventory of missing IRS calculations.
 * Isolated stubs / proposals only. Do NOT implement as complete forms.
 * Request approval before changing protected modules (benefitOptimizer, fees, UI).
 */

export type GapStatus = 'unsupported' | 'partial' | 'stub_proposed' | 'needs_approval'

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
}

export const CALCULATION_GAPS: CalculationGap[] = [
  {
    id: 'form-8962',
    form: 'Form 8962',
    title: 'Premium Tax Credit (full worksheet)',
    status: 'partial',
    dependsOn: ['Form 1095-A', 'FPL tables', 'applicable percentage table'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists:
      'Simplified PTC estimate in federalReturn when marketplacePremium/slcsp provided; not full Form 8962 Part I–V.',
    proposedAddition:
      'Isolated module form8962.ts: monthly SLCSP/enrollment, annual contribution, excess APTC repayment, repayment limitation by household income %. Golden fixtures from Pub 974 / Form 8962 instructions.',
    blockedBy: ['Missing 1095-A monthly breakdown in TaxpayerProfile'],
    approvalRequired: true,
  },
  {
    id: 'form-8995a',
    form: 'Form 8995-A',
    title: 'QBI deduction — complex (SSTB, UBIA, W-2 wage limit)',
    status: 'partial',
    dependsOn: ['Schedule C/E/K-1 QBI', 'W-2 wages', 'UBIA', 'taxable income before QBI'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Form 8995 simplified 20% QBI with taxable-income limit; no SSTB phase-in or wage/UBIA limits.',
    proposedAddition:
      'Isolated form8995A.ts with Component 1–3 worksheets; leave benefitOptimizer untouched. Gate behind dual-run only.',
    blockedBy: ['No W-2 wage / UBIA inputs on profile'],
    approvalRequired: true,
  },
  {
    id: 'form-8863',
    form: 'Form 8863',
    title: 'Education credits (AOTC / LLC)',
    status: 'unsupported',
    dependsOn: ['Form 1098-T', 'qualified expenses', 'student eligibility'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'No Form 8863 computation in IRS engine.',
    proposedAddition:
      'Isolated educationCredits.ts + Form 8863 worksheet stubs; AOTC refundable 40% / LLC nonrefundable. Do not claim complete until golden fixtures from Form 8863 instructions exist.',
    blockedBy: ['No education expense fields in IRS input'],
    approvalRequired: true,
  },
  {
    id: 'schedule-b',
    form: 'Schedule B',
    title: 'Interest and Ordinary Dividends',
    status: 'unsupported',
    dependsOn: ['1099-INT', '1099-DIV', 'foreign accounts questions'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Interest/dividends may fold into otherIncome in demo profile only.',
    proposedAddition: 'scheduleB.ts aggregating interest/dividends; Part III foreign account flags as data only.',
    blockedBy: ['Structured interest/dividend lines not on IrsTaxpayerInput'],
    approvalRequired: true,
  },
  {
    id: 'schedule-d',
    form: 'Schedule D',
    title: 'Capital Gains and Losses',
    status: 'unsupported',
    dependsOn: ['Form 8949', '1099-B', 'carryovers', 'qualified dividends/LTCG worksheet'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'No Schedule D / qualified dividends tax worksheet in IRS engine.',
    proposedAddition:
      'Isolated scheduleD.ts + QD/LTCG worksheet; do not mark complete without IRS Worksheet comparison fixtures.',
    blockedBy: ['No capital gain detail inputs'],
    approvalRequired: true,
  },
  {
    id: 'schedule-e',
    form: 'Schedule E',
    title: 'Supplemental Income and Loss (rental, royalty, K-1)',
    status: 'unsupported',
    dependsOn: ['Rental worksheets', 'K-1 boxes', 'passive activity rules'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'No Schedule E module.',
    proposedAddition: 'scheduleE.ts stub for rental net + K-1 ordinary; passive loss limitation flagged unsupported.',
    blockedBy: ['No rental/K-1 structured input'],
    approvalRequired: true,
  },
  {
    id: 'form-1040-extra',
    form: 'Form 1040',
    title: 'Additional 1040 lines (NIIT, AMT, additional Medicare, household employment, etc.)',
    status: 'partial',
    dependsOn: ['Form 8959', 'Form 8960', 'Form 6251', 'Schedule H'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists:
      'Core AGI → taxable income → tax → CTC/ACTC/EITC/CDCC/PTC estimate → SE tax → refund/balance.',
    proposedAddition:
      'Separate stubs: form8959, form8960, form6251 — each marked unsupported until golden fixtures exist. Do not pretend complete.',
    blockedBy: ['Scope / tables for AMT and NIIT'],
    approvalRequired: true,
  },
  {
    id: 'amended-recalc',
    form: 'Form 1040-X',
    title: 'Amended return recalculation',
    status: 'stub_proposed',
    dependsOn: ['Original return snapshot', 'corrected lines', 'IRS engine'],
    taxYears: [2022, 2023, 2024, 2025],
    whatExists: 'Amendments UI/module exists for workflow; not recalculated by IRS golden engine.',
    proposedAddition:
      'amendedRecalc.ts: diff original vs corrected IrsTaxpayerInput through computeIrsFederalReturn; produce 1040-X column A/B/C deltas. Keep amendments UI; only wire after dual-run approval.',
    blockedBy: ['Engine cutover not approved', 'Protected amendments module'],
    approvalRequired: true,
  },
]

/** Human-readable inventory for Phase 3 report. */
export function formatGapInventory(): string {
  return CALCULATION_GAPS.map(
    (g) =>
      `[${g.status}] ${g.form}: ${g.title}\n  Exists: ${g.whatExists}\n  Propose: ${g.proposedAddition}\n  Approval: ${g.approvalRequired ? 'REQUIRED before protected-module changes' : 'n/a'}`,
  ).join('\n\n')
}

export function gapsNeedingApproval(): CalculationGap[] {
  return CALCULATION_GAPS.filter((g) => g.approvalRequired)
}
