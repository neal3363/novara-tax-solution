/**
 * Official IRS Assurance Testing System (ATS) gate.
 *
 * Distinguishes:
 * - Internal / mock ATS (sandboxAdapter) — NEVER evidence of IRS ATS approval
 * - Official ATS — requires owner credentials + IRS channel; responses must be liveIrs
 *
 * Production live transmit remains blocked until MeFLiveLock + IRS Production status.
 */

import { getMefFlags } from '../config'
import type { MefCredentialBundle } from '../credentials/efinGate'

export type AtsChannel = 'mock_internal' | 'official_irs_ats' | 'production'

export interface OfficialAtsReadiness {
  channel: AtsChannel
  canAttemptOfficialAts: boolean
  canClaimOfficialAtsComplete: boolean
  blockers: string[]
  warnings: string[]
}

export interface OfficialAtsCredentials {
  /** Test ETIN assigned for Software Developer testing */
  softwareDeveloperTestEtin?: string
  /** Software Identification Number for the package under test */
  softwareId?: string
  /** EFIN on the NOVARA e-file Application */
  efin?: string
  /** Application System ID when using A2A */
  applicationSystemId?: string
  /** Owner attestation that IRS ATS window is open for the tax year */
  atsWindowOpenAttested?: boolean
  /** Owner attestation that Pub 1436 scenarios for this product are selected */
  scenarioSetAttested?: boolean
}

export function evaluateOfficialAtsReadiness(
  creds: OfficialAtsCredentials,
): OfficialAtsReadiness {
  const blockers: string[] = []
  const warnings: string[] = []
  const flags = getMefFlags()

  if (flags.liveProductionTransmit) {
    blockers.push('live_production_transmit_flag_must_stay_false_during_ats')
  }

  if (!creds.softwareDeveloperTestEtin?.trim()) {
    blockers.push('missing_software_developer_test_etin')
  }
  if (!creds.softwareId?.trim()) {
    blockers.push('missing_software_id')
  }
  if (!creds.efin?.trim()) {
    blockers.push('missing_novara_efin')
  }
  if (!creds.applicationSystemId?.trim()) {
    warnings.push('application_system_id_recommended_for_a2a')
  }
  if (!creds.atsWindowOpenAttested) {
    blockers.push('owner_must_attest_irs_ats_window_open')
  }
  if (!creds.scenarioSetAttested) {
    blockers.push('owner_must_attest_pub1436_scenario_set')
  }

  const canAttempt = blockers.length === 0
  return {
    channel: canAttempt ? 'official_irs_ats' : 'mock_internal',
    canAttemptOfficialAts: canAttempt,
    canClaimOfficialAtsComplete: false, // never auto-claim; owner + IRS records only
    blockers,
    warnings,
  }
}

/**
 * Refuse to treat a provider credential bundle as official ATS proof when
 * acknowledgments are still simulated / mock.
 */
export function assertNotMockAsOfficialAts(input: {
  ackSimulated: boolean
  liveIrs: boolean
  claimedOfficialAtsComplete: boolean
}): { ok: true } | { ok: false; error: string } {
  if (input.claimedOfficialAtsComplete && (input.ackSimulated || !input.liveIrs)) {
    return {
      ok: false,
      error: 'mock_or_simulated_ack_cannot_prove_official_ats',
    }
  }
  return { ok: true }
}

/**
 * Map provider readiness flags + owner-supplied ATS identifiers.
 * Bundle EFIN lastFour alone is never enough — Test ETIN + Software ID required.
 */
export function officialAtsFromProviderBundle(
  bundle: MefCredentialBundle,
  extras: Pick<
    OfficialAtsCredentials,
    | 'softwareDeveloperTestEtin'
    | 'softwareId'
    | 'applicationSystemId'
    | 'atsWindowOpenAttested'
    | 'scenarioSetAttested'
  >,
): OfficialAtsReadiness {
  const efinHint =
    bundle.efin?.kind === 'efin' && bundle.efin.lastFour
      ? `****${bundle.efin.lastFour}`
      : undefined
  return evaluateOfficialAtsReadiness({
    softwareDeveloperTestEtin: extras.softwareDeveloperTestEtin,
    softwareId: extras.softwareId,
    efin: efinHint,
    applicationSystemId: extras.applicationSystemId,
    atsWindowOpenAttested: extras.atsWindowOpenAttested,
    scenarioSetAttested: extras.scenarioSetAttested,
  })
}
