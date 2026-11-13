/**
 * Verified Cursor viewer session for the published private app.
 * Browser never receives the identity token — only name/email/sub for workspace binding.
 * Account role is assigned here (server-enforced) and cannot be chosen by the client.
 */
import { requireIdentity } from '../cursor/identity'

/** Private published app: every verified person opens as a TC taxpayer. */
const SERVER_ASSIGNED_ROLE = 'taxpayer' as const
const SERVER_ASSIGNED_ACCOUNT_TYPE = 'tc' as const

export async function GET(request: Request) {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) {
    return new Response(JSON.stringify({ verified: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
    })
  }
  if (identity.kind === 'key') {
    return new Response(JSON.stringify({ verified: false, error: 'person_required' }), {
      status: 403,
      headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
    })
  }
  return Response.json(
    {
      verified: true,
      sub: identity.sub,
      name: identity.name || 'Taxpayer',
      email: identity.email || '',
      appVisibility: identity.appVisibility,
      /** Server-assigned — client must not elevate past this. */
      role: SERVER_ASSIGNED_ROLE,
      accountType: SERVER_ASSIGNED_ACCOUNT_TYPE,
    },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
