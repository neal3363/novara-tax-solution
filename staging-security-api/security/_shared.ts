/**
 * Shared helpers for Phase 6/7 security API routes (local staging only).
 * These handlers live outside novara-tax-os/api so public hosts do not expose them.
 * Even when imported, they refuse to run unless NOVARA_STAGING_SECURITY_API=1.
 */

export const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'private, no-store',
} as const

export function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

/** Hard gate: staging security HTTP handlers are local-opt-in only. */
export function refuseUnlessStagingEnabled(): Response | null {
  if (process.env.NOVARA_STAGING_SECURITY_API === '1') return null
  return json(404, { error: 'not_found' })
}

export async function loadPhase6() {
  return import('../../novara-tax-os/src/engine/security/phase6/index.js')
}

export async function loadPhase7() {
  return import('../../novara-tax-os/src/engine/security/phase7/index.js')
}

export function sessionIdFrom(request: Request, body?: Record<string, unknown>): string | null {
  const header = request.headers.get('x-novara-session')
  if (header) return header
  if (body?.sessionId) return String(body.sessionId)
  const url = new URL(request.url)
  return url.searchParams.get('sessionId')
}
