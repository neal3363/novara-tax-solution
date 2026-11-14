/**
 * Migration plan ONLY — how the verified IRS engine could supply accurate
 * calculations to the AI Refund Maximizer without removing tax-benefit discovery.
 *
 * Do NOT change benefitOptimizer interface, question flow, or behavior in Phase 3.
 */

export interface MigrationStep {
  order: number
  id: string
  title: string
  description: string
  touchesMaximizer: boolean
  requiresApproval: boolean
  status: 'planned' | 'blocked' | 'done_phase3'
}

export const MAXIMIZER_MIGRATION_STEPS: MigrationStep[] = [
  {
    order: 1,
    id: 'golden-pass',
    title: 'Pass IRS golden suite for TY2022–2025 core return',
    description:
      'All golden fixtures for AGI, taxable income, income tax, SE tax, CTC/ACTC/EITC/CDCC must pass within tolerance before any Maximizer wiring.',
    touchesMaximizer: false,
    requiresApproval: false,
    status: 'done_phase3',
  },
  {
    order: 2,
    id: 'dual-run-internal',
    title: 'Internal dual-run on synthetic profiles',
    description:
      'Feature flag runs demo benefitOptimizer and IRS engine in parallel; difference reports for ops/QA only. Taxpayer UI unchanged.',
    touchesMaximizer: false,
    requiresApproval: false,
    status: 'done_phase3',
  },
  {
    order: 3,
    id: 'gap-forms',
    title: 'Close critical form gaps (8962, 8995-A, 8863, Schedules B/D/E as needed)',
    description:
      'Implement isolated modules with independent golden fixtures. Do not mark complete without IRS source verification.',
    touchesMaximizer: false,
    requiresApproval: true,
    status: 'planned',
  },
  {
    order: 4,
    id: 'adapter-layer',
    title: 'Add read-only IRS adapter behind Maximizer',
    description:
      'New adapter maps TaxpayerProfile → IrsTaxpayerInput and returns verified line items. Maximizer keeps discovery/ranking of benefits; adapter supplies only arithmetic (tax, credits, refund/balance). Interface of runBenefitOptimization stays stable; optional internal field irsVerifiedNumbers when flag on.',
    touchesMaximizer: true,
    requiresApproval: true,
    status: 'blocked',
  },
  {
    order: 5,
    id: 'shadow-mode-ui',
    title: 'Staff-only shadow mode',
    description:
      'Office/admin can view dual-run deltas; taxpayer chat and Refund Maximizer UI still show demo numbers only.',
    touchesMaximizer: false,
    requiresApproval: true,
    status: 'planned',
  },
  {
    order: 6,
    id: 'parity-gate',
    title: 'Parity gate before cutover',
    description:
      'Require max |demo−IRS| within policy thresholds on golden + synthetic corpus, or document intentional demo enrichment (discovery uplift) separately from IRS liability.',
    touchesMaximizer: false,
    requiresApproval: true,
    status: 'planned',
  },
  {
    order: 7,
    id: 'cutover',
    title: 'Engine cutover (NOT Phase 3)',
    description:
      'Switch Maximizer refund arithmetic to IRS engine; preserve question flow, benefit discovery cards, and pricing. Explicit product + compliance approval required. STOP — do not execute in Phase 3.',
    touchesMaximizer: true,
    requiresApproval: true,
    status: 'blocked',
  },
]

export function maximizerMigrationSummary(): string {
  return [
    'AI Refund Maximizer: NO interface/question-flow/behavior changes in Phase 3.',
    'Future: IRS engine supplies verified AGI/tax/credits/refund; Maximizer retains benefit discovery.',
    'Steps:',
    ...MAXIMIZER_MIGRATION_STEPS.map(
      (s) =>
        `  ${s.order}. [${s.status}] ${s.title}${s.requiresApproval ? ' (approval required)' : ''}`,
    ),
  ].join('\n')
}
