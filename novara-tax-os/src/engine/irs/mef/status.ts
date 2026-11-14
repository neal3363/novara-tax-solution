/**
 * Filing status tracking — distinguishes simulated events from IRS acknowledgments.
 */

import type { MefAckSource, MefFilingStatus, MefSubmissionRecord } from './types'

export const MEF_FILING_STATUS_LABELS: Record<MefFilingStatus, string> = {
  ready_for_review: 'Ready for review',
  awaiting_taxpayer_authorization: 'Awaiting taxpayer authorization',
  ready_for_transmission: 'Ready for transmission',
  submitted_to_test_environment: 'Submitted to test environment',
  acknowledged: 'Acknowledged',
  accepted: 'Accepted',
  rejected: 'Rejected',
  correction_required: 'Correction required',
}

export function describeFilingStatus(rec: MefSubmissionRecord): {
  status: MefFilingStatus
  label: string
  ackSource: MefAckSource
  simulated: boolean
  liveIrs: false
  note: string
} {
  const simulated = rec.simulated || rec.ackSource === 'simulated'
  return {
    status: rec.status,
    label: MEF_FILING_STATUS_LABELS[rec.status],
    ackSource: rec.ackSource,
    simulated,
    liveIrs: false,
    note: simulated
      ? 'Event is SIMULATED — not an actual IRS acknowledgment.'
      : rec.ackSource === 'irs_ats'
        ? 'Acknowledgment from IRS ATS test environment (not production).'
        : 'Production IRS acknowledgments are blocked in Phase 8.',
  }
}

export function nextStatusAfterTransmit(): MefFilingStatus {
  return 'submitted_to_test_environment'
}

export function statusAfterRejection(): MefFilingStatus {
  return 'correction_required'
}

export function canTransmitFromStatus(status: MefFilingStatus): boolean {
  return status === 'ready_for_transmission' || status === 'correction_required'
}
