/**
 * Official IRS ATS submission package — preparation only.
 * Submitting to IRS requires owner credentials and IRS e-Services access.
 * Simulated MeF acknowledgments must never be recorded as official ATS passes.
 */

import {
  ATS_DISCLAIMER,
  individualAtsScenarioCatalog,
  type AtsScenarioSpec,
} from './scenarioCatalog'
import {
  evaluateOfficialAtsReadiness,
  type OfficialAtsCredentials,
  type OfficialAtsReadiness,
} from './officialAtsGate'
import { buildAllSyntheticAtsPacks, type SyntheticAtsReturn } from './syntheticTestReturns'

export interface AtsSubmissionStep {
  id: string
  title: string
  actor: 'owner' | 'developer' | 'irs'
  blocksWithoutOwner: boolean
  detail: string
}

export function officialAtsSubmissionSteps(): AtsSubmissionStep[] {
  return [
    {
      id: 'obtain-test-etin',
      title: 'Obtain Software Developer Test ETIN + Software ID + NOVARA EFIN',
      actor: 'owner',
      blocksWithoutOwner: true,
      detail: 'IRS e-file Application; store secrets outside git',
    },
    {
      id: 'confirm-ats-window',
      title: 'Confirm MeF ATS window open for tax year (IRS.gov ATS page)',
      actor: 'owner',
      blocksWithoutOwner: true,
      detail: 'https://www.irs.gov/e-file-providers/modernized-e-file-mef-assurance-testing-system-ats',
    },
    {
      id: 'select-pub1436',
      title: 'Select Pub 1436 scenarios for Form 1040 MeF product',
      actor: 'owner',
      blocksWithoutOwner: true,
      detail: 'Map official scenario IDs into scenarioCatalog.officialPub1436Id',
    },
    {
      id: 'prepare-synthetics',
      title: 'Prepare compliant synthetic test returns offline',
      actor: 'developer',
      blocksWithoutOwner: false,
      detail: 'buildAllSyntheticAtsPacks() — TINs masked; not live transmit',
    },
    {
      id: 'schema-validate',
      title: 'Validate against IRS schema packs for the season',
      actor: 'developer',
      blocksWithoutOwner: false,
      detail: 'Requires IRS-distributed XSDs when available; structural validate meanwhile',
    },
    {
      id: 'a2a-enroll',
      title: 'Enroll A2A Application System ID if using Application-to-Application',
      actor: 'owner',
      blocksWithoutOwner: true,
      detail: 'Pub 4164 Automated Enrollment',
    },
    {
      id: 'transmit-official',
      title: 'Transmit scenarios to official IRS ATS (not mock adapter)',
      actor: 'owner',
      blocksWithoutOwner: true,
      detail: 'Use Test ETIN; record IRS ACKs with liveIrs=true, simulated=false',
    },
    {
      id: 'record-results',
      title: 'Record official accept/reject + correction cycles',
      actor: 'developer',
      blocksWithoutOwner: true,
      detail: 'atsResultsTracker — refuse mock as official pass',
    },
    {
      id: 'comms-test',
      title: 'Complete Transmitter communication test for Production ETIN',
      actor: 'owner',
      blocksWithoutOwner: true,
      detail: 'Wait for IRS Forms Transmission Status → Production',
    },
    {
      id: 'production-activation',
      title: 'Production activation only after owner + IRS approvals',
      actor: 'owner',
      blocksWithoutOwner: true,
      detail: 'See productionActivation checklist; liveProductionTransmit stays false until then',
    },
  ]
}

export interface AtsPackageSnapshot {
  disclaimer: string
  readiness: OfficialAtsReadiness
  scenarios: AtsScenarioSpec[]
  syntheticPacks: SyntheticAtsReturn[]
  steps: AtsSubmissionStep[]
  canSubmitToIrs: boolean
  officialAtsComplete: false
}

export function buildOfficialAtsSubmissionPackage(
  creds: OfficialAtsCredentials = {},
): AtsPackageSnapshot {
  const readiness = evaluateOfficialAtsReadiness(creds)
  return {
    disclaimer: ATS_DISCLAIMER,
    readiness,
    scenarios: individualAtsScenarioCatalog(),
    syntheticPacks: buildAllSyntheticAtsPacks(),
    steps: officialAtsSubmissionSteps(),
    canSubmitToIrs: readiness.canAttemptOfficialAts,
    officialAtsComplete: false,
  }
}
