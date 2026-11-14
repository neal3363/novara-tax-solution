/**
 * Phase 8 MeF types — isolated electronic filing (dev/test only).
 */

import type { MefEnvironment } from './config'

/** Filing pipeline — clearly labels simulated vs IRS acknowledgments. */
export type MefFilingStatus =
  | 'ready_for_review'
  | 'awaiting_taxpayer_authorization'
  | 'ready_for_transmission'
  | 'submitted_to_test_environment'
  | 'acknowledged'
  | 'accepted'
  | 'rejected'
  | 'correction_required'

export type MefAckSource = 'simulated' | 'irs_ats' | 'irs_production_blocked'

export type MefReturnType =
  | 'Form1040'
  | 'Form1040SR'
  | 'Form1040X'
  | 'unsupported'

export interface MefSyntheticReturn {
  /** Synthetic only — never real taxpayer SSNs */
  submissionLocalId: string
  taxYear: number
  returnType: MefReturnType
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss'
  primaryTinMasked: string
  primaryName: string
  spouseName?: string
  agi: number
  totalTax: number
  totalPayments: number
  refundOrBalanceDue: number
  formsIncluded: string[]
  schedulesIncluded: string[]
  tenantId: string
  ownerId: string
  officeId?: string
}

export interface MefXmlDocument {
  taxYear: number
  returnType: MefReturnType
  xml: string
  schemaVersion: string
  contentHash: string
  composedAt: string
  synthetic: true
}

export interface MefValidationIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  path?: string
}

export interface MefValidationResult {
  ok: boolean
  schemaVersion: string
  issues: MefValidationIssue[]
  validatedAt: string
}

export interface MefProviderReadiness {
  efinPresent: boolean
  efinFormatValid: boolean
  efinIrsVerified: boolean
  ptinPresent: boolean
  ptinFormatValid: boolean
  ptinRequired: boolean
  ptinIrsVerified: boolean
  providerAssociated: boolean
  transmitterCredentialsPresent: boolean
  transmitterCertificatePresent: boolean
  irsTestingCompleted: boolean
  ready: boolean
  blockers: string[]
  /** Explicit: entered EFIN alone is never proof of IRS authorization */
  efinEntryIsNotIrsAuthorization: true
}

export interface Mef8879Authorization {
  formVersion: string
  authorized: boolean
  signerName?: string
  signedAt?: string
  returnContentHash: string
  consentKind: 'form_8879_efile_auth'
  missingReasons: string[]
}

export interface MefSubmissionRecord {
  submissionId: string
  localId: string
  taxYear: number
  returnType: MefReturnType
  status: MefFilingStatus
  environment: MefEnvironment
  ackSource: MefAckSource
  xmlContentHash: string
  tenantId: string
  ownerId: string
  officeId?: string
  efinLastFour?: string
  createdAt: string
  updatedAt: string
  transmittedAt?: string
  acknowledgedAt?: string
  acceptedAt?: string
  rejectedAt?: string
  rejectionCodes: string[]
  correctionOfSubmissionId?: string
  duplicateOfSubmissionId?: string
  simulated: boolean
  liveIrs: false
}

export interface MefAcknowledgment {
  submissionId: string
  ackSource: MefAckSource
  status: 'acknowledged' | 'accepted' | 'rejected'
  receivedAt: string
  rejectionCodes: string[]
  rejectionMessages: string[]
  rawSnippet: string
  simulated: boolean
}

export interface MefTransmitResult {
  ok: boolean
  submission?: MefSubmissionRecord
  error?: string
  blockedBy?: string[]
}
