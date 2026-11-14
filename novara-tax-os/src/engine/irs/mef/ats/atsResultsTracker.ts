/**
 * Tracks ATS scenario results. Mock/simulated ACKs cannot be recorded as official passes.
 */

import { assertNotMockAsOfficialAts } from './officialAtsGate'

export type AtsResultSource = 'mock_internal' | 'official_irs'

export interface AtsScenarioResult {
  scenarioId: string
  officialPub1436Id: string | null
  source: AtsResultSource
  outcome: 'accepted' | 'rejected' | 'pending' | 'error'
  ackSimulated: boolean
  liveIrs: boolean
  recordedAt: string
  notes?: string
}

const results: AtsScenarioResult[] = []

export function resetAtsResultsForTests(): void {
  results.length = 0
}

export function listAtsResults(): AtsScenarioResult[] {
  return results.map((r) => ({ ...r }))
}

export function recordAtsScenarioResult(
  input: Omit<AtsScenarioResult, 'recordedAt'> & { recordedAt?: string },
): { ok: true; result: AtsScenarioResult } | { ok: false; error: string } {
  if (input.source === 'official_irs') {
    const gate = assertNotMockAsOfficialAts({
      ackSimulated: input.ackSimulated,
      liveIrs: input.liveIrs,
      claimedOfficialAtsComplete: true,
    })
    if (!gate.ok) {
      return { ok: false, error: gate.error }
    }
    if (input.ackSimulated || !input.liveIrs) {
      return { ok: false, error: 'official_irs_source_requires_live_non_simulated_ack' }
    }
  }

  if (input.source === 'mock_internal' && input.outcome === 'accepted') {
    // Allowed to record mock accepts for developer testing — never elevates official status
  }

  const result: AtsScenarioResult = {
    ...input,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  }
  results.push(result)
  return { ok: true, result }
}

export function officialAtsPassCount(): number {
  return results.filter(
    (r) =>
      r.source === 'official_irs' &&
      r.outcome === 'accepted' &&
      r.liveIrs &&
      !r.ackSimulated,
  ).length
}

export function claimOfficialAtsComplete(): { ok: false; error: string } | { ok: true; passes: number } {
  const passes = officialAtsPassCount()
  if (passes === 0) {
    return {
      ok: false,
      error: 'no_official_irs_acceptances_recorded_mock_does_not_count',
    }
  }
  // Even with passes, production activation still requires owner + IRS Production status
  return { ok: true, passes }
}
