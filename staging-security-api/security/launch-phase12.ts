/**
 * Phase 12 launch-readiness API — Phase 7 server authorization required.
 * Staging assessment only. Never activates production.
 */

import { json, loadPhase7, sessionIdFrom, refuseUnlessStagingEnabled} from './_shared.js'

async function loadP12() {
  return import('../../novara-tax-os/src/engine/launch/phase12/index.js')
}

export async function GET() {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p12 = await loadP12()
    const report = p12.buildLaunchReadinessReport()
    return json(200, {
      summary: p12.phase12Summary(),
      flags: p12.getPhase12Flags(),
      pricing: p12.assertApprovedPricingIntact(),
      recommendation: report.recommendation,
      productionReady: false,
      publicDemoReady: report.publicDemoReady,
      stop: 'STOP before production activation',
    })
  } catch (e) {
    return json(500, { error: 'phase12_status_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}

export async function POST(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p7 = await loadPhase7()
    const p12 = await loadP12()
    p12.assertNoProductionActivation()

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
        note: 'Phase 12 launch ops require server authorization',
      })
    }

    if (op === 'e2e') {
      const result = p12.runStagingEndToEndWorkflow({
        accountType: (body.accountType as 'tc' | 'tp' | 'office') ?? 'tc',
        filingState: body.filingState ? String(body.filingState) : 'Texas',
        isBusiness: Boolean(body.isBusiness),
      })
      return json(200, { result, productionReady: false })
    }

    if (op === 'readiness') {
      const report = p12.buildLaunchReadinessReport()
      return json(200, {
        recommendation: report.recommendation,
        productionReady: false,
        publicDemoReady: report.publicDemoReady,
        criticalHighBlockers: report.criticalHighBlockers,
        stepsBeforeRealTaxpayers: report.stepsBeforeRealTaxpayers,
        evidence: report.evidence,
        security: {
          productionSecurityGo: report.security.productionSecurityGo,
          criticalOpen: report.security.criticalOpen,
          highOpen: report.security.highOpen,
        },
        paymentsBanking: report.paymentsBanking,
        mef: report.mef,
      })
    }

    if (op === 'gap_blocks') {
      const decision = p12.evaluateFilingReadinessBlocks(
        (body.flags as Parameters<typeof p12.evaluateFilingReadinessBlocks>[0]) ?? {},
      )
      return json(200, { decision, mayMarkFilingReady: false })
    }

    if (op === 'release_gate') {
      const gate = p12.finalReleaseGate(Boolean(body.humanApproved))
      return json(200, { ...gate, productionGo: false })
    }

    return json(400, { error: 'unknown_op', op })
  } catch (e) {
    return json(500, { error: 'phase12_op_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}
