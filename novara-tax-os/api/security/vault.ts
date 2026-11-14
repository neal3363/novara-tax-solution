/**
 * Staging encrypted document vault API.
 * Auth required for every operation; short-lived signed tokens for download.
 */

import { json, loadPhase7, sessionIdFrom } from './_shared.js'

export async function POST(request: Request) {
  try {
    const p7 = await loadPhase7()
    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')
    const sessionId = sessionIdFrom(request, body)

    if (op === 'self_test') {
      const result = p7.stagingVaultSelfTest()
      const kms = p7.stagingKmsRoundTripVerify()
      return json(200, {
        ...result,
        stagingKms: kms,
        productionEncryptionClaim: false,
      })
    }

    if (!sessionId) return json(401, { error: 'missing_session' })

    if (op === 'upload') {
      const filename = String(body.filename ?? 'doc.bin')
      const contentType = String(body.contentType ?? 'application/octet-stream')
      const ownerId = String(body.ownerId ?? '')
      const b64 = String(body.bytesBase64 ?? '')
      if (!ownerId || !b64) return json(400, { error: 'missing_fields' })
      const bytes = Buffer.from(b64, 'base64')
      try {
        const result = await p7.stagingVaultUpload({
          sessionId,
          ownerId,
          officeId: body.officeId ? String(body.officeId) : undefined,
          filename,
          contentType,
          bytes,
          assignedPreparerIds: Array.isArray(body.assignedPreparerIds)
            ? body.assignedPreparerIds.map(String)
            : undefined,
        })
        return json(200, {
          ...result,
          productionEncryptionClaim: false,
          durable: p7.getPhase7Flags().durableStoreEnabled,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg === 'malware_detected') {
          return json(422, {
            error: 'malware_detected',
            quarantined: true,
            quarantineId: p7.getLastQuarantineId(),
          })
        }
        return json(403, { error: msg })
      }
    }

    if (op === 'issue_token') {
      const docId = String(body.docId ?? '')
      if (!docId) return json(400, { error: 'missing_doc' })
      try {
        const token = p7.stagingIssueDownloadToken({
          sessionId,
          docId,
          ttlSec: typeof body.ttlSec === 'number' ? body.ttlSec : 120,
          assignedPreparerIds: Array.isArray(body.assignedPreparerIds)
            ? body.assignedPreparerIds.map(String)
            : undefined,
        })
        return json(200, token)
      } catch (e) {
        return json(403, { error: String(e instanceof Error ? e.message : e) })
      }
    }

    if (op === 'download') {
      const token = String(body.token ?? '')
      if (!token) return json(400, { error: 'missing_token' })
      try {
        const file = p7.stagingDownload({ sessionId, token })
        return json(200, {
          filename: file.filename,
          contentType: file.contentType,
          bytesBase64: file.bytes.toString('base64'),
          encryptionVerified: file.encryptionVerified,
          productionEncryptionClaim: false,
        })
      } catch (e) {
        return json(403, { error: String(e instanceof Error ? e.message : e) })
      }
    }

    if (op === 'delete') {
      const docId = String(body.docId ?? '')
      if (!docId) return json(400, { error: 'missing_doc' })
      try {
        p7.stagingSecureDelete({
          sessionId,
          docId,
          assignedPreparerIds: Array.isArray(body.assignedPreparerIds)
            ? body.assignedPreparerIds.map(String)
            : undefined,
        })
        return json(200, { deleted: true, docId })
      } catch (e) {
        return json(403, { error: String(e instanceof Error ? e.message : e) })
      }
    }

    return json(400, { error: 'unknown_op' })
  } catch {
    return json(500, { error: 'vault_failed' })
  }
}
