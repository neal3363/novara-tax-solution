/**
 * Staging security readiness status (read-only).
 * Always reports productionEnforcement=false.
 */

import { json, loadPhase6, loadPhase7 } from './_shared.js'

export async function GET() {
  try {
    const p6 = await loadPhase6()
    const p7 = await loadPhase7()
    const ready = p7.stagingReadiness()
    return json(200, {
      phase6: {
        version: p6.PHASE6_SECURITY_VERSION,
        flags: p6.getPhase6Flags(),
        summary: p6.phase6SecuritySummary(),
      },
      phase7: {
        version: p7.PHASE7_SECURITY_VERSION,
        flags: p7.getPhase7Flags(),
        summary: p7.phase7SecuritySummary(),
        durableRoot: p7.getDurableRoot(),
        readiness: ready,
      },
      kmsPolicy: p6.kmsAccessPolicy(),
      productionEnforcement: false,
      mfaMandatoryForExistingUsers: false,
      stop: 'STOP before production enforcement',
    })
  } catch (e) {
    return json(500, {
      error: 'status_failed',
      detail: String(e instanceof Error ? e.message : e),
    })
  }
}

export async function POST(request: Request) {
  try {
    const p7 = await loadPhase7()
    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')

    if (op === 'bootstrap') {
      const durableRoot = body.durableRoot ? String(body.durableRoot) : undefined
      const result = p7.bootstrapStagingSecurity({ durableRoot })
      return json(200, { ...result, stop: true })
    }

    if (op === 'malware_outage') {
      p7.simulateMalwareOutage()
      return json(200, { mode: p7.getMalwareServiceMode() })
    }

    if (op === 'malware_recover') {
      p7.recoverMalwareService()
      return json(200, { mode: p7.getMalwareServiceMode() })
    }

    return json(400, { error: 'unknown_op' })
  } catch {
    return json(500, { error: 'status_post_failed' })
  }
}
