/**
 * MeF filing pipeline — compose → validate → authorize → readiness → transmit → ACK.
 * STOP before production IRS transmission.
 */

import { assertNoLiveIrsTransmit, activeMefEnvironment, getMefFlags, PHASE8_MEF_VERSION } from './config'
import { composeReturnXml } from './xml/compose'
import { validateComposedXml, validateReturnPayload } from './xml/validate'
import { evaluateProviderReadiness, type MefCredentialBundle } from './credentials/efinGate'
import { assertAuthorizedToTransmit, evaluate8879Authorization } from './form8879/bridge'
import { appendMefLog } from './logging'
import {
  describeFilingStatus,
  nextStatusAfterTransmit,
  statusAfterRejection,
} from './status'
import { filingStatusFromAck } from './ack/parseAck'
import { interpretRejectCodes } from './ack/rejectCodes'
import {
  findDuplicateSubmission,
  sandboxTransmit,
  setTransmitterMode,
  getTransmitterMode,
} from './transmitter/sandboxAdapter'
import type {
  Mef8879Authorization,
  MefFilingStatus,
  MefProviderReadiness,
  MefSubmissionRecord,
  MefSyntheticReturn,
  MefTransmitResult,
  MefValidationResult,
  MefXmlDocument,
} from './types'
import type { FilingAuthState } from '../../filingAuthorizations'

const submissions = new Map<string, MefSubmissionRecord>()
let idSeq = 0

function newSubmissionId(): string {
  return `MEF-TEST-${Date.now()}-${++idSeq}`
}

export function resetMefPipelineForTests(): void {
  submissions.clear()
  idSeq = 0
}

export function listSubmissions(): MefSubmissionRecord[] {
  return [...submissions.values()].map((s) => ({ ...s, rejectionCodes: [...s.rejectionCodes] }))
}

export function getSubmission(id: string): MefSubmissionRecord | undefined {
  const s = submissions.get(id)
  return s ? { ...s, rejectionCodes: [...s.rejectionCodes] } : undefined
}

export function createDraftSubmission(ret: MefSyntheticReturn): MefSubmissionRecord {
  assertNoLiveIrsTransmit()
  const now = new Date().toISOString()
  const rec: MefSubmissionRecord = {
    submissionId: newSubmissionId(),
    localId: ret.submissionLocalId,
    taxYear: ret.taxYear,
    returnType: ret.returnType,
    status: 'ready_for_review',
    environment: activeMefEnvironment(),
    ackSource: 'simulated',
    xmlContentHash: '',
    tenantId: ret.tenantId,
    ownerId: ret.ownerId,
    officeId: ret.officeId,
    createdAt: now,
    updatedAt: now,
    rejectionCodes: [],
    simulated: true,
    liveIrs: false,
  }
  submissions.set(rec.submissionId, rec)
  return getSubmission(rec.submissionId)!
}

export function setSubmissionStatus(submissionId: string, status: MefFilingStatus): MefSubmissionRecord {
  const rec = submissions.get(submissionId)
  if (!rec) throw new Error('submission_not_found')
  rec.status = status
  rec.updatedAt = new Date().toISOString()
  submissions.set(submissionId, rec)
  return getSubmission(submissionId)!
}

