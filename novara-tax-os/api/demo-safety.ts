/**
 * Public demo safety API — reports locks and rejects sensitive submissions.
 * Staging / preview only. Does not enable live integrations.
 */

import { rejectSensitiveDemoPayload, type DemoSubmissionKind } from '../src/engine/demo/publicDemo'
import { assertDemoSafetyLocks, publicDemoStatusPayload } from '../src/engine/remediation/publicDemoSafety'

export async function GET(): Promise<Response> {
  const body = publicDemoStatusPayload()
  return Response.json(body, {
    headers: {
      'cache-control': 'no-store',
      'x-novara-demo': 'synthetic-only',
    },
  })
}

export async function POST(request: Request): Promise<Response> {
  let payload: { kind?: DemoSubmissionKind; text?: string; action?: string } = {}
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return Response.json({ error: 'invalid_json', allowed: false }, { status: 400 })
  }

  const safety = assertDemoSafetyLocks()
  if (!safety.ok) {
    return Response.json(
      { allowed: false, error: 'demo_safety_lock_failed', failures: safety.failures },
      { status: 503 },
    )
  }

  const action = String(payload.action || 'validate')
  if (action === 'payment' || action === 'irs_transmit' || action === 'banking') {
    return Response.json(
      {
        allowed: false,
        code: `demo_${action}_blocked`,
        reason: `${action} is disabled for the public demonstration.`,
        publicDemo: true,
        liveIntegrations: false,
      },
      { status: 403 },
    )
  }

  const kind = (payload.kind || 'generic') as DemoSubmissionKind
  const gate = rejectSensitiveDemoPayload(String(payload.text || ''), kind)
  return Response.json(gate, {
    status: gate.allowed ? 200 : 403,
    headers: { 'x-novara-demo': 'synthetic-only' },
  })
}
