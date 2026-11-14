/**
 * MeF certification readiness inventory (WS5).
 * Mock/sandbox verification only — never claims IRS certification.
 */

import {
  PHASE8_MEF_VERSION,
  getMefFlags,
  assertNoLiveIrsTransmit,
  activeMefEnvironment,
  evaluateProviderReadiness,
  evaluate8879Authorization,
  SUPPORTED_MEF_TAX_YEARS,
  SUPPORTED_RETURN_TYPES,
  UNSUPPORTED_FORMS,
} from '../irs/mef'
import { defaultFilingAuthState } from '../filingAuthorizations'

export type ReadinessStatus = 'PASS' | 'PASS_STAGING' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED'

export interface MefReadinessItem {
  id: string
  title: string
  status: ReadinessStatus
  detail: string
}

/** Exact external steps Cursor cannot complete in code. */
export const MEF_EXTERNAL_CERTIFICATION_STEPS = [
  'Obtain IRS e-file provider status for NOVARA legal entity (Software Developer + Transmitter)',
  'Complete suitability checks for Principals / Responsible Officials (Pub 3112)',
  'Receive IRS-assigned NOVARA EFIN (office/preparer EFIN is insufficient)',
  'Receive Software Developer Test ETIN and Transmitter Production ETIN',
  'Register Software Identification Number(s) and complete ATS questionnaires',
  'Enroll A2A Application System IDs when using Application-to-Application (Pub 4164)',
  'Execute official IRS ATS per Pub 1436 with IRS-issued credentials (mock ACKs ≠ approval)',
  'Obtain production MeF schema packs / XSD validation tooling from IRS',
  'Complete Transmitter communication test; wait for IRS Production transmission status',
  'Complete PTIN verification for preparers where required (separate from Transmitter ETIN)',
  'Pass applicable state e-file approvals separately from federal MeF',
  'Receive human launch authorization after ATS acceptances documented',
] as const

export function buildMefReadinessChecklist(): MefReadinessItem[] {
  assertNoLiveIrsTransmit()
  const f = getMefFlags()
  const env = activeMefEnvironment()

  const emptyReady = evaluateProviderReadiness({
    transmitter: { etinConfigured: false, certificateConfigured: false },
    irsAtsTestingCompleted: false,
    preparerPath: true,
  })

  const authz = evaluate8879Authorization({
    filingAuth: defaultFilingAuthState({ spouseRequired: false }),
    returnContentHash: 'synthetic-hash-unsigned',
  })

  return [
    {
      id: 'mef-version',
      title: 'Phase 8 MeF module present',
      status: 'PASS_STAGING',
      detail: `version=${PHASE8_MEF_VERSION}`,
    },
    {
      id: 'mef-live-off',
      title: 'Live IRS transmission OFF',
      status: f.liveProductionTransmit === false ? 'PASS' : 'FAIL',
      detail: `liveProductionTransmit=${f.liveProductionTransmit}`,
    },
    {
      id: 'mef-env-mock',
      title: 'Active environment is mock/dev (not production)',
      status: env === 'ats_mock' || env === 'development' ? 'PASS' : env === 'irs_ats' ? 'BLOCKED' : 'FAIL',
      detail: `env=${env}; officialIrsAtsEnabled=${f.officialIrsAtsEnabled}`,
    },
    {
      id: 'mef-schema-years',
      title: 'Applicable tax-year schema stubs present',
      status: 'PASS_STAGING',
      detail: `years=${SUPPORTED_MEF_TAX_YEARS.join(',')}; full IRS XSD compile NOT claimed`,
    },
    {
      id: 'mef-return-types',
      title: 'Supported vs unsupported return types gated',
      status: 'PASS_STAGING',
      detail: `supported=${SUPPORTED_RETURN_TYPES.join(',')}; blocked includes ${UNSUPPORTED_FORMS.slice(0, 3).join(',')}`,
    },
    {
      id: 'mef-8879',
      title: 'Form 8879 authorization gate',
      status: authz.authorized ? 'FAIL' : 'PASS_STAGING',
      detail: authz.authorized
        ? 'UNEXPECTED: unauthorized 8879 allowed'
        : 'Unsigned/incomplete 8879 correctly blocked',
    },
    {
      id: 'mef-efin-gate',
      title: 'EFIN/PTIN readiness gate (format ≠ verification)',
      status: emptyReady.ready ? 'FAIL' : 'PASS_STAGING',
      detail: emptyReady.ready
        ? 'UNEXPECTED: empty credentials marked ready'
        : `blockers=${emptyReady.blockers.length}; entry alone never authorizes`,
    },
    {
      id: 'mef-official-ats',
      title: 'Official IRS ATS testing',
      status: 'BLOCKED',
      detail: 'Mock ATS only — official ATS credentials and acceptance evidence required',
    },
    {
      id: 'mef-certification-claim',
      title: 'IRS certification claim',
      status: 'BLOCKED',
      detail: 'Must not claim IRS certification based on mock tests',
    },
  ]
}

export function mefReadinessSummary(): {
  items: MefReadinessItem[]
  liveTransmit: false
  officialAts: boolean
  certified: false
  externalSteps: readonly string[]
} {
  const items = buildMefReadinessChecklist()
  return {
    items,
    liveTransmit: false,
    officialAts: getMefFlags().officialIrsAtsEnabled,
    certified: false,
    externalSteps: MEF_EXTERNAL_CERTIFICATION_STEPS,
  }
}
