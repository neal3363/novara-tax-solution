/**
 * Mock IRS ATS transmitter.
 * Live production transmission is hard-blocked.
 */

import { activeMefEnvironment, assertNoLiveIrsTransmit, getMefFlags } from '../config'
import { buildMockAckXml, parseAcknowledgment } from '../ack/parseAck'
import type { MefAcknowledgment, MefSubmissionRecord } from '../types'

export type TransmitterMode = 'online' | 'unavailable'

let mode: TransmitterMode = 'online'
const transmittedHashes = new Map<string, string>() // contentHash -> submissionId

export function resetTransmitterForTests(): void {
  mode = 'online'
  transmittedHashes.clear()
}

export function setTransmitterMode(next: TransmitterMode): void {
  mode = next
}

export function getTransmitterMode(): TransmitterMode {
  return mode
}

export function findDuplicateSubmission(contentHash: string): string | undefined {
  return transmittedHashes.get(contentHash)
}

export function rememberTransmission(contentHash: string, submissionId: string): void {
  transmittedHashes.set(contentHash, submissionId)
}

export interface SandboxTransmitInput {
  submission: MefSubmissionRecord
  forceRejectCodes?: string[]
  forceAccept?: boolean
}

export function sandboxTransmit(input: SandboxTransmitInput): {
  ok: boolean
  ack?: MefAcknowledgment
  error?: string
} {
  assertNoLiveIrsTransmit()
  const flags = getMefFlags()
  if (flags.liveProductionTransmit) {
    return { ok: false, error: 'live_production_blocked' }
  }
  if (mode === 'unavailable') {
    return { ok: false, error: 'transmitter_unavailable' }
  }
  if (!flags.mockAtsEnabled && !flags.officialIrsAtsEnabled) {
    return { ok: false, error: 'no_transmitter_configured' }
  }
  if (flags.officialIrsAtsEnabled && !flags.mockAtsEnabled) {
    // Official ATS path requires out-of-band credentials — not available here
    return { ok: false, error: 'official_irs_ats_not_configured' }
  }

  const env = activeMefEnvironment()
  if (env === 'production_blocked') {
    return { ok: false, error: 'production_blocked' }
  }

  const reject = input.forceRejectCodes && input.forceRejectCodes.length > 0
  const status = reject ? 'rejected' : input.forceAccept === false ? 'acknowledged' : 'accepted'
  const ack = parseAcknowledgment({
    submissionId: input.submission.submissionId,
    status,
    rejectionCodes: input.forceRejectCodes,
    ackSource: 'simulated',
    rawXml: buildMockAckXml({
      submissionId: input.submission.submissionId,
      status,
      rejectionCodes: input.forceRejectCodes,
    }),
  })
  rememberTransmission(input.submission.xmlContentHash, input.submission.submissionId)
  return { ok: true, ack }
}
