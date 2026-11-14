/**
 * Phase 5 — measurable engine cutover acceptance criteria.
 * A passing test suite ALONE must not trigger cutover.
 * NOT an activation switch — documentation + evaluation helpers only.
 */

export type CriterionStatus = 'not_met' | 'partial' | 'met' | 'blocked'

export interface CutoverCriterion {
  id: string
  category: string
  title: string
  measure: string
  threshold: string
  status: CriterionStatus
  evidence: string
  requiredForCutover: boolean
}

export const CUTOVER_CRITERIA: CutoverCriterion[] = [
  {
    id: 'irs-accuracy',
    category: 'Official IRS calculation accuracy',
    title: 'Golden corpus accuracy',
    measure: 'Independent golden field checks vs IRS instructions/tables',
    threshold: '≥99% field pass on required corpus; 0 critical failures on core Form 1040 lines',
    status: 'partial',
    evidence: 'Phase 5 golden suite expanding; productionReady remains false',
    requiredForCutover: true,
  },
  {
    id: 'form-coverage',
    category: 'Required form coverage',
    title: 'Required federal forms isolated-validated',
    measure: 'Forms 1040 core, 8812, 2441, SE, 8995/8995-A, 8962, 8863, B/D/E, 8582, 6251, 8960, 1040-X',
    threshold: 'All required forms isolated-validated OR explicitly waived with risk acceptance',
    status: 'partial',
    evidence: '8582/Sch E upgraded; PTP and some AMT preferences still unsupported',
    requiredForCutover: true,
  },
  {
    id: 'tax-year-isolation',
    category: 'Tax-year isolation',
    title: 'TY2022–2025 parameter isolation',
    measure: 'Year tables / phase4Params do not leak across years',
    threshold: 'Golden fixtures per year; std ded / brackets / FPL / AMT differ by year as expected',
    status: 'met',
    evidence: 'Year modules + phase4Params + golden prior-year fixtures',
    requiredForCutover: true,
  },
  {
    id: 'regression',
    category: 'Regression test results',
    title: 'Protected surface regressions green',
    measure: 'pricing, refund-max, benefits, irs-engine, irs-golden, irs-phase4/5',
    threshold: 'All required regression suites PASS on cutover candidate commit',
    status: 'partial',
    evidence: 'Suites exist; must re-run on cutover candidate',
    requiredForCutover: true,
  },
  {
    id: 'unsupported-detection',
    category: 'Unsupported-case detection',
    title: 'Unsupported situations surfaced',
    measure: 'unsupportedCases[] / readiness flags on return and form modules',
    threshold: 'Unsupported paths never silent-zero without flag; inventory reviewed',
    status: 'partial',
    evidence: 'Form 8582 PTP/conversion flags; Schedule D §1202 notes; AMT preference notes',
    requiredForCutover: true,
  },
  {
    id: 'maximizer-compat',
    category: 'AI Refund Maximizer compatibility',
    title: 'Maximizer interface preserved until adapter approved',
    measure: 'No change to Maximizer UI/question flow; optional read-only adapter behind flag',
    threshold: 'Maximizer discovery retained; IRS supplies arithmetic only after explicit approval',
    status: 'partial',
    evidence:
      'Phase 9 staging adapter + dual-run; Maximizer UX unchanged; taxpayerVisible/cutover remain false',
    requiredForCutover: true,
  },
  {
    id: 'security',
    category: 'Security readiness',
    title: 'No real taxpayer data in dual-run/shadow; authZ stubs reviewed',
    measure: 'Shadow restricted to internal testers; deny-by-default authZ stubs; no prod PII in fixtures',
    threshold: 'Security review sign-off; synthetic-only shadow corpus',
    status: 'partial',
    evidence: 'shadowTesting authorization gate; synthetic fixtures only',
    requiredForCutover: true,
  },
  {
    id: 'rollback',
    category: 'Rollback capability',
    title: 'Feature-flag rollback to demo engine',
    measure: 'Dual-run/cutover flags default OFF; single flag reverts to demo',
    threshold: 'Documented rollback runbook + flag kill-switch tested',
    status: 'partial',
    evidence: 'DEFAULT_DUAL_RUN_FLAG.enabled=false; mayShowIrsToTaxpayer()=false',
    requiredForCutover: true,
  },
  {
    id: 'human-approval',
    category: 'Governance',
    title: 'Explicit product + compliance approval',
    measure: 'Human authorization recorded; test suite pass is insufficient',
    threshold: 'Written approval from product + compliance before any taxpayer exposure',
    status: 'blocked',
    evidence: 'STOP BEFORE ENGINE CUTOVER standing order',
    requiredForCutover: true,
  },
]

export function cutoverReady(): boolean {
  return CUTOVER_CRITERIA.filter((c) => c.requiredForCutover).every((c) => c.status === 'met')
}

export function cutoverBlockingCriteria(): CutoverCriterion[] {
  return CUTOVER_CRITERIA.filter((c) => c.requiredForCutover && c.status !== 'met')
}

export function formatCutoverCriteriaReport(): string {
  const lines = [
    'CUTOVER CRITERIA (passing tests alone do NOT authorize cutover)',
    `Overall ready: ${cutoverReady() ? 'YES' : 'NO'}`,
    ...CUTOVER_CRITERIA.map(
      (c) =>
        `- [${c.status}] ${c.id}: ${c.title}\n    Threshold: ${c.threshold}\n    Evidence: ${c.evidence}`,
    ),
  ]
  return lines.join('\n')
}
