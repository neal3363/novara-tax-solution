/**
 * Separate legal actions: truthfulness, return signature, e-file auth (8879-style),
 * e-delivery consent, use/disclosure consent, bank-product consent.
 * Signing locks a return version; profile changes invalidate signatures.
 */

export type ConsentKind =
  | 'truthfulness_declaration'
  | 'novara_accuracy_ack'
  | 'return_signature_primary'
  | 'return_signature_spouse'
  | 'form_8879_efile_auth'
  | 'electronic_signature_consent'
  | 'electronic_delivery_consent'
  | 'tax_info_use_disclosure'
  | 'fee_disclosure_ack'
  | 'privacy_notice_ack'
  | 'bank_product_auth'

export interface ConsentRecord {
  kind: ConsentKind
  label: string
  version: string
  accepted: boolean
  acceptedAt?: string
  signerName?: string
  signerRole: 'primary' | 'spouse' | 'preparer'
}

export interface SignatureCapture {
  role: 'primary' | 'spouse' | 'preparer'
  signerName: string
  method: 'typed_name' | 'drawn' // drawn is UI-only; IRS requirements vary — labeled sandbox
  typedName: string
  signedAt: string
  returnVersionId: string
  returnContentHash: string
  ipNote: string
}

export interface LockedReturnVersion {
  versionId: string
  contentHash: string
  lockedAt: string
  lockedByUserId: string
  taxYear: number
  projectedRefund: number
}

export interface FilingAuthState {
  consents: ConsentRecord[]
  signatures: SignatureCapture[]
  lockedVersion: LockedReturnVersion | null
  spouseRequired: boolean
  disclosuresVersion: string
}

export const DISCLOSURES_VERSION = 'novara-disclosures-2025-v1'
export const FORM_8879_VERSION = 'Form 8879 (sandbox TY2025 equivalent)'

export const IRS_PERJURY_DECLARATION =
  'I declare under penalties of perjury that I have examined this return and accompanying schedules and statements, and to the best of my knowledge and belief, they are true, correct, and complete. Declaration of preparer (other than taxpayer) is based on all information of which preparer has any knowledge.'

export const NOVARA_ACCURACY_ACK = `I acknowledge that I have reviewed the information I provided to NOVARA; that it is accurate and complete to the best of my knowledge; that knowingly providing false information may have legal consequences; that I will correct known errors before filing; and that tax credits and deductions must meet legal requirements. This acknowledgment does not eliminate any tax preparer’s legal responsibilities.`

export function defaultFilingAuthState(opts: { spouseRequired: boolean }): FilingAuthState {
  const base = (kind: ConsentKind, label: string, role: ConsentRecord['signerRole'] = 'primary'): ConsentRecord => ({
    kind,
    label,
    version: DISCLOSURES_VERSION,
    accepted: false,
    signerRole: role,
  })
  return {
    spouseRequired: opts.spouseRequired,
    disclosuresVersion: DISCLOSURES_VERSION,
    lockedVersion: null,
    signatures: [],
    consents: [
      base('truthfulness_declaration', 'IRS return declaration (penalties of perjury)'),
      base('novara_accuracy_ack', 'NOVARA accuracy & completeness acknowledgment'),
      base('electronic_signature_consent', 'Consent to use electronic signatures'),
      base('electronic_delivery_consent', 'Consent to electronic delivery of tax documents'),
      base('tax_info_use_disclosure', 'Consent to use/disclose tax return information as required for preparation & e-file'),
      base('fee_disclosure_ack', 'Preparation fee disclosure acknowledgment'),
      base('privacy_notice_ack', 'Privacy notice acknowledgment'),
      base('form_8879_efile_auth', `${FORM_8879_VERSION} — IRS e-file signature authorization`),
      // Bank product never pre-checked; only shown when applicable
    ],
  }
}

export function withBankProductConsent(state: FilingAuthState): FilingAuthState {
  if (state.consents.some((c) => c.kind === 'bank_product_auth')) return state
  return {
    ...state,
    consents: [
      ...state.consents,
      {
        kind: 'bank_product_auth',
        label: 'Bank product / refund transfer authorization (only if you selected a bank product)',
        version: DISCLOSURES_VERSION,
        accepted: false,
        signerRole: 'primary',
      },
    ],
  }
}

export function acceptConsent(
  state: FilingAuthState,
  kind: ConsentKind,
  signerName: string,
): FilingAuthState {
  return {
    ...state,
    consents: state.consents.map((c) =>
      c.kind === kind
        ? { ...c, accepted: true, acceptedAt: new Date().toISOString(), signerName }
        : c,
    ),
  }
}

export function captureSignature(
  state: FilingAuthState,
  input: {
    role: SignatureCapture['role']
    signerName: string
    typedName: string
    method: SignatureCapture['method']
    versionId: string
    contentHash: string
  },
): FilingAuthState {
  const sig: SignatureCapture = {
    role: input.role,
    signerName: input.signerName,
    method: input.method,
    typedName: input.typedName.trim(),
    signedAt: new Date().toISOString(),
    returnVersionId: input.versionId,
    returnContentHash: input.contentHash,
    ipNote: 'sandbox-session (no live IP capture)',
  }
  const signatures = [...state.signatures.filter((s) => s.role !== input.role), sig]
  return { ...state, signatures }
}

export function lockReturnVersion(
  state: FilingAuthState,
  lock: LockedReturnVersion,
): FilingAuthState {
  return { ...state, lockedVersion: lock }
}

/** If working return hash diverges from locked version, signatures are invalid. */
export function signatureLockStatus(
  state: FilingAuthState,
  currentHash: string,
): { valid: boolean; reason?: string } {
  if (!state.lockedVersion) return { valid: false, reason: 'Return not locked for signature.' }
  if (state.lockedVersion.contentHash !== currentHash) {
    return {
      valid: false,
      reason:
        'Return data changed after signature. An updated return was generated — new signatures and authorizations are required.',
    }
  }
  const primary = state.signatures.find((s) => s.role === 'primary')
  if (!primary) return { valid: false, reason: 'Primary taxpayer signature required.' }
  if (primary.returnContentHash !== currentHash) {
    return { valid: false, reason: 'Primary signature does not match the current return version.' }
  }
  if (state.spouseRequired) {
    const spouse = state.signatures.find((s) => s.role === 'spouse')
    if (!spouse) return { valid: false, reason: 'Spouse signature required for this filing status.' }
    if (spouse.returnContentHash !== currentHash) {
      return { valid: false, reason: 'Spouse signature does not match the current return version.' }
    }
  }
  const requiredKinds: ConsentKind[] = [
    'truthfulness_declaration',
    'novara_accuracy_ack',
    'electronic_signature_consent',
    'form_8879_efile_auth',
    'fee_disclosure_ack',
    'privacy_notice_ack',
    'tax_info_use_disclosure',
  ]
  for (const kind of requiredKinds) {
    const c = state.consents.find((x) => x.kind === kind)
    if (!c?.accepted) return { valid: false, reason: `Missing required consent: ${c?.label ?? kind}` }
  }
  return { valid: true }
}

export function invalidateLockIfStale(state: FilingAuthState, currentHash: string): FilingAuthState {
  if (!state.lockedVersion) return state
  if (state.lockedVersion.contentHash === currentHash) return state
  return {
    ...state,
    lockedVersion: null,
    signatures: [],
    consents: state.consents.map((c) => ({
      ...c,
      accepted: false,
      acceptedAt: undefined,
      signerName: undefined,
    })),
  }
}
