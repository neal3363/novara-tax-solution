/**
 * PTIN / EFIN credential handling.
 * Manually entered values are NEVER treated as verified without a validation process.
 * Sensitive values are stored encrypted (demo cipher) — UI shows last-four only.
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
  /** Opaque encrypted payload — never render in UI */
  valueEncrypted: string
  lastFour: string
  status: CredentialStatus
  submittedAt: string
  verifiedAt?: string
  /** How verification was (or will be) performed */
  method: 'format_only' | 'irs_lookup_pending' | 'irs_lookup_verified' | 'seed_preverified'
  taxYear: number
  displayHint: string
}

export interface EfileProviderAssociation {
  providerName: string
  status: 'none' | 'pending' | 'associated'
  associatedAt?: string
}

const DEMO_KEY = 'novara-cred-v1'

function toBase64(text: string): string {
  if (typeof btoa === 'function') return btoa(text)
  return bytesToBase64(new TextEncoder().encode(text))
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const triple = (a << 16) | (b << 8) | c
    out += chars[(triple >> 18) & 63]
    out += chars[(triple >> 12) & 63]
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : '='
    out += i + 2 < bytes.length ? chars[triple & 63] : '='
  }
  return out
}

function fromBase64(encoded: string): string {
  if (typeof atob === 'function') return atob(encoded)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = encoded.replace(/=+$/, '')
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (chars.indexOf(clean[i]) << 18) |
      (chars.indexOf(clean[i + 1]) << 12) |
      (chars.indexOf(clean[i + 2] ?? 'A') << 6) |
      chars.indexOf(clean[i + 3] ?? 'A')
    bytes.push((n >> 16) & 255)
    if (clean[i + 2]) bytes.push((n >> 8) & 255)
    if (clean[i + 3]) bytes.push(n & 255)
  }
  return new TextDecoder().decode(Uint8Array.from(bytes))
}

/** Demo-at-rest encryption — production would use KMS / field-level crypto */
export function encryptCredentialValue(raw: string): string {
  const normalized = raw.trim().toUpperCase()
  return toBase64(`${DEMO_KEY}:${normalized}`)
}

export function decryptCredentialValue(encrypted: string): string | null {
  try {
    const raw = fromBase64(encrypted)
    if (!raw.startsWith(`${DEMO_KEY}:`)) return null
    return raw.slice(DEMO_KEY.length + 1)
  } catch {
    return null
  }
}

/** PTIN format: P + 8 digits */
export function isValidPtinFormat(value: string): boolean {
  return /^P\d{8}$/i.test(value.trim())
}

/** EFIN format: 6 digits */
export function isValidEfinFormat(value: string): boolean {
  return /^\d{6}$/.test(value.trim())
}

/** EIN format: XX-XXXXXXX or 9 digits */
export function isValidEinFormat(value: string): boolean {
  const v = value.trim()
  return /^\d{2}-\d{7}$/.test(v) || /^\d{9}$/.test(v)
}

function lastFourOf(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9]/g, '')
  return clean.slice(-4).toUpperCase()
}

/**
 * Accept a credential for storage. Status is always unverified or pending —
 * never verified from manual entry alone.
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

  const credential: ProfessionalCredential = {
    kind,
    valueEncrypted: encryptCredentialValue(value),
    lastFour: lastFourOf(value),
    status: 'pending_verification',
    submittedAt: new Date().toISOString(),
    method: 'irs_lookup_pending',
    taxYear,
    displayHint:
      kind === 'ptin'
        ? `PTIN ····${lastFourOf(value)} (pending verification)`
        : kind === 'efin'
          ? `EFIN ····${lastFourOf(value)} (pending verification)`
          : `EIN ····${lastFourOf(value)} (pending verification)`,
  }
  return { ok: true, credential }
}

/** Seed helper — only for demo accounts that completed an authorized verification path */
export function seedVerifiedCredential(
  kind: CredentialKind,
  rawValue: string,
  taxYear = 2025,
): ProfessionalCredential {
  const value = rawValue.trim().toUpperCase()
  return {
    kind,
    valueEncrypted: encryptCredentialValue(value),
    lastFour: lastFourOf(value),
    status: 'verified',
    submittedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    verifiedAt: new Date(Date.now() - 86400000 * 28).toISOString(),
    method: 'seed_preverified',
    taxYear,
    displayHint:
      kind === 'ptin'
        ? `PTIN ····${lastFourOf(value)} (verified)`
        : kind === 'efin'
          ? `EFIN ····${lastFourOf(value)} (verified)`
          : `EIN ····${lastFourOf(value)} (verified)`,
  }
}

/** Request async verification (demo) — keeps pending until authorized process completes */
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

/**
 * Complete verification only via an authorized method — not available as a
 * client-side "I confirm" toggle for user-entered values in production.
 * Demo exposes this only for admin/test harness after simulating IRS lookup.
 */
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
