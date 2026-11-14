import type { AccountType, Role } from '../data/types'

/** Roles the published host is allowed to assign (server is source of truth). */
export const PRODUCTION_ALLOWED_ROLES: readonly Role[] = ['taxpayer']

export type ViewerSession = {
  verified: true
  sub: string
  name: string
  email: string
  role: Role
  accountType: AccountType
  appVisibility?: string
}

function asRole(value: unknown): Role | null {
  if (value === 'taxpayer' || value === 'preparer' || value === 'efin_owner' || value === 'admin') {
    return value
  }
  return null
}

function asAccountType(value: unknown): AccountType | null {
  if (
    value === 'tc' ||
    value === 'independent_tp' ||
    value === 'office_preparer' ||
    value === 'office_owner' ||
    value === 'admin'
  ) {
    return value
  }
  return null
}

/** Clamp any client-held role to the server-assigned production role. */
export function clampProductionRole(role: Role | null | undefined): Role {
  if (role && PRODUCTION_ALLOWED_ROLES.includes(role)) return role
  return 'taxpayer'
}

export function clampProductionAccountType(accountType: AccountType | null | undefined): AccountType {
  return accountType === 'tc' ? 'tc' : 'tc'
}

/** Flatten API error payloads so the UI never shows “[object Object]”. */
export function formatSessionError(value: unknown, fallback = 'unauthorized'): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['reason', 'code', 'message', 'error', 'detail', 'type']) {
      const nested = record[key]
      if (typeof nested === 'string' && nested.trim()) return nested.trim()
    }
    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }
  return fallback
}

export function explainSessionError(code: string): string {
  switch (code) {
    case 'missing_header':
    case 'unauthorized':
    case 'person_required':
      return 'This browser is not signed into Cursor for this private app.'
    case 'expired':
      return 'Your Cursor session expired. Sign in again.'
    case 'wrong_audience':
    case 'wrong_issuer':
    case 'bad_signature':
    case 'malformed_token':
    case 'unknown_key':
    case 'invalid_claims':
      return 'Cursor could not validate this visit. Sign in again with Cursor.'
    case 'issuer_unreachable':
    case 'network':
      return 'Could not reach Cursor to verify your session. Check your connection and try again.'
    case 'not_json':
      return 'The host returned a non-session response. Open the app through Cursor sign-in.'
    case 'session_handler_failed':
      return 'Session check failed. On the public app you can continue filing in this browser without Cursor sign-in.'
    case 'http_401':
    case 'http_403':
      return 'No Cursor identity on this visit — expected for the public app.'
    case 'http_500':
      return 'Session check failed temporarily. Continue from Start Filing on the welcome page.'
    default:
      return `Could not verify Cursor session (${code}).`
  }
}

/**
 * Cursor apps-gate authorize URL for this published host.
 * Opens Cursor sign-in, then returns the viewer to the app with identity attached.
 */
export function cursorAppAuthorizeUrl(returnPath = '/'): string {
  if (typeof window === 'undefined') return 'https://cursor.com'
  const host = window.location.hostname
  const match = host.match(/^([a-z0-9-]+)\.apps\.(.+)$/i)
  if (!match) return 'https://cursor.com'
  const slug = match[1]
  const apex = `apps.${match[2]}`
  const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`
  const params = new URLSearchParams({
    login: 'grok',
    apex,
    slug,
    return_to: path,
  })
  return `https://cursor.com/api/apps-gate/authorize?${params.toString()}`
}

export async function fetchViewerSession(): Promise<
  ViewerSession | { verified: false; error: string }
> {
  try {
    const res = await fetch('/api/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    const text = await res.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      return { verified: false, error: 'not_json' }
    }
    if (!res.ok || !data.verified) {
      const raw = data.error ?? data.reason ?? `http_${res.status}`
      return { verified: false, error: formatSessionError(raw, `http_${res.status}`) }
    }
    const role = clampProductionRole(asRole(data.role) ?? 'taxpayer')
    const accountType = clampProductionAccountType(asAccountType(data.accountType) ?? 'tc')
    return {
      verified: true,
      sub: String(data.sub ?? ''),
      name: String(data.name ?? 'Taxpayer'),
      email: String(data.email ?? ''),
      role,
      accountType,
      appVisibility: data.appVisibility ? String(data.appVisibility) : undefined,
    }
  } catch {
    return { verified: false, error: 'network' }
  }
}
