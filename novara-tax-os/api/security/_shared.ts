/**
 * Shared helpers for Phase 6/7 security API routes (staging).
 * Isolated from taxpayer UI login.
 */

export const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'private, no-store',
} as const

export function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export async function loadPhase6() {
  return import('../../src/engine/security/phase6/index.js')
}

export async function loadPhase7() {
  return import('../../src/engine/security/phase7/index.js')
}

export function sessionIdFrom(request: Request, body?: Record<string, unknown>): string | null {
  const header = request.headers.get('x-novara-session')
  if (header) return header
  if (body?.sessionId) return String(body.sessionId)
  const url = new URL(request.url)
  return url.searchParams.get('sessionId')
}
