/**
 * Form 8879 electronic filing authorization bridge.
 * Do not transmit without required authorization.
 */

import {
  FORM_8879_VERSION,
  signatureLockStatus,
  type FilingAuthState,
} from '../../../filingAuthorizations'
import type { Mef8879Authorization } from '../types'

export function evaluate8879Authorization(input: {
  filingAuth: FilingAuthState
  returnContentHash: string
}): Mef8879Authorization {
  const missingReasons: string[] = []
  const consent = input.filingAuth.consents.find((c) => c.kind === 'form_8879_efile_auth')
  if (!consent?.accepted) {
    missingReasons.push('Form 8879 e-file authorization consent not accepted')
  }
  const lock = signatureLockStatus(input.filingAuth, input.returnContentHash)
  if (!lock.valid) {
    missingReasons.push(lock.reason ?? 'Signature lock invalid')
  }
  const primary = input.filingAuth.signatures.find((s) => s.role === 'primary')

  return {
    formVersion: FORM_8879_VERSION,
    authorized: missingReasons.length === 0,
    signerName: primary?.signerName,
    signedAt: primary?.signedAt,
    returnContentHash: input.returnContentHash,
    consentKind: 'form_8879_efile_auth',
    missingReasons,
  }
}

export function assertAuthorizedToTransmit(auth: Mef8879Authorization): void {
  if (!auth.authorized) {
    throw new Error(`missing_taxpayer_authorization:${auth.missingReasons.join(';')}`)
  }
}
