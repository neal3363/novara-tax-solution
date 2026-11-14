/**
 * Password recovery — secure reset tokens (staging).
 * Tokens are hashed at rest; raw token returned once; TTL + single-use.
 * Does NOT enable production auth enforcement.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { assertRemediationStagingOnly, getRemediationFlags } from '../config'

export interface PasswordResetTokenRecord {
  id: string
  emailNormalized: string
  principalId: string
  tokenHash: string
  createdAt: string
  expiresAt: string
  usedAt?: string
  revokedAt?: string
}

export interface PasswordResetRequestResult {
  accepted: true
  /** Present only when principal exists — never reveal existence to callers in API layer */
  rawToken?: string
  expiresAt?: string
  rateLimited?: boolean
}

const tokens = new Map<string, PasswordResetTokenRecord>()
const passwordHashes = new Map<string, string>() // principalId -> sha256(salt:password) staging only
const requestWindow = new Map<string, number[]>()

const TTL_MS = 30 * 60 * 1000
const MAX_REQUESTS_PER_HOUR = 5

function normEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function hashToken(raw: string): string {
  return createHash('sha256').update(`novara-reset:${raw}`).digest('hex')
}

function hashPassword(principalId: string, password: string): string {
  return createHash('sha256').update(`${principalId}:${password}`).digest('hex')
}

export function resetPasswordStoreForTests(): void {
  tokens.clear()
  passwordHashes.clear()
  requestWindow.clear()
}

export function stagingSetPasswordForTests(principalId: string, password: string): void {
  passwordHashes.set(principalId, hashPassword(principalId, password))
}

export function stagingVerifyPassword(principalId: string, password: string): boolean {
  const stored = passwordHashes.get(principalId)
  if (!stored) return false
  const next = Buffer.from(hashPassword(principalId, password))
  const prev = Buffer.from(stored)
  if (next.length !== prev.length) return false
  return timingSafeEqual(next, prev)
}

function rateLimitEmail(email: string): boolean {
  const key = normEmail(email)
  const now = Date.now()
  const window = (requestWindow.get(key) ?? []).filter((t) => now - t < 60 * 60 * 1000)
  if (window.length >= MAX_REQUESTS_PER_HOUR) {
    requestWindow.set(key, window)
    return true
  }
  window.push(now)
  requestWindow.set(key, window)
  return false
}

/**
 * Request a reset. Always returns accepted=true for unknown emails (anti-enumeration)
 * when called via public API helper — use revealTokenOnlyIfKnown for tests.
 */
export function requestPasswordReset(input: {
  email: string
  principalIdIfKnown?: string
}): PasswordResetRequestResult {
  assertRemediationStagingOnly()
  if (!getRemediationFlags().passwordResetEnabled) throw new Error('password_reset_disabled')

  const email = normEmail(input.email)
  if (!email || !email.includes('@')) throw new Error('invalid_email')

  if (rateLimitEmail(email)) {
    return { accepted: true, rateLimited: true }
  }

  if (!input.principalIdIfKnown) {
    // Anti-enumeration: pretend success
    return { accepted: true }
  }

  const rawToken = randomBytes(32).toString('base64url')
  const id = `pwr_${randomBytes(8).toString('hex')}`
  const now = Date.now()
  const rec: PasswordResetTokenRecord = {
    id,
    emailNormalized: email,
    principalId: input.principalIdIfKnown,
    tokenHash: hashToken(rawToken),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  }
  tokens.set(id, rec)
  return { accepted: true, rawToken, expiresAt: rec.expiresAt }
}

export function revokePasswordResetTokensForPrincipal(principalId: string): number {
  let n = 0
  for (const [id, t] of tokens) {
    if (t.principalId === principalId && !t.usedAt && !t.revokedAt) {
      t.revokedAt = new Date().toISOString()
      tokens.set(id, t)
      n++
    }
  }
  return n
}

export function completePasswordReset(input: {
  rawToken: string
  newPassword: string
}): { ok: boolean; error?: string; principalId?: string } {
  assertRemediationStagingOnly()
  if (!input.newPassword || input.newPassword.length < 10) {
    return { ok: false, error: 'password_too_weak' }
  }
  if (!/[A-Za-z]/.test(input.newPassword) || !/[0-9]/.test(input.newPassword)) {
    return { ok: false, error: 'password_complexity' }
  }

  const want = hashToken(input.rawToken)
  let match: PasswordResetTokenRecord | undefined
  for (const t of tokens.values()) {
    if (t.tokenHash === want) {
      match = t
      break
    }
  }
  if (!match) return { ok: false, error: 'invalid_token' }
  if (match.usedAt) return { ok: false, error: 'token_already_used' }
  if (match.revokedAt) return { ok: false, error: 'token_revoked' }
  if (Date.parse(match.expiresAt) < Date.now()) return { ok: false, error: 'token_expired' }

  match.usedAt = new Date().toISOString()
  tokens.set(match.id, match)
  // Invalidate siblings
  revokePasswordResetTokensForPrincipal(match.principalId)
  stagingSetPasswordForTests(match.principalId, input.newPassword)
  return { ok: true, principalId: match.principalId }
}

export function listPasswordResetTokensForTests(): PasswordResetTokenRecord[] {
  return [...tokens.values()].map((t) => ({ ...t }))
}
