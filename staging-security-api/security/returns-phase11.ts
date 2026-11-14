/**
 * Phase 11 staging returns API — Phase 7 server authorization required.
 * Isolated state / business / amended calcs. No live e-file. No interview wiring.
 */

import { json, loadPhase7, sessionIdFrom, refuseUnlessStagingEnabled} from './_shared.js'

async function loadP11() {
  return import('../../novara-tax-os/src/engine/returns/phase11/index.js')
}

export async function GET() {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p11 = await loadP11()
    return json(200, {
      summary: p11.phase11Summary(),
      flags: p11.getPhase11Flags(),
      pricing: p11.assertApprovedPricingIntact(),
      states: p11.listPrioritizedStates(),
      nationwideStateFiling: false,
      liveBusinessEfile: false,
      liveIrsFiling: false,
      stop: 'STOP before production activation',
    })
  } catch (e) {
    return json(500, { error: 'phase11_status_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}

export async function POST(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p7 = await loadPhase7()
    const p11 = await loadP11()
    p11.assertNoProductionActivation()

    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')
    const sessionId = sessionIdFrom(request, body)
    if (!sessionId) return json(401, { error: 'missing_session' })

    let authz
    try {
      const { session } = p7.resolveSessionPrincipal(sessionId)
      authz = p7.serverAuthorize({
        sessionId,
        action: 'admin.audit_read',
        resourceTenantId: String(body.tenantId ?? session.tenantId),
        resourceOfficeId: body.officeId ? String(body.officeId) : session.officeId,
      })
    } catch {
      return json(401, { error: 'session_invalid' })
    }

    if (!authz.allowed) {
      return json(403, {
        error: authz.code,
        reason: authz.reason,
        serverSide: true,
        note: 'Phase 11 staging ops require server authorization',
      })
    }

    if (op === 'state_compute') {
      const result = p11.computeStateReturn(body.input as Parameters<typeof p11.computeStateReturn>[0])
      return json(200, { result, productionReady: false })
    }

    if (op === 'business_1065') {
      const result = p11.computeForm1065(body.input as Parameters<typeof p11.computeForm1065>[0])
      return json(200, { result, liveEfile: false })
    }

    if (op === 'business_1120s') {
      const result = p11.computeForm1120S(body.input as Parameters<typeof p11.computeForm1120S>[0])
      return json(200, { result, liveEfile: false })
    }

    if (op === 'business_1120') {
      const result = p11.computeForm1120(body.input as Parameters<typeof p11.computeForm1120>[0])
      return json(200, { result, liveEfile: false })
    }

    if (op === 'amended') {
      const result = p11.prepareAmendedReturn({
        ...(body as object),
        tenantId: String(body.tenantId ?? authz.session.tenantId),
        actorId: authz.principal.id,
      } as Parameters<typeof p11.prepareAmendedReturn>[0])
      return json(200, { result, liveFiling: false })
    }

    if (op === 'ai_recognize') {
      const items = p11.recognizeInterviewNeeds(body.profile as Parameters<typeof p11.recognizeInterviewNeeds>[0])
      return json(200, {
        items,
        wiredToInterview: p11.aiAdapterWiredToInterview(),
        note: 'Recognition only — interview/Maximizer unmodified',
      })
    }

    return json(400, { error: 'unknown_op', op })
  } catch (e) {
    return json(500, { error: 'phase11_op_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}
