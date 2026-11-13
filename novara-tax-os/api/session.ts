/**
 * Verified Cursor viewer session for the published app.
 * Browser never receives the identity token — only name/email/sub for workspace binding.
 * Account role is assigned here (server-enforced) and cannot be chosen by the client.
 */
import { getIdentity } from '../cursor/identity'

/** Published sample: every verified person opens as a TC taxpayer. */
const SERVER_ASSIGNED_ROLE = 'taxpayer' as const
const SERVER_ASSIGNED_ACCOUNT_TYPE = 'tc' as const

export async function GET(request: Request) {
  const identity = await getIdentity(request)
  if (!identity.verified) {
    return new Response(
      JSON.stringify({ verified: false, error: identity.reason || 'unauthorized' }),
      {
        status: 401,
        headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
      },
    )
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
    return new Response(JSON.stringify({ verified: false, error: 'missing_subject' }), {
      status: 403,
      headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
    })
  }
  const name =
    identity.kind === 'person'
      ? identity.name || identity.email?.split('@')[0] || 'Owner'
      : identity.name || 'App Owner'
  const email =
    identity.kind === 'person'
      ? identity.email || ''
      : `owner-${keyOwner.replace(/[^a-zA-Z0-9]/g, '') || 'app'}@novara.local`

  return Response.json(
    {
      verified: true,
      sub,
      name,
      email,
      appVisibility: identity.appVisibility,
      /** Server-assigned — client must not elevate past this. */
      role: SERVER_ASSIGNED_ROLE,
      accountType: SERVER_ASSIGNED_ACCOUNT_TYPE,
      identityKind: identity.kind,
    },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
