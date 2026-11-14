/**
 * Session expiration / invalidation helpers wrapping Phase 6/7.
 */

import {
  createSession,
  requireActiveSession,
  revokeSession,
  syntheticPrincipal,
} from '../../security/phase6/index'
import type { CreateSessionInput } from '../../security/phase6/sessions'

export function createShortLivedSession(
  input: Omit<CreateSessionInput, 'ttlSec'> & { ttlSec?: number },
): ReturnType<typeof createSession> {
  return createSession({ ...input, ttlSec: input.ttlSec ?? 2 })
}

export function assertSessionInvalidAfterRevoke(sessionId: string): boolean {
  revokeSession(sessionId, 'remediation_test')
  try {
    requireActiveSession(sessionId)
    return false
  } catch {
    return true
  }
}

export function assertSessionExpires(sessionId: string, waitMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        requireActiveSession(sessionId)
        resolve(false)
      } catch {
        resolve(true)
      }
    }, waitMs)
  })
}

export { syntheticPrincipal, createSession, revokeSession, requireActiveSession }
