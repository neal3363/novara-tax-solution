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
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok || !data.verified) {
      return { verified: false, error: String(data.error ?? `http_${res.status}`) }
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
