/**
 * PTIN / EFIN credential handling.
 * Manually entered values are NEVER treated as verified without a validation process.
 * Full credential values are NEVER stored — only last-four + irreversible fingerprint.
 */

export type CredentialStatus =
  | 'unverified'
  | 'pending_verification'
  | 'verified'
  | 'expired'
  | 'rejected'

export type CredentialKind = 'ptin' | 'efin' | 'ein'

export interface ProfessionalCredential {
  kind: CredentialKind
  /** Irreversible fingerprint — cannot recover the credential from this value */
  valueFingerprint: string
  lastFour: string
  status: CredentialStatus
  submittedAt: string
  verifiedAt?: string
  method: 'format_only' | 'irs_lookup_pending' | 'irs_lookup_verified' | 'seed_preverified'
  taxYear: number
  displayHint: string
}

export interface EfileProviderAssociation {
  providerName: string
  status: 'none' | 'pending' | 'associated'
  associatedAt?: string
}

/** Irreversible fingerprint — not encryption; full value is discarded after hashing. */
export function credentialFingerprint(raw: string): string {
  const normalized = raw.trim().toUpperCase()
  // FNV-1a 64-bit style mix — deterministic, non-reversible for credential recovery
  let h = 0xcbf29ce484222325n
  for (let i = 0; i < normalized.length; i++) {
    h ^= BigInt(normalized.charCodeAt(i))
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn
  }
  // Domain-separated with app salt that does not embed the plaintext
  const salt = 'novara-cred-fingerprint-v2'
  let h2 = 0xcbf29ce484222325n
  const mixed = `${salt}:${h.toString(16)}`
  for (let i = 0; i < mixed.length; i++) {
    h2 ^= BigInt(mixed.charCodeAt(i))
    h2 = (h2 * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return `fp_${h2.toString(16).padStart(16, '0')}`
}

/** @deprecated Removed — credentials are never stored in recoverable form */
export function encryptCredentialValue(_raw: string): string {
  throw new Error('CREDENTIAL_STORAGE_CHANGED: full credential values are not stored. Use submitCredential().')
}

/** @deprecated Removed — nothing to decrypt */
export function decryptCredentialValue(_encrypted: string): string | null {
  return null
}

export function isValidPtinFormat(value: string): boolean {
  return /^P\d{8}$/i.test(value.trim())
}

export function isValidEfinFormat(value: string): boolean {
  return /^\d{6}$/.test(value.trim())
}

export function isValidEinFormat(value: string): boolean {
  const v = value.trim()
  return /^\d{2}-\d{7}$/.test(v) || /^\d{9}$/.test(v)
}

function lastFourOf(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9]/g, '')
  return clean.slice(-4).toUpperCase()
}

/**
 * Accept a credential for storage. Status is always pending —
 * never verified from manual entry alone. Full value is discarded.
 */
export function submitCredential(
  kind: CredentialKind,
  rawValue: string,
  taxYear = new Date().getFullYear(),
): { ok: true; credential: ProfessionalCredential } | { ok: false; error: string } {
  const value = rawValue.trim().toUpperCase()
  if (kind === 'ptin' && !isValidPtinFormat(value)) {
    return { ok: false, error: 'PTIN must be P followed by 8 digits (e.g. P12345678).' }
  }
  if (kind === 'efin' && !isValidEfinFormat(value)) {
    return { ok: false, error: 'EFIN must be exactly 6 digits.' }
  }
  if (kind === 'ein' && !isValidEinFormat(value)) {
    return { ok: false, error: 'EIN must be 9 digits (XX-XXXXXXX).' }
  }

  const lastFour = lastFourOf(value)
  const credential: ProfessionalCredential = {
    kind,
    valueFingerprint: credentialFingerprint(value),
    lastFour,
    status: 'pending_verification',
    submittedAt: new Date().toISOString(),
    method: 'irs_lookup_pending',
    taxYear,
    displayHint:
      kind === 'ptin'
        ? `PTIN ····${lastFour} (pending verification)`
        : kind === 'efin'
          ? `EFIN ····${lastFour} (pending verification)`
          : `EIN ····${lastFour} (pending verification)`,
  }
  return { ok: true, credential }
}

/** Seed helper — demo accounts that completed an authorized verification path */
export function seedVerifiedCredential(
  kind: CredentialKind,
  rawValue: string,
  taxYear = 2025,
): ProfessionalCredential {
  const value = rawValue.trim().toUpperCase()
  const lastFour = lastFourOf(value)
  return {
    kind,
    valueFingerprint: credentialFingerprint(value),
    lastFour,
    status: 'verified',
    submittedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    verifiedAt: new Date(Date.now() - 86400000 * 28).toISOString(),
    method: 'seed_preverified',
    taxYear,
    displayHint:
      kind === 'ptin'
        ? `PTIN ····${lastFour} (verified)`
        : kind === 'efin'
          ? `EFIN ····${lastFour} (verified)`
          : `EIN ····${lastFour} (verified)`,
  }
}

export function requestCredentialVerification(
  credential: ProfessionalCredential,
): ProfessionalCredential {
  if (credential.status === 'verified') return credential
  return {
    ...credential,
    status: 'pending_verification',
    method: 'irs_lookup_pending',
    displayHint: credential.displayHint.replace(/\(.*?\)/, '(pending verification)'),
  }
}

export function completeAuthorizedVerification(
  credential: ProfessionalCredential,
  authorized: boolean,
): ProfessionalCredential {
  if (!authorized) {
    return {
      ...credential,
      status: 'rejected',
      method: 'irs_lookup_pending',
      displayHint: credential.displayHint.replace(/\(.*?\)/, '(rejected)'),
    }
  }
  return {
    ...credential,
    status: 'verified',
    verifiedAt: new Date().toISOString(),
    method: 'irs_lookup_verified',
    displayHint: credential.displayHint.replace(/\(.*?\)/, '(verified)'),
  }
}

export function isCredentialVerified(c: ProfessionalCredential | undefined | null): boolean {
  return c?.status === 'verified'
}

export function credentialPublicView(c: ProfessionalCredential | undefined | null) {
  if (!c) return null
  return {
    kind: c.kind,
    lastFour: c.lastFour,
    status: c.status,
    method: c.method,
    taxYear: c.taxYear,
    displayHint: c.displayHint,
    submittedAt: c.submittedAt,
    verifiedAt: c.verifiedAt,
  }
}
