/**
 * MFA — authenticator TOTP (RFC 6238) + recovery codes.
 * Enrollment enabled by default for testing; mandatory enforcement OFF until approved.
 * Passkey/WebAuthn interface stubbed for future wiring.
 */

import { createHmac, randomBytes } from 'node:crypto'
import { getPhase6Flags } from './config'
import { randomId, safeEqual, sha256Hex } from './cryptoUtil'
import { appendAudit } from './auditLog'

export type MfaMethod = 'totp' | 'webauthn'

export interface MfaEnrollment {
  principalId: string
  method: MfaMethod
  /** Base32 secret — only held server-side after enroll confirm */
  secretBase32?: string
  /** WebAuthn credential id placeholder */
  webauthnCredentialId?: string
  recoveryCodeHashes: string[]
  enrolledAt?: string
  pending: boolean
}

export interface MfaChallengeRecord {
  challengeId: string
  principalId: string
  method: MfaMethod
  expiresAt: string
  attempts: number
}

const enrollments = new Map<string, MfaEnrollment>()
const challenges = new Map<string, MfaChallengeRecord>()
const loginAttempts = new Map<string, { count: number; windowStart: number; lockedUntil?: number }>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

export function resetMfaStoreForTests(): void {
  enrollments.clear()
  challenges.clear()
  loginAttempts.clear()
}

function base32Encode(buf: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleaned = input.replace(/=+$/, '').toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const c of cleaned) {
    const idx = alphabet.indexOf(c)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** HOTP/TOTP per RFC 6238 (SHA-1, 30s, 6 digits). */
export function generateTotp(secretBase32: string, atMs = Date.now(), stepSec = 30): string {
  const key = base32Decode(secretBase32)
  const counter = Math.floor(atMs / 1000 / stepSec)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter & 0xffffffff, 4)
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, '0')
}

export function verifyTotp(secretBase32: string, code: string, atMs = Date.now()): boolean {
  for (const skew of [-1, 0, 1]) {
    const expected = generateTotp(secretBase32, atMs + skew * 30_000)
    if (safeEqual(expected, code)) return true
  }
  return false
}

function checkLockout(principalId: string): { ok: boolean; reason?: string } {
  const now = Date.now()
  const row = loginAttempts.get(principalId)
  if (!row) return { ok: true }
  if (row.lockedUntil && row.lockedUntil > now) {
    return { ok: false, reason: 'account_temporarily_locked' }
  }
  if (now - row.windowStart > WINDOW_MS) {
    loginAttempts.set(principalId, { count: 0, windowStart: now })
  }
  return { ok: true }
}

function recordFailure(principalId: string): void {
  const now = Date.now()
  const row = loginAttempts.get(principalId) ?? { count: 0, windowStart: now }
  if (now - row.windowStart > WINDOW_MS) {
    row.count = 0
    row.windowStart = now
    row.lockedUntil = undefined
  }
  row.count++
  if (row.count >= MAX_ATTEMPTS) row.lockedUntil = now + LOCK_MS
  loginAttempts.set(principalId, row)
}

function recordSuccess(principalId: string): void {
  loginAttempts.delete(principalId)
}

export function beginTotpEnrollment(principalId: string): {
  secretBase32: string
  otpauthUrl: string
  recoveryCodes: string[]
  pending: true
} {
  const flags = getPhase6Flags()
  if (!flags.mfaEnrollmentEnabled) throw new Error('mfa_enrollment_disabled')

  const secretBase32 = base32Encode(randomBytes(20))
  const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex'))
  const enrollment: MfaEnrollment = {
    principalId,
    method: 'totp',
    secretBase32,
    recoveryCodeHashes: recoveryCodes.map((c) => sha256Hex(c)),
    pending: true,
  }
  enrollments.set(principalId, enrollment)
  appendAudit({
    actorId: principalId,
    tenantId: 'n/a',
    action: 'mfa_enroll',
    resource: `mfa:${principalId}`,
    outcome: 'success',
    meta: { method: 'totp', pending: true },
  })
  return {
    secretBase32,
    otpauthUrl: `otpauth://totp/NOVARA:${encodeURIComponent(principalId)}?secret=${secretBase32}&issuer=NOVARA&period=30&digits=6`,
    recoveryCodes,
    pending: true,
  }
}

