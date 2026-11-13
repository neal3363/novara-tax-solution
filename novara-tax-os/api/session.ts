/**
 * Verified Cursor viewer session for the published private app.
 * Browser never receives the identity token — only name/email/sub for workspace binding.
 */
import { requireIdentity } from '../cursor/identity'

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
    },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
