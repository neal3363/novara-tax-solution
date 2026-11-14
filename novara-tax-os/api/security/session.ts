/**
 * Phase 6/7 security session API (isolated staging).
 * Not wired into existing taxpayer UI login.
 * Guest auto-login rejected when production auth flags are enabled.
 * Production enforcement remains OFF by default.
 */

import { json, loadPhase6, loadPhase7, sessionIdFrom } from './_shared.js'

export async function POST(request: Request) {
  try {
    const p6 = await loadPhase6()
    const p7 = await loadPhase7()
    const body = (await request.json()) as Record<string, unknown>
    const principalId = String(body.principalId ?? '')
    if (!principalId) return json(400, { error: 'missing_principal' })

    try {
      p6.assertApiCallerNotGuest(
        principalId,
        p6.getPhase6Flags().productionAuthPath ? 'production' : 'local_sample',
      )
    } catch {
      return json(403, { error: 'guest_forbidden' })
    }

    const role = body.role as 'taxpayer' | 'preparer' | 'efin_owner' | 'admin'
    const accountType = body.accountType as
      | 'tc'
      | 'independent_tp'
      | 'office_owner'
      | 'office_preparer'
      | 'admin'
    const tenantId = String(body.tenantId ?? '')
    if (!tenantId || !role || !accountType) return json(400, { error: 'missing_fields' })

    const principal = p6.syntheticPrincipal({
      id: principalId,
      email: String(body.email ?? ''),
      role,
      accountType,
      tenantId,
      officeId: body.officeId ? String(body.officeId) : undefined,
      officeManager: Boolean(body.officeManager),
      mfaEnrolled: Boolean(body.mfaEnrolled),
    })

    const session = p6.createSession({
      principal,
      fingerprintSalt: String(body.fingerprintSalt ?? 'phase7'),
      userAgent: request.headers.get('user-agent') ?? undefined,
      mfaSatisfied: Boolean(body.mfaSatisfied),
    })

    const audit = p6.appendAudit({
      actorId: principalId,
      tenantId,
      action: 'login_success',
      resource: `session:${session.sessionId}`,
      outcome: 'success',
      meta: { role, accountType, phase: 'phase7-staging' },
    })

    if (p7.getPhase7Flags().durableStoreEnabled) {
      p7.persistSessionSnapshot(session)
      p7.durableAppendAudit(audit)
    }

    return json(200, {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      role: session.role,
      accountType: session.accountType,
      tenantId: session.tenantId,
      mfaSatisfied: session.mfaSatisfied,
      phase6: true,
      phase7Staging: true,
      enforcementDefaultOff: true,
      productionEnforcement: false,
    })
  } catch {
    return json(500, { error: 'session_create_failed' })
  }
}

export async function GET(request: Request) {
  try {
    const p6 = await loadPhase6()
    const sessionId = sessionIdFrom(request)
    if (!sessionId) return json(400, { error: 'missing_session' })
    const session = p6.getSession(sessionId)
    if (!session || session.status !== 'active') {
      return json(401, { error: 'session_invalid', status: session?.status ?? 'missing' })
    }
    return json(200, {
      sessionId: session.sessionId,
      status: session.status,
      expiresAt: session.expiresAt,
      role: session.role,
      tenantId: session.tenantId,
      mfaSatisfied: session.mfaSatisfied,
      phase7Staging: true,
    })
  } catch {
    return json(500, { error: 'session_get_failed' })
  }
}

export async function DELETE(request: Request) {
  try {
    const p7 = await loadPhase7()
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const actorId = url.searchParams.get('actorId') ?? 'unknown'
    if (!sessionId) return json(400, { error: 'missing_session' })
    const revoked = p7.stagingRevokeSession(sessionId, actorId)
    if (!revoked) return json(404, { error: 'not_found' })
    return json(200, {
      revoked: true,
      sessionId,
      status: revoked.status,
      productionEnforcement: false,
    })
  } catch {
    return json(500, { error: 'session_revoke_failed' })
  }
}
