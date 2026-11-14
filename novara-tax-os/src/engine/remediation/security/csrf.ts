/**
 * CSRF double-submit token helpers (staging).
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { assertRemediationStagingOnly, getRemediationFlags } from '../config'

const SECRET = process.env.NOVARA_CSRF_STAGING_SECRET || 'novara-csrf-staging-only-not-prod'

export function issueCsrfToken(sessionId: string): { token: string; cookieValue: string } {
  assertRemediationStagingOnly()
  if (!getRemediationFlags().csrfProtectionEnabled) {
    return { token: 'csrf_disabled', cookieValue: 'csrf_disabled' }
  }
  const nonce = randomBytes(16).toString('hex')
  const sig = createHmac('sha256', SECRET).update(`${sessionId}:${nonce}`).digest('hex')
  const token = `${nonce}.${sig}`
  return { token, cookieValue: token }
}

export function verifyCsrfToken(sessionId: string, token: string, cookieValue: string): boolean {
  assertRemediationStagingOnly()
  if (!getRemediationFlags().csrfProtectionEnabled) return true
  if (!token || token !== cookieValue) return false
  const [nonce, sig] = token.split('.')
  if (!nonce || !sig) return false
  const expect = createHmac('sha256', SECRET).update(`${sessionId}:${nonce}`).digest('hex')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expect)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
