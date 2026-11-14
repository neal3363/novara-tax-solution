/**
 * Internal shadow testing — demo vs IRS dual-run for authorized internal testers only.
 * NEVER exposes IRS results to taxpayers.
 */

import { defaultProfile, type TaxpayerProfile } from '../benefitOptimizer'
import { sampleProfilesForComparison } from './compareDemo'
import {
  getDualRunFlag,
  mayShowIrsToTaxpayer,
  resetDualRunFlag,
  runDualComparison,
  setDualRunFlagForTests,
  type DualRunReport,
} from './dualRun'
import { computeIrsFederalReturn } from './federalReturn'
import type { IrsReturnInput } from './types'

export type ShadowTesterRole = 'internal_qa' | 'internal_eng' | 'internal_tax'

export interface ShadowTester {
  id: string
  role: ShadowTesterRole
  authorized: true
}

/** Hard-coded authorization gate — not a production ACL. */
const AUTHORIZED_INTERNAL_TESTERS: ShadowTester[] = [
  { id: 'qa-shadow-1', role: 'internal_qa', authorized: true },
  { id: 'eng-shadow-1', role: 'internal_eng', authorized: true },
  { id: 'tax-shadow-1', role: 'internal_tax', authorized: true },
]

export function isAuthorizedShadowTester(testerId: string): boolean {
  return AUTHORIZED_INTERNAL_TESTERS.some((t) => t.id === testerId && t.authorized)
}

export interface ShadowDiffCause {
  field: string
  demo: number | null
  irs: number | null
  delta: number | null
  likelyCause: string
}

export interface ShadowRunResult {
  testerId: string
  authorized: true
  taxpayerVisible: false
  audience: 'internal_only'
  reports: DualRunReport[]
  causes: ShadowDiffCause[]
  summary: string
}

function classifyCause(field: string, delta: number | null): string {
  if (delta == null || delta === 0) return 'aligned or not comparable'
  if (field.includes('credit') || field === 'ctc' || field === 'actc' || field === 'eitc') {
    return 'Demo benefit-discovery credits vs IRS Sch 8812/EITC/Form credit worksheets'
  }
  if (field.includes('refund') || field.includes('final')) {
    return 'Aggregate of tax/credit/SE model differences between demo optimizer and IRS engine'
  }
  if (field === 'agi' || field === 'taxable_income') {
    return 'Demo may omit Schedule B/D/E/8582 lines present in IRS path (or vice versa)'
  }
  return 'Engine model divergence (demo heuristic vs IRS isolated worksheets)'
}

/**
 * Run shadow dual-run corpus. Throws if tester unauthorized.
 * Does not mutate taxpayer UI; mayShowIrsToTaxpayer remains false.
 */
export function runInternalShadowSuite(
  testerId: string,
  extraProfiles: { label: string; profile: TaxpayerProfile }[] = [],
): ShadowRunResult {
  if (!isAuthorizedShadowTester(testerId)) {
    throw new Error('Shadow testing restricted to authorized internal testers')
  }
  if (mayShowIrsToTaxpayer() !== false) {
    throw new Error('Invariant violated: IRS must not be taxpayer-visible')
  }

  setDualRunFlagForTests({ enabled: true, verbose: true })
  const profiles = [...sampleProfilesForComparison(), ...extraProfiles]
  if (profiles.length === 0) {
    profiles.push({ label: 'default', profile: defaultProfile() })
  }

  const reports: DualRunReport[] = []
  const causes: ShadowDiffCause[] = []

  for (const p of profiles) {
    const report = runDualComparison(p.profile, p.label)
    if (!report) continue
    reports.push(report)
    for (const d of report.diffs) {
      if (d.delta != null && d.delta !== 0) {
        causes.push({
          field: `${p.label}::${d.field}`,
          demo: typeof d.demo === 'number' ? d.demo : null,
          irs: typeof d.irs === 'number' ? d.irs : null,
          delta: d.delta,
          likelyCause: classifyCause(d.field, d.delta),
        })
      }
    }
  }

  resetDualRunFlag()

  return {
    testerId,
    authorized: true,
    taxpayerVisible: false,
    audience: 'internal_only',
    reports,
    causes,
    summary: `Internal shadow suite for ${testerId}: ${reports.length} profiles, ${causes.length} nonzero deltas. Flag=${JSON.stringify(getDualRunFlag())}. Taxpayer visible=false.`,
  }
}

/** Compare a synthetic IRS-only scenario pair (not demo) for line diagnostics. */
export function shadowCompareIrsInputs(
  testerId: string,
  label: string,
  a: IrsReturnInput,
  b: IrsReturnInput,
): { label: string; deltaAgi: number; deltaTax: number; deltaRefund: number } {
  if (!isAuthorizedShadowTester(testerId)) {
    throw new Error('Shadow testing restricted to authorized internal testers')
  }
  const ra = computeIrsFederalReturn(a)
  const rb = computeIrsFederalReturn(b)
  return {
    label,
    deltaAgi: rb.agi - ra.agi,
    deltaTax: rb.incomeTaxBeforeCredits - ra.incomeTaxBeforeCredits,
    deltaRefund: rb.refundOrBalanceDue - ra.refundOrBalanceDue,
  }
}

export function listAuthorizedShadowTesters(): ShadowTester[] {
  return [...AUTHORIZED_INTERNAL_TESTERS]
}
