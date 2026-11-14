/**
 * Staging durable audit API — verify chain, list events, retention check.
 * Never returns SSNs or document contents.
 */

import { json, loadPhase6, loadPhase7, sessionIdFrom, refuseUnlessStagingEnabled} from './_shared.js'

export async function GET(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p6 = await loadPhase6()
    const p7 = await loadPhase7()
    const url = new URL(request.url)
    const op = url.searchParams.get('op') ?? 'verify'

    if (op === 'verify') {
      const mem = p6.verifyAuditChain()
      const durable = p7.durableVerifyAuditChain()
      return json(200, {
        memory: mem,
        durable,
        sensitiveDataPolicy: 'ssn_and_documents_forbidden',
        productionEnforcement: false,
      })
    }

    if (op === 'list') {
      const sessionId = sessionIdFrom(request)
      if (!sessionId) return json(401, { error: 'missing_session' })
      try {
        const { session } = p7.resolveSessionPrincipal(sessionId)
        const tenantId = url.searchParams.get('tenantId') ?? session.tenantId
        const authz = p7.serverAuthorize({
          sessionId,
          action: 'admin.audit_read',
          resourceTenantId: tenantId,
        })
        if (!authz.allowed) return json(403, { error: authz.code })
        const rows = p6.listAudit({
          tenantId,
          actorId: url.searchParams.get('actorId') ?? undefined,
        })
        // Strip any accidental sensitive-looking fields
        const safe = rows.map((r) => ({
          id: r.id,
          at: r.at,
          actorId: r.actorId,
          tenantId: r.tenantId,
          action: r.action,
          resource: r.resource,
          outcome: r.outcome,
          meta: r.meta,
          prevHash: r.prevHash,
          hash: r.hash,
        }))
        return json(200, { count: safe.length, records: safe })
      } catch (e) {
        return json(401, { error: String(e instanceof Error ? e.message : e) })
      }
    }

    if (op === 'durable') {
      const records = p7.durableLoadAudit()
      return json(200, {
        count: records.length,
        verify: p7.durableVerifyAuditChain(records),
        retention: 'append-only-jsonl-staging',
      })
    }

    return json(400, { error: 'unknown_op' })
  } catch {
    return json(500, { error: 'audit_failed' })
  }
}

export async function POST(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p7 = await loadPhase7()
    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')

    if (op === 'tamper_test') {
      // Staging test only — intentionally breaks durable chain
      p7.__tamperDurableAuditForTests()
      return json(200, {
        tampered: true,
        verify: p7.durableVerifyAuditChain(),
        stagingOnly: true,
      })
    }

    return json(400, { error: 'unknown_op' })
  } catch {
    return json(500, { error: 'audit_post_failed' })
  }
}
