/**
 * Phase 8 IRS MeF flags.
 * Live IRS transmission and production e-file remain OFF until separately approved.
 */

export const PHASE8_MEF_VERSION = 'phase8-mef-2025.1'

export type MefEnvironment = 'development' | 'ats_mock' | 'irs_ats' | 'production_blocked'

export interface Phase8MefFlags {
  /** Enable isolated MeF package operations (sandbox/mock) */
  mefPackageEnabled: boolean
  /** Use mock ATS transmitter (default true) */
  mockAtsEnabled: boolean
  /** Official IRS ATS — requires approved credentials; default false */
  officialIrsAtsEnabled: boolean
  /** HARD STOP — must remain false */
  liveProductionTransmit: false
  /** Do not activate new IRS calc engine cutover from MeF */
  activateIrsCalcEngine: false
}

export const DEFAULT_PHASE8_MEF_FLAGS: Phase8MefFlags = {
  mefPackageEnabled: true,
  mockAtsEnabled: true,
  officialIrsAtsEnabled: false,
  liveProductionTransmit: false,
  activateIrsCalcEngine: false,
}

let flags: Phase8MefFlags = { ...DEFAULT_PHASE8_MEF_FLAGS }

export function getMefFlags(): Phase8MefFlags {
  return { ...flags }
}

export function setMefFlagsForTests(patch: Partial<Phase8MefFlags>): Phase8MefFlags {
  const next = { ...flags, ...patch }
  next.liveProductionTransmit = false
  next.activateIrsCalcEngine = false
  flags = next
  return getMefFlags()
}

export function resetMefFlags(): void {
  flags = { ...DEFAULT_PHASE8_MEF_FLAGS }
}

export function assertNoLiveIrsTransmit(): void {
  if (flags.liveProductionTransmit) {
    throw new Error('Phase 8 STOP: liveProductionTransmit must remain false')
  }
}

export function activeMefEnvironment(): MefEnvironment {
  if (flags.liveProductionTransmit) return 'production_blocked'
  if (flags.officialIrsAtsEnabled) return 'irs_ats'
  if (flags.mockAtsEnabled) return 'ats_mock'
  return 'development'
}
