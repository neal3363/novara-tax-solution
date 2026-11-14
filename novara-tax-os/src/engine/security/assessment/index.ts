/**
 * Independent security assessment readiness package.
 * Automated internal scans ≠ independent pentest.
 */

export {
  pub4557AndFtcSafeguardControls,
  controlsBlockingIndependentAssessmentClaim,
  INDEPENDENT_TEST_DISCLAIMER,
} from './pub4557FtcSafeguards'
export type { ControlStatus, SafeguardControl } from './pub4557FtcSafeguards'

export {
  recommendedExternalPentestFirms,
  estimatedAppsecBudgetUsd,
} from './externalFirms'
export type { ExternalPentestFirm } from './externalFirms'

export {
  sensitiveDataProtectionRules,
  assertNoSensitiveInBrowserLocalAsSystemOfRecord,
} from './sensitiveDataProtection'
export type { SensitiveClass, SensitiveDataRule } from './sensitiveDataProtection'

import { INDEPENDENT_TEST_DISCLAIMER, pub4557AndFtcSafeguardControls } from './pub4557FtcSafeguards'
import { estimatedAppsecBudgetUsd, recommendedExternalPentestFirms } from './externalFirms'
import { assertNoSensitiveInBrowserLocalAsSystemOfRecord } from './sensitiveDataProtection'

export interface AssessmentReadinessReport {
  independentPentestComplete: false
  internalScansSubstituteForIndependent: false
  disclaimer: string
  controlCounts: Record<string, number>
  firmShortlistCount: number
  budget: ReturnType<typeof estimatedAppsecBudgetUsd>
  sensitiveBrowserLocalOk: boolean
}

export function buildAssessmentReadinessReport(): AssessmentReadinessReport {
  const controls = pub4557AndFtcSafeguardControls()
  const controlCounts: Record<string, number> = {}
  for (const c of controls) {
    controlCounts[c.status] = (controlCounts[c.status] ?? 0) + 1
  }
  return {
    independentPentestComplete: false,
    internalScansSubstituteForIndependent: false,
    disclaimer: INDEPENDENT_TEST_DISCLAIMER,
    controlCounts,
    firmShortlistCount: recommendedExternalPentestFirms().length,
    budget: estimatedAppsecBudgetUsd(),
    sensitiveBrowserLocalOk: assertNoSensitiveInBrowserLocalAsSystemOfRecord().ok,
  }
}
