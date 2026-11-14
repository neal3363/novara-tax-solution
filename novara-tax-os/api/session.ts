/**
 * Verified Cursor viewer session for the published app.
 * Browser never receives the identity token — only name/email/sub for workspace binding.
 * Account role is assigned here (server-enforced) and cannot be chosen by the client.
 *
 * Important: do not statically import cursor/identity — a failed identity module load
 * previously crashed this function (FUNCTION_INVOCATION_FAILED / HTTP 500) for every
 * visitor, including public anonymous loads that only needed a clean 401.
 */

/** Published sample: every verified person opens as a TC taxpayer. */
const SERVER_ASSIGNED_ROLE = 'taxpayer' as const
const SERVER_ASSIGNED_ACCOUNT_TYPE = 'tc' as const

const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'private, no-store',
} as const

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function hasIdentityHeader(request: Request): boolean {
  try {
    const v2 = request.headers.get('x-cursor-identity-v2')
    const v1 = request.headers.get('x-cursor-identity')
    return Boolean((v2 && v2.trim()) || (v1 && v1.trim()))
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  try {
    // Public / unsigned visits: never load the identity verifier — return a clean 401.
    if (!hasIdentityHeader(request)) {
      return json(401, { verified: false, error: 'missing_header', reason: 'missing_header' })
    }

    const { getIdentity } = await import('../cursor/identity.js')
    const identity = await getIdentity(request)
    if (!identity.verified) {
      const reason = typeof identity.reason === 'string' ? identity.reason : 'unauthorized'
      return json(401, { verified: false, error: reason, reason })
    }

    // Prefer person identity; if the host only supplies a key, still open a sandbox
    // workspace bound to that subject so the owner/developer is not locked out.
    const keyOwner =
      identity.kind === 'key'
        ? identity.ownerUserId != null
          ? `user:${identity.ownerUserId}`
          : identity.ownerTeamId != null
            ? `team:${identity.ownerTeamId}`
            : 'key-owner'
        : ''
    const sub = identity.sub || (identity.kind === 'key' ? `key:${keyOwner}` : '')
    if (!sub) {
      return json(403, { verified: false, error: 'missing_subject', reason: 'missing_subject' })
    }
    const name =
      identity.kind === 'person'
        ? identity.name || identity.email?.split('@')[0] || 'Owner'
        : identity.name || 'App Owner'
    const email =
      identity.kind === 'person'
        ? identity.email || ''
        : `owner-${keyOwner.replace(/[^a-zA-Z0-9]/g, '') || 'app'}@novara.local`

    return json(200, {
      verified: true,
      sub,
      name,
      email,
      appVisibility: identity.appVisibility,
      /** Server-assigned — client must not elevate past this. */
      role: SERVER_ASSIGNED_ROLE,
      accountType: SERVER_ASSIGNED_ACCOUNT_TYPE,
      identityKind: identity.kind,
    })
  } catch {
    // Never return raw exception text to visitors.
    return json(500, {
      verified: false,
      error: 'session_handler_failed',
      reason: 'session_handler_failed',
    })
  }
}
