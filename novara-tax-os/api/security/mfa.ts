/**
 * Staging MFA API — enrollment, verify, recovery, admin reset.
 * Does NOT mandate MFA for existing production users.
 */

import { json, loadPhase6, loadPhase7, sessionIdFrom } from './_shared.js'

export async function POST(request: Request) {
  try {
    const p6 = await loadPhase6()
    const p7 = await loadPhase7()
    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')

    if (op === 'enroll_begin') {
      const principalId = String(body.principalId ?? '')
      if (!principalId) return json(400, { error: 'missing_principal' })
      const result = p7.stagingBeginEnrollment(principalId)
      return json(200, { ...result, productionMandate: false })
    }

    if (op === 'enroll_confirm') {
      const principalId = String(body.principalId ?? '')
      const code = String(body.code ?? '')
      const ok = p7.stagingConfirmEnrollment(principalId, code)
      return json(ok ? 200 : 401, { confirmed: ok, enrolled: p6.isMfaEnrolled(principalId) })
    }

    if (op === 'challenge_start') {
      const principalId = String(body.principalId ?? '')
      if (!principalId) return json(400, { error: 'missing_principal' })
      try {
        const ch = p7.stagingStartChallenge(principalId)
        return json(200, ch)
      } catch (e) {
        return json(400, { error: String(e instanceof Error ? e.message : e) })
      }
    }

    if (op === 'challenge_verify') {
      const challengeId = String(body.challengeId ?? '')
      const code = String(body.code ?? '')
      const sessionId = sessionIdFrom(request, body)
      const ok = p7.stagingVerifyChallenge(challengeId, code)
      if (ok && sessionId) {
        p7.stagingSatisfySessionMfa(sessionId)
      }
      return json(ok ? 200 : 401, { verified: ok, mfaSatisfied: ok && Boolean(sessionId) })
    }

    if (op === 'recovery') {
      const principalId = String(body.principalId ?? '')
      const code = String(body.code ?? '')
      const sessionId = sessionIdFrom(request, body)
      const ok = p7.stagingRecoverWithCode(principalId, code)
      if (ok && sessionId) p7.stagingSatisfySessionMfa(sessionId)
      return json(ok ? 200 : 401, { recovered: ok })
    }

    if (op === 'admin_reset') {
      const sessionId = sessionIdFrom(request, body)
      const targetPrincipalId = String(body.targetPrincipalId ?? '')
      if (!sessionId || !targetPrincipalId) return json(400, { error: 'missing_fields' })
      try {
        const { session, principal } = p7.resolveSessionPrincipal(sessionId)
        const result = p7.stagingAdminResetMfa({
          session,
          admin: principal,
          targetPrincipalId,
        })
        return json(200, result)
      } catch (e) {
        return json(403, { error: String(e instanceof Error ? e.message : e) })
      }
    }

    if (op === 'status') {
      const principalId = String(body.principalId ?? '')
      return json(200, p7.stagingMfaStatus(principalId))
    }

    if (op === 'totp_test_code') {
      // Staging/test only — generate code from secret for harness (never production UI)
      const secret = String(body.secretBase32 ?? '')
      if (!secret) return json(400, { error: 'missing_secret' })
      return json(200, { code: p7.stagingGenerateTotp(secret), stagingOnly: true })
    }

    return json(400, { error: 'unknown_op' })
  } catch {
    return json(500, { error: 'mfa_failed' })
  }
}

export async function GET(request: Request) {
  try {
    const p7 = await loadPhase7()
    const url = new URL(request.url)
    const principalId = url.searchParams.get('principalId')
    if (!principalId) return json(400, { error: 'missing_principal' })
    return json(200, p7.stagingMfaStatus(principalId))
  } catch {
    return json(500, { error: 'mfa_status_failed' })
  }
}
