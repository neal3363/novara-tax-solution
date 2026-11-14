/**
 * Phase 6 security session API (isolated).
 * Not wired into existing taxpayer UI login.
 * Guest auto-login rejected when production auth flags are enabled.
 *
 * Runtime note: handlers dynamically import the Phase 6 engine so a missing
 * compile step cannot crash the legacy /api/session identity route.
 */

const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'private, no-store',
} as const

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

async function loadPhase6() {
  return import('../../src/engine/security/phase6/index.js')
}

export async function POST(request: Request) {
  try {
    const p6 = await loadPhase6()
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
      fingerprintSalt: String(body.fingerprintSalt ?? 'phase6'),
      userAgent: request.headers.get('user-agent') ?? undefined,
      mfaSatisfied: Boolean(body.mfaSatisfied),
    })

    p6.appendAudit({
      actorId: principalId,
      tenantId,
      action: 'login_success',
      resource: `session:${session.sessionId}`,
      outcome: 'success',
      meta: { role, accountType },
    })

    return json(200, {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      role: session.role,
      accountType: session.accountType,
      tenantId: session.tenantId,
      mfaSatisfied: session.mfaSatisfied,
      phase6: true,
      enforcementDefaultOff: true,
    })
  } catch {
    return json(500, { error: 'session_create_failed' })
  }
}

export async function GET(request: Request) {
  try {
    const p6 = await loadPhase6()
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
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
    })
  } catch {
    return json(500, { error: 'session_get_failed' })
  }
}

export async function DELETE(request: Request) {
  try {
    const p6 = await loadPhase6()
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const actorId = url.searchParams.get('actorId') ?? 'unknown'
    if (!sessionId) return json(400, { error: 'missing_session' })
    const revoked = p6.revokeSession(sessionId, actorId)
    if (!revoked) return json(404, { error: 'not_found' })
    p6.appendAudit({
      actorId,
      tenantId: revoked.tenantId,
      action: 'session_revoke',
      resource: `session:${sessionId}`,
      outcome: 'success',
      meta: {},
    })
    return json(200, { revoked: true, sessionId, status: revoked.status })
  } catch {
    return json(500, { error: 'session_revoke_failed' })
  }
}
