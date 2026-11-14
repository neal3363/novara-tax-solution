/**
 * Phase 8 MeF staging API — requires Phase 7 server-side authorization.
 * Live IRS transmission hard-blocked. Synthetic data only.
 */

import { json, loadPhase6, loadPhase7, sessionIdFrom, refuseUnlessStagingEnabled} from './_shared.js'

async function loadMef() {
  return import('../../novara-tax-os/src/engine/irs/mef/index.js')
}

export async function GET(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const mef = await loadMef()
    const url = new URL(request.url)
    const op = url.searchParams.get('op') ?? 'status'

    if (op === 'status') {
      return json(200, {
        summary: mef.mefPackageSummary(),
        flags: mef.getMefFlags(),
        environment: mef.activeMefEnvironment(),
        liveProductionTransmit: false,
        stop: 'STOP before production IRS transmission',
      })
    }

    if (op === 'submission') {
      const id = url.searchParams.get('submissionId')
      if (!id) return json(400, { error: 'missing_submission' })
      const rec = mef.getSubmission(id)
      if (!rec) return json(404, { error: 'not_found' })
      return json(200, { submission: rec, description: mef.describeFilingStatus(rec) })
    }

    return json(400, { error: 'unknown_op' })
  } catch (e) {
    return json(500, { error: 'mef_get_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}

export async function POST(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p6 = await loadPhase6()
    const p7 = await loadPhase7()
    const mef = await loadMef()
    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')
    const sessionId = sessionIdFrom(request, body)

    mef.assertNoLiveIrsTransmit()

    if (op === 'bootstrap_flags_check') {
      return json(200, {
        flags: mef.getMefFlags(),
        liveProductionTransmit: false,
      })
    }

    if (!sessionId) return json(401, { error: 'missing_session' })

    // Server-side authorization required for all e-file operations
    let authz
    try {
      const { session } = p7.resolveSessionPrincipal(sessionId)
      authz = p7.serverAuthorize({
        sessionId,
        action: 'return.submit',
        resourceTenantId: String(body.tenantId ?? session.tenantId),
        resourceOwnerId: body.ownerId ? String(body.ownerId) : session.principalId,
        resourceOfficeId: body.officeId ? String(body.officeId) : session.officeId,
        assignedPreparerIds: Array.isArray(body.assignedPreparerIds)
          ? body.assignedPreparerIds.map(String)
          : undefined,
      })
    } catch (e) {
      mef.appendMefLog({
        action: 'security_denied',
        tenantId: String(body.tenantId ?? 'unknown'),
        actorId: 'unknown',
        outcome: 'denied',
        meta: { error: String(e instanceof Error ? e.message : e) },
      })
      return json(401, { error: 'session_invalid' })
    }

    if (!authz.allowed) {
      mef.appendMefLog({
        action: 'security_denied',
        tenantId: authz.session.tenantId,
        actorId: authz.principal.id,
        outcome: 'denied',
        meta: { code: authz.code },
      })
      p6.appendAudit({
        actorId: authz.principal.id,
        tenantId: authz.session.tenantId,
        action: 'return_submit',
        resource: 'mef:denied',
        outcome: 'denied',
        meta: { code: authz.code },
      })
      return json(403, { error: authz.code, reason: authz.reason, serverSide: true })
    }

    if (op === 'prepare') {
      // Staging probe: readiness + validation only; body carries synthetic return summary
      return json(200, {
        ok: true,
        actorId: authz.principal.id,
        tenantId: authz.session.tenantId,
        note: 'Use test harness for full prepare/transmit with Form 8879 state',
        liveIrs: false,
      })
    }

    if (op === 'list_log') {
      return json(200, { entries: mef.listMefLog() })
    }

    return json(400, { error: 'unknown_op' })
  } catch (e) {
    return json(500, { error: 'mef_post_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}