export function confirmTotpEnrollment(principalId: string, code: string): boolean {
  const enr = enrollments.get(principalId)
  if (!enr?.pending || !enr.secretBase32) return false
  if (!verifyTotp(enr.secretBase32, code)) {
    appendAudit({
      actorId: principalId,
      tenantId: 'n/a',
      action: 'mfa_failure',
      resource: `mfa:${principalId}`,
      outcome: 'denied',
      meta: { stage: 'enroll_confirm' },
    })
    return false
  }
  enr.pending = false
  enr.enrolledAt = new Date().toISOString()
  enrollments.set(principalId, enr)
  appendAudit({
    actorId: principalId,
    tenantId: 'n/a',
    action: 'mfa_enroll',
    resource: `mfa:${principalId}`,
    outcome: 'success',
    meta: { method: 'totp', confirmed: true },
  })
  return true
}

export function isMfaEnrolled(principalId: string): boolean {
  const enr = enrollments.get(principalId)
  return !!enr && !enr.pending && !!enr.enrolledAt
}

export function startMfaChallenge(principalId: string, method: MfaMethod = 'totp'): MfaChallengeRecord {
  const lock = checkLockout(principalId)
  if (!lock.ok) throw new Error(lock.reason)
  if (method === 'webauthn') {
    // Passkey path scaffold — not fully wired
    const challenge: MfaChallengeRecord = {
      challengeId: randomId('mfa'),
      principalId,
      method: 'webauthn',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
    }
    challenges.set(challenge.challengeId, challenge)
    return { ...challenge }
  }
  if (!isMfaEnrolled(principalId)) throw new Error('mfa_not_enrolled')
  const challenge: MfaChallengeRecord = {
    challengeId: randomId('mfa'),
    principalId,
    method: 'totp',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    attempts: 0,
  }
  challenges.set(challenge.challengeId, challenge)
  return { ...challenge }
}

export function verifyMfaChallenge(challengeId: string, code: string): boolean {
  const ch = challenges.get(challengeId)
  if (!ch) return false
  if (new Date(ch.expiresAt).getTime() < Date.now()) return false
  ch.attempts++
  if (ch.attempts > MAX_ATTEMPTS) {
    recordFailure(ch.principalId)
    return false
  }
  const enr = enrollments.get(ch.principalId)
  if (!enr?.secretBase32) return false
  const ok = verifyTotp(enr.secretBase32, code)
  if (!ok) {
    recordFailure(ch.principalId)
    appendAudit({
      actorId: ch.principalId,
      tenantId: 'n/a',
      action: 'mfa_failure',
      resource: `mfa:${ch.principalId}`,
      outcome: 'denied',
      meta: { challengeId },
    })
    return false
  }
  recordSuccess(ch.principalId)
  challenges.delete(challengeId)
  appendAudit({
    actorId: ch.principalId,
    tenantId: 'n/a',
    action: 'mfa_verify',
    resource: `mfa:${ch.principalId}`,
    outcome: 'success',
    meta: { method: 'totp' },
  })
  return true
}

/** Recovery code consumes one-time hash. */
export function consumeRecoveryCode(principalId: string, code: string): boolean {
  const lock = checkLockout(principalId)
  if (!lock.ok) return false
  const enr = enrollments.get(principalId)
  if (!enr) return false
  const hash = sha256Hex(code)
  const idx = enr.recoveryCodeHashes.findIndex((h) => safeEqual(h, hash))
  if (idx < 0) {
    recordFailure(principalId)
    appendAudit({
      actorId: principalId,
      tenantId: 'n/a',
      action: 'mfa_failure',
      resource: `mfa:${principalId}`,
      outcome: 'denied',
      meta: { stage: 'recovery' },
    })
    return false
  }
  enr.recoveryCodeHashes.splice(idx, 1)
  enrollments.set(principalId, enr)
  recordSuccess(principalId)
  appendAudit({
    actorId: principalId,
    tenantId: 'n/a',
    action: 'mfa_recovery',
    resource: `mfa:${principalId}`,
    outcome: 'success',
    meta: { remainingCodes: enr.recoveryCodeHashes.length },
  })
  return true
}

/** Admin control: clear enrollment (requires separate authz). */
export function adminResetMfa(principalId: string, adminId: string): void {
  enrollments.delete(principalId)
  appendAudit({
    actorId: adminId,
    tenantId: 'n/a',
    action: 'admin_action',
    resource: `mfa:${principalId}`,
    outcome: 'success',
    meta: { action: 'mfa_reset' },
  })
}

export function getLoginAttemptState(principalId: string) {
  return loginAttempts.get(principalId)
}

/** Passkey enrollment stub — not production-ready. */
export function beginWebauthnEnrollment(principalId: string): { challengeId: string; supported: false } {
  appendAudit({
    actorId: principalId,
    tenantId: 'n/a',
    action: 'mfa_enroll',
    resource: `mfa:${principalId}`,
    outcome: 'success',
    meta: { method: 'webauthn', stub: true },
  })
  return { challengeId: randomId('webauthn'), supported: false }
}
