/**
 * Server-side authenticated sessions with expiration and revocation.
 * In-memory store for Phase 6 validation — replace with durable store before production deploy.
 * NOT wired to existing UI login flows by default.
 */

import type { AccountType, Role } from '../../../data/types'
import { getPhase6Flags } from './config'
import { fingerprintHash, randomId } from './cryptoUtil'
import type { AuthSession, SecurityPrincipal } from './types'

const DEFAULT_TTL_SEC = 8 * 60 * 60
const DEFAULT_IDLE_SEC = 30 * 60

const sessions = new Map<string, AuthSession>()
const principals = new Map<string, SecurityPrincipal>()

export function resetSessionStoreForTests(): void {
  sessions.clear()
  principals.clear()
}

export function upsertPrincipal(p: SecurityPrincipal): SecurityPrincipal {
  if (p.kind === 'guest_blocked') {
    throw new Error('Cannot upsert guest_blocked principal into session store')
  }
  principals.set(p.id, { ...p })
  return principals.get(p.id)!
}

export function getPrincipal(id: string): SecurityPrincipal | undefined {
  return principals.get(id)
}

export interface CreateSessionInput {
  principal: SecurityPrincipal
  ttlSec?: number
  idleTimeoutSec?: number
  userAgent?: string
  ipHint?: string
  fingerprintSalt: string
  /** Require MFA satisfied for this session */
  mfaSatisfied?: boolean
}

export function createSession(input: CreateSessionInput): AuthSession {
  const flags = getPhase6Flags()
  if (flags.productionAuthPath && input.principal.kind === 'guest_blocked') {
    throw new Error('Guest principals forbidden on production auth path')
  }
  if (input.principal.kind === 'guest_blocked') {
    throw new Error('Guest auto-login blocked for Phase 6 production session API')
  }

  upsertPrincipal(input.principal)
  const now = Date.now()
  const ttl = input.ttlSec ?? DEFAULT_TTL_SEC
  const session: AuthSession = {
    sessionId: randomId('sess'),
    principalId: input.principal.id,
    tenantId: input.principal.tenantId,
    role: input.principal.role,
    accountType: input.principal.accountType,
    officeId: input.principal.officeId,
    officeManager: !!input.principal.officeManager,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl * 1000).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    status: 'active',
    mfaSatisfied: !!input.mfaSatisfied,
    fingerprintHash: fingerprintHash({
      userAgent: input.userAgent,
      ipHint: input.ipHint,
      salt: input.fingerprintSalt,
    }),
    idleTimeoutSec: input.idleTimeoutSec ?? DEFAULT_IDLE_SEC,
  }
  sessions.set(session.sessionId, session)
  return { ...session }
}

export function touchSession(
  sessionId: string,
  opts?: { userAgent?: string; ipHint?: string; fingerprintSalt?: string },
): AuthSession | null {
  const s = sessions.get(sessionId)
  if (!s) return null
  const refreshed = refreshSessionStatus(s)
  if (refreshed.status !== 'active') return { ...refreshed }

  if (opts?.fingerprintSalt) {
    const fp = fingerprintHash({
      userAgent: opts.userAgent,
      ipHint: opts.ipHint,
      salt: opts.fingerprintSalt,
    })
    if (fp !== s.fingerprintHash) {
      s.status = 'revoked'
      s.revokedAt = new Date().toISOString()
      return { ...s }
    }
  }

  const now = Date.now()
  s.lastSeenAt = new Date(now).toISOString()
  // Sliding absolute expiry not extended beyond original policy — idle checked via lastSeen
  sessions.set(sessionId, s)
  return { ...s }
}

function refreshSessionStatus(s: AuthSession): AuthSession {
  if (s.status === 'revoked') return s
  const now = Date.now()
  if (new Date(s.expiresAt).getTime() <= now) {
    s.status = 'expired'
    return s
  }
  const idleMs = s.idleTimeoutSec * 1000
  if (now - new Date(s.lastSeenAt).getTime() > idleMs) {
    s.status = 'expired'
    return s
  }
  return s
}

export function getSession(sessionId: string): AuthSession | null {
  const s = sessions.get(sessionId)
  if (!s) return null
  const refreshed = refreshSessionStatus(s)
  sessions.set(sessionId, refreshed)
  return { ...refreshed }
}

export function revokeSession(sessionId: string, actorId: string): AuthSession | null {
  const s = sessions.get(sessionId)
  if (!s) return null
  s.status = 'revoked'
  s.revokedAt = new Date().toISOString()
  sessions.set(sessionId, s)
  void actorId
  return { ...s }
}

/** Revoke all sessions for a principal (logout everywhere / compromise response). */
export function revokeAllSessionsForPrincipal(principalId: string): number {
  let n = 0
  for (const s of sessions.values()) {
    if (s.principalId === principalId && s.status === 'active') {
      s.status = 'revoked'
      s.revokedAt = new Date().toISOString()
      n++
    }
  }
  return n
}

export function markSessionMfaSatisfied(sessionId: string): AuthSession | null {
  const s = getSession(sessionId)
  if (!s || s.status !== 'active') return null
  s.mfaSatisfied = true
  const p = principals.get(s.principalId)
  if (p) {
    p.mfaVerifiedThisSession = true
    principals.set(p.id, p)
  }
  sessions.set(sessionId, s)
  return { ...s }
}

export function requireActiveSession(sessionId: string): { session: AuthSession; principal: SecurityPrincipal } {
  const session = getSession(sessionId)
  if (!session || session.status !== 'active') {
    throw new Error('session_invalid')
  }
  const principal = principals.get(session.principalId)
  if (!principal) throw new Error('unauthenticated')
  return { session, principal }
}

export function syntheticPrincipal(input: {
  id: string
  email: string
  role: Role
  accountType: AccountType
  tenantId: string
  officeId?: string
  officeManager?: boolean
  mfaEnrolled?: boolean
}): SecurityPrincipal {
  return {
    id: input.id,
    email: input.email,
    role: input.role,
    accountType: input.accountType,
    tenantId: input.tenantId,
    officeId: input.officeId,
    officeManager: input.officeManager,
    mfaEnrolled: !!input.mfaEnrolled,
    mfaVerifiedThisSession: false,
    kind: 'user',
  }
}
