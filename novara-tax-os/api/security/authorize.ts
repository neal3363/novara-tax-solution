/**
 * Staging authorization probe — server-side RBAC + isolation.
 * Frontend RoleGate is not trusted for security decisions.
 */

import { json, loadPhase7, sessionIdFrom } from './_shared.js'

export async function POST(request: Request) {
  try {
    const p7 = await loadPhase7()
    const body = (await request.json()) as Record<string, unknown>
    const sessionId = sessionIdFrom(request, body)
    if (!sessionId) return json(401, { error: 'missing_session' })

    const action = String(body.action ?? '')
    const resourceTenantId = String(body.resourceTenantId ?? '')
    if (!action || !resourceTenantId) return json(400, { error: 'missing_fields' })

    try {
      const result = p7.serverAuthorize({
        sessionId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        action: action as any,
        resourceTenantId,
        resourceOwnerId: body.resourceOwnerId ? String(body.resourceOwnerId) : undefined,
        resourceOfficeId: body.resourceOfficeId ? String(body.resourceOfficeId) : undefined,
        assignedPreparerIds: Array.isArray(body.assignedPreparerIds)
          ? body.assignedPreparerIds.map(String)
          : undefined,
      })

      return json(result.allowed ? 200 : 403, {
        allowed: result.allowed,
        code: result.code,
        reason: result.reason,
        principalId: result.principal.id,
        tenantId: result.session.tenantId,
        serverSide: true,
        productionEnforcement: false,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('expired') || msg.includes('revoked') || msg.includes('Session')) {
        return json(401, { error: 'session_invalid', detail: msg })
      }
      return json(401, { error: 'unauthorized', detail: msg })
    }
  } catch {
    return json(500, { error: 'authorize_failed' })
  }
}
