/**
 * IRS acknowledgment processing (mock ATS responses).
 * Simulated acknowledgments are always labeled — never presented as live IRS ACKs.
 */

import { interpretRejectCodes } from './rejectCodes'
import type { MefAcknowledgment, MefAckSource, MefFilingStatus } from '../types'

export interface RawAckPayload {
  submissionId: string
  status: 'acknowledged' | 'accepted' | 'rejected'
  rejectionCodes?: string[]
  /** Must be set — prevents accidental promotion to live IRS */
  ackSource: MefAckSource
  rawXml?: string
}

export function parseAcknowledgment(raw: RawAckPayload): MefAcknowledgment {
  if (raw.ackSource === 'irs_production_blocked') {
    throw new Error('production_ack_blocked')
  }
  const codes = raw.rejectionCodes ?? []
  const infos = interpretRejectCodes(codes)
  const simulated = raw.ackSource === 'simulated'
  return {
    submissionId: raw.submissionId,
    ackSource: raw.ackSource,
    status: raw.status,
    receivedAt: new Date().toISOString(),
    rejectionCodes: codes,
    rejectionMessages: infos.map((i) => i.message),
    rawSnippet: (raw.rawXml ?? `<Ack status="${raw.status}" source="${raw.ackSource}"/>`).slice(0, 500),
    simulated,
  }
}

export function filingStatusFromAck(ack: MefAcknowledgment): MefFilingStatus {
  if (ack.status === 'rejected') return 'rejected'
  if (ack.status === 'accepted') return 'accepted'
  return 'acknowledged'
}

/** Build a mock ATS ACK XML snippet for tests. */
export function buildMockAckXml(input: {
  submissionId: string
  status: 'acknowledged' | 'accepted' | 'rejected'
  rejectionCodes?: string[]
}): string {
  const rejects = (input.rejectionCodes ?? [])
    .map((c) => `<ErrorCode>${c}</ErrorCode>`)
    .join('')
  return `<?xml version="1.0"?><Acknowledgement source="simulated"><SubmissionId>${input.submissionId}</SubmissionId><Status>${input.status}</Status>${rejects}</Acknowledgement>`
}
