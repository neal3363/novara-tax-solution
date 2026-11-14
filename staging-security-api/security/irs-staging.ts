/**
 * Phase 9 staging IRS dual-run API.
 * Requires Phase 7 server-side authorization.
 * Synthetic / staging only — never taxpayer-visible; cutover OFF.
 */

import { json, loadPhase7, sessionIdFrom, refuseUnlessStagingEnabled} from './_shared.js'

async function loadPhase9() {
  return import('../../novara-tax-os/src/engine/irs/phase9/index.js')
}

export async function GET() {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p9 = await loadPhase9()
    return json(200, {
      summary: p9.phase9Summary(),
      flags: p9.getPhase9Flags(),
      rollback: p9.verifyRollbackReadiness(),
      productionCutover: false,
      taxpayerVisible: false,
      stop: 'STOP before production engine cutover',
    })
  } catch (e) {
    return json(500, { error: 'irs_staging_status_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}

export async function POST(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p7 = await loadPhase7()
    const p9 = await loadPhase9()
    p9.assertNoProductionCutover()

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
        note: 'IRS staging ops require server authorization',
      })
    }

    if (op === 'maximizer_compat') {
      return json(200, {
        ...p9.verifyMaximizerCompatibility(),
        taxpayerVisible: false,
        productionCutover: false,
      })
    }

    if (op === 'run_suite') {
      const suite = p9.runPhase9StagingSuite()
      return json(200, {
        passed: suite.passed,
        failed: suite.failed,
        remainingDifferences: suite.remainingDifferences,
        unsupportedInventory: suite.unsupportedInventory,
        taxpayerVisible: false,
        productionCutover: false,
        cutoverReady: false,
        caseCount: suite.cases.length,
      })
    }

    if (op === 'adapter_probe') {
      // Staging probe uses default synthetic profile inside suite — no real PII accepted here
      const suite = p9.runPhase9StagingSuite()
      const first = suite.cases[0]
      return json(200, {
        id: first?.id,
        fullyValidated: first?.fullyValidated ?? false,
        unsupported: first?.unsupported ?? [],
        delta: first?.delta,
        maximizerProjected: first?.adapter.maximizer.projectedRefund,
        irsRefund: first?.adapter.irsVerifiedNumbers?.refundOrBalanceDue ?? null,
        taxpayerVisible: false,
        productionCutover: false,
      })
    }

    return json(400, { error: 'unknown_op' })
  } catch (e) {
    return json(500, { error: 'irs_staging_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}
