/**
 * Staging password-reset API — anti-enumeration, hashed tokens, rate limited.
 * Production enforcement remains OFF.
 */

import { json, refuseUnlessStagingEnabled} from './_shared.js'

async function loadRemediation() {
  return import('../../novara-tax-os/src/engine/remediation/index.js')
}

export async function GET() {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const rem = await loadRemediation()
    return json(200, {
      summary: rem.remediationSummary(),
      flags: rem.getRemediationFlags(),
      productionEnforcement: false,
      stop: 'STOP before production enforcement',
    })
  } catch (e) {
    return json(500, { error: 'password_reset_status_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}

export async function POST(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const rem = await loadRemediation()
    rem.assertRemediationStagingOnly()
    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')

    if (op === 'request') {
      const email = String(body.email ?? '')
      // Staging test may pass principalIdIfKnown; public callers must omit it.
      const principalIdIfKnown = body.principalIdIfKnown ? String(body.principalIdIfKnown) : undefined
      const result = rem.requestPasswordReset({ email, principalIdIfKnown })
      // Never echo rawToken unless staging test explicitly asks (body.revealToken)
      if (body.revealToken && result.rawToken) {
        return json(200, { accepted: true, expiresAt: result.expiresAt, rawToken: result.rawToken, rateLimited: result.rateLimited ?? false })
      }
      return json(200, { accepted: true, rateLimited: result.rateLimited ?? false })
    }

    if (op === 'complete') {
      const result = rem.completePasswordReset({
        rawToken: String(body.rawToken ?? ''),
        newPassword: String(body.newPassword ?? ''),
      })
      if (!result.ok) return json(400, { error: result.error })
      return json(200, { ok: true, principalId: result.principalId, productionEnforcement: false })
    }

    return json(400, { error: 'unknown_op', op })
  } catch (e) {
    return json(500, { error: 'password_reset_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}
