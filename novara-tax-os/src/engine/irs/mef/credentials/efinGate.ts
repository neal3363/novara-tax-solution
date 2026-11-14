/**
 * EFIN / provider / PTIN / transmitter readiness checks.
 * An entered EFIN is NEVER treated as proof of IRS authorization.
 */

import {
  isValidEfinFormat,
  isValidPtinFormat,
  isCredentialVerified,
  type ProfessionalCredential,
  type EfileProviderAssociation,
} from '../../../credentials'
import type { MefProviderReadiness } from '../types'

export interface MefCredentialBundle {
  efin?: ProfessionalCredential | null
  ptin?: ProfessionalCredential | null
  provider?: EfileProviderAssociation | null
  /** Transmitter ETIN / cert presence flags — never store raw secrets here */
  transmitter: {
    etinConfigured: boolean
    certificateConfigured: boolean
    /** Raw secret material must never be passed */
    hasRawSecretInPayload?: boolean
  }
  irsAtsTestingCompleted: boolean
  /** When true, PTIN is required (preparer / office path) */
  preparerPath: boolean
}

export function evaluateProviderReadiness(bundle: MefCredentialBundle): MefProviderReadiness {
  const blockers: string[] = []

  const efinPresent = Boolean(bundle.efin)
  // Full EFIN is never stored — lastFour + kind indicate a prior format-checked submission.
  const efinFormatOk = efinPresent && bundle.efin!.kind === 'efin' && /^\d{4}$/.test(bundle.efin!.lastFour)
  const efinIrsVerified = isCredentialVerified(bundle.efin)

  if (!efinPresent) blockers.push('EFIN not on file')
  if (efinPresent && !efinFormatOk) blockers.push('EFIN format incomplete')
  if (efinPresent && !efinIrsVerified) {
    blockers.push('EFIN entered but not IRS-verified — entry alone is not authorization')
  }

  const ptinPresent = Boolean(bundle.ptin)
  const ptinFormatOk = ptinPresent && bundle.ptin!.kind === 'ptin' && /^[A-Z0-9]{4}$/i.test(bundle.ptin!.lastFour)
  const ptinIrsVerified = isCredentialVerified(bundle.ptin)
  if (bundle.preparerPath) {
    if (!ptinPresent) blockers.push('PTIN required for preparer/office e-file')
    if (ptinPresent && !ptinFormatOk) blockers.push('PTIN format incomplete')
    if (ptinPresent && !ptinIrsVerified) blockers.push('PTIN not IRS-verified')
  }

  const providerAssociated = bundle.provider?.status === 'associated'
  if (!providerAssociated) blockers.push('Authorized e-file provider not associated')

  const transmitterCredentialsPresent = bundle.transmitter.etinConfigured
  const transmitterCertificatePresent = bundle.transmitter.certificateConfigured
  if (!transmitterCredentialsPresent) blockers.push('Transmitter credentials not configured')
  if (!transmitterCertificatePresent) blockers.push('Transmitter certificate not configured')
  if (bundle.transmitter.hasRawSecretInPayload) {
    blockers.push('Raw transmitter secrets must not appear in readiness payloads')
  }

  const irsTestingCompleted = bundle.irsAtsTestingCompleted
  if (!irsTestingCompleted) blockers.push('Required IRS ATS testing/approval not completed')

  return {
    efinPresent,
    efinFormatValid: efinFormatOk,
    efinIrsVerified,
    ptinPresent,
    ptinFormatValid: ptinFormatOk,
    ptinRequired: bundle.preparerPath,
    ptinIrsVerified,
    providerAssociated,
    transmitterCredentialsPresent,
    transmitterCertificatePresent,
    irsTestingCompleted,
    ready: blockers.length === 0,
    blockers,
    efinEntryIsNotIrsAuthorization: true,
  }
}

/** Helper for tests — format checks without claiming verification. */
export function formatCheckOnly(efinRaw: string, ptinRaw: string): {
  efinFormat: boolean
  ptinFormat: boolean
  verified: false
} {
  return {
    efinFormat: isValidEfinFormat(efinRaw),
    ptinFormat: isValidPtinFormat(ptinRaw),
    verified: false,
  }
}