export function prepareForTransmission(input: {
  ret: MefSyntheticReturn
  filingAuth: FilingAuthState
  credentials: MefCredentialBundle
  actorId: string
  forceStatus?: MefFilingStatus
}): {
  submission: MefSubmissionRecord
  xml: MefXmlDocument
  validation: MefValidationResult
  authorization: Mef8879Authorization
  readiness: MefProviderReadiness
  ready: boolean
  blockers: string[]
} {
  assertNoLiveIrsTransmit()
  const submission = createDraftSubmission(input.ret)
  if (input.forceStatus) setSubmissionStatus(submission.submissionId, input.forceStatus)

  const payloadValidation = validateReturnPayload(input.ret)
  appendMefLog({
    action: 'validate',
    tenantId: input.ret.tenantId,
    actorId: input.actorId,
    outcome: payloadValidation.ok ? 'success' : 'error',
    submissionId: submission.submissionId,
    meta: { issueCount: payloadValidation.issues.length },
  })

  let xml: MefXmlDocument
  try {
    xml = composeReturnXml(input.ret)
    appendMefLog({
      action: 'compose',
      tenantId: input.ret.tenantId,
      actorId: input.actorId,
      outcome: 'success',
      submissionId: submission.submissionId,
      meta: { schemaVersion: xml.schemaVersion, contentHash: xml.contentHash },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    appendMefLog({
      action: 'compose',
      tenantId: input.ret.tenantId,
      actorId: input.actorId,
      outcome: 'error',
      submissionId: submission.submissionId,
      meta: { error: msg },
    })
    throw e
  }

  const validation = validateComposedXml(xml, input.ret)
  const authorization = evaluate8879Authorization({
    filingAuth: input.filingAuth,
    returnContentHash: xml.contentHash,
  })
  appendMefLog({
    action: 'authorization_check',
    tenantId: input.ret.tenantId,
    actorId: input.actorId,
    outcome: authorization.authorized ? 'success' : 'denied',
    submissionId: submission.submissionId,
    meta: { missing: authorization.missingReasons.length },
  })

  const readiness = evaluateProviderReadiness(input.credentials)
  appendMefLog({
    action: 'readiness_check',
    tenantId: input.ret.tenantId,
    actorId: input.actorId,
    outcome: readiness.ready ? 'success' : 'denied',
    submissionId: submission.submissionId,
    meta: {
      efinVerified: readiness.efinIrsVerified,
      efinEntryIsNotIrsAuthorization: true,
      blockerCount: readiness.blockers.length,
    },
  })

  const blockers: string[] = []
  if (!validation.ok) blockers.push(...validation.issues.filter((i) => i.severity === 'error').map((i) => i.code))
  if (!authorization.authorized) blockers.push('missing_taxpayer_authorization')
  if (!readiness.ready) blockers.push(...readiness.blockers)

  const rec = submissions.get(submission.submissionId)!
  rec.xmlContentHash = xml.contentHash
  rec.efinLastFour = input.credentials.efin?.lastFour
  if (!authorization.authorized) {
    rec.status = 'awaiting_taxpayer_authorization'
  } else if (blockers.length === 0) {
    rec.status = 'ready_for_transmission'
  } else {
    rec.status = 'ready_for_review'
  }
  rec.updatedAt = new Date().toISOString()
  submissions.set(rec.submissionId, rec)

  return {
    submission: getSubmission(submission.submissionId)!,
    xml,
    validation,
    authorization,
    readiness,
    ready: blockers.length === 0,
    blockers,
  }
}

export function transmitPrepared(input: {
  submissionId: string
  ret: MefSyntheticReturn
  filingAuth: FilingAuthState
  credentials: MefCredentialBundle
  actorId: string
  xml: MefXmlDocument
  forceRejectCodes?: string[]
}): MefTransmitResult {
  assertNoLiveIrsTransmit()
  const flags = getMefFlags()
  if (flags.liveProductionTransmit) {
    return { ok: false, error: 'live_production_blocked', blockedBy: ['live_production_blocked'] }
  }

  const rec = submissions.get(input.submissionId)
  if (!rec) return { ok: false, error: 'submission_not_found' }

  // Duplicate / replay checks before status gate so already-sent returns are explicit.
  if (rec.transmittedAt) {
    appendMefLog({
      action: 'duplicate_blocked',
      tenantId: rec.tenantId,
      actorId: input.actorId,
      outcome: 'denied',
      submissionId: rec.submissionId,
      meta: { reason: 'already_transmitted' },
    })
    return { ok: false, error: 'duplicate_transmission', blockedBy: ['already_transmitted'] }
  }

  const dup = findDuplicateSubmission(input.xml.contentHash)
  if (dup && dup !== rec.submissionId) {
    rec.duplicateOfSubmissionId = dup
    rec.updatedAt = new Date().toISOString()
    submissions.set(rec.submissionId, rec)
    appendMefLog({
      action: 'duplicate_blocked',
      tenantId: rec.tenantId,
      actorId: input.actorId,
      outcome: 'denied',
      submissionId: rec.submissionId,
      meta: { duplicateOf: dup },
    })
    return { ok: false, error: 'duplicate_transmission', blockedBy: [`duplicate_of:${dup}`] }
  }

  if (rec.status !== 'ready_for_transmission' && rec.status !== 'correction_required') {
    appendMefLog({
      action: 'transmit_blocked',
      tenantId: rec.tenantId,
      actorId: input.actorId,
      outcome: 'denied',
      submissionId: rec.submissionId,
      meta: { status: rec.status },
    })
    return { ok: false, error: 'not_ready_for_transmission', blockedBy: [`status:${rec.status}`] }
  }

  const auth = evaluate8879Authorization({
    filingAuth: input.filingAuth,
    returnContentHash: input.xml.contentHash,
  })
  try {
    assertAuthorizedToTransmit(auth)
  } catch {
    appendMefLog({
      action: 'transmit_blocked',
      tenantId: rec.tenantId,
      actorId: input.actorId,
      outcome: 'denied',
      submissionId: rec.submissionId,
      meta: { reason: 'missing_taxpayer_authorization' },
    })
    return { ok: false, error: 'missing_taxpayer_authorization', blockedBy: auth.missingReasons }
  }

  const readiness = evaluateProviderReadiness(input.credentials)
  if (!readiness.ready) {
    appendMefLog({
      action: 'transmit_blocked',
      tenantId: rec.tenantId,
      actorId: input.actorId,
      outcome: 'denied',
      submissionId: rec.submissionId,
      meta: { reason: 'provider_not_ready', blockerCount: readiness.blockers.length },
    })
    return { ok: false, error: 'invalid_efin_credentials', blockedBy: readiness.blockers }
  }

  appendMefLog({
    action: 'transmit_attempt',
    tenantId: rec.tenantId,
    actorId: input.actorId,
    outcome: 'success',
    submissionId: rec.submissionId,
    meta: { environment: activeMefEnvironment(), mode: getTransmitterMode() },
  })

  const result = sandboxTransmit({
    submission: rec,
    forceRejectCodes: input.forceRejectCodes,
  })

  if (!result.ok) {
    appendMefLog({
      action: result.error === 'transmitter_unavailable' ? 'outage' : 'transmit_blocked',
      tenantId: rec.tenantId,
      actorId: input.actorId,
      outcome: 'error',
      submissionId: rec.submissionId,
      meta: { error: result.error ?? 'unknown' },
    })
    return { ok: false, error: result.error, blockedBy: [result.error ?? 'transmit_failed'] }
  }

  const ack = result.ack!
  const now = new Date().toISOString()
  rec.status = nextStatusAfterTransmit()
  rec.transmittedAt = now
  rec.acknowledgedAt = ack.receivedAt
  rec.ackSource = ack.ackSource
  rec.simulated = ack.simulated
  rec.liveIrs = false

  const finalStatus = filingStatusFromAck(ack)
  if (finalStatus === 'rejected') {
    rec.status = statusAfterRejection()
    rec.rejectedAt = now
    rec.rejectionCodes = ack.rejectionCodes
    appendMefLog({
      action: 'reject_interpreted',
      tenantId: rec.tenantId,
      actorId: input.actorId,
      outcome: 'error',
      submissionId: rec.submissionId,
      meta: { codes: ack.rejectionCodes.join(',') },
    })
  } else if (finalStatus === 'accepted') {
    rec.status = 'accepted'
    rec.acceptedAt = now
  } else {
    rec.status = 'acknowledged'
  }
  rec.updatedAt = now
  submissions.set(rec.submissionId, rec)

  appendMefLog({
    action: 'ack_received',
    tenantId: rec.tenantId,
    actorId: input.actorId,
    outcome: finalStatus === 'rejected' ? 'error' : 'success',
    submissionId: rec.submissionId,
    meta: {
      ackSource: ack.ackSource,
      simulated: ack.simulated,
      status: finalStatus,
    },
  })
  appendMefLog({
    action: 'transmit_success',
    tenantId: rec.tenantId,
    actorId: input.actorId,
    outcome: 'success',
    submissionId: rec.submissionId,
    meta: { status: rec.status },
  })

  return { ok: true, submission: getSubmission(rec.submissionId)! }
}

/** Corrected return resubmission — new submission linked to prior rejection. */
export function resubmitCorrection(input: {
  priorSubmissionId: string
  ret: MefSyntheticReturn
  filingAuth: FilingAuthState
  credentials: MefCredentialBundle
  actorId: string
}): MefTransmitResult {
  const prior = submissions.get(input.priorSubmissionId)
  if (!prior) return { ok: false, error: 'prior_not_found' }
  if (prior.status !== 'rejected' && prior.status !== 'correction_required') {
    return { ok: false, error: 'prior_not_in_correction_state', blockedBy: [`status:${prior.status}`] }
  }

  // Caller supplies corrected return (distinct content hash) + matching Form 8879 lock.
  const prepared = prepareForTransmission({
    ret: input.ret,
    filingAuth: input.filingAuth,
    credentials: input.credentials,
    actorId: input.actorId,
  })
  if (!prepared.ready) {
    return { ok: false, error: 'correction_not_ready', blockedBy: prepared.blockers }
  }

  const rec = submissions.get(prepared.submission.submissionId)!
  rec.correctionOfSubmissionId = prior.submissionId
  submissions.set(rec.submissionId, rec)

  appendMefLog({
    action: 'correction_resubmit',
    tenantId: rec.tenantId,
    actorId: input.actorId,
    outcome: 'success',
    submissionId: rec.submissionId,
    meta: { prior: prior.submissionId },
  })

  return transmitPrepared({
    submissionId: rec.submissionId,
    ret: input.ret,
    filingAuth: input.filingAuth,
    credentials: input.credentials,
    actorId: input.actorId,
    xml: prepared.xml,
  })
}

export function mefPackageSummary(): string {
  return [
    'NOVARA Phase 8 IRS MeF integration (dev/test only)',
    `version=${PHASE8_MEF_VERSION}`,
    `environment=${activeMefEnvironment()}`,
    `liveProductionTransmit=${getMefFlags().liveProductionTransmit}`,
    `activateIrsCalcEngine=${getMefFlags().activateIrsCalcEngine}`,
    'STOP before production IRS transmission.',
  ].join('\n')
}

export { describeFilingStatus, interpretRejectCodes, setTransmitterMode, getTransmitterMode }
