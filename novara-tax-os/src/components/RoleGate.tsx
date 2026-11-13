import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../data/types'
import { clampProductionRole } from '../auth/sessionClient'
import { useAppStore } from '../store/useAppStore'

const HOME: Record<Role, string> = {
  taxpayer: '/app/taxpayer',
  preparer: '/app/preparer',
  efin_owner: '/app/office',
  admin: '/app/admin',
}

const IS_PROD = !import.meta.env.DEV

/**
 * Route role gate.
 * Production: Cursor `/api/session` only assigns taxpayer — elevated preparer/office/admin
 * route claims are refused even if the client store was tampered with.
 */
export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { currentUser } = useAppStore()
  if (!currentUser) return <Navigate to="/login" replace />

  const effectiveRole = IS_PROD ? clampProductionRole(currentUser.role) : currentUser.role

  // Published host: never open preparer / office / admin surfaces from client-claimed roles.
  if (IS_PROD && !roles.includes('taxpayer')) {
    return <Navigate to="/app/taxpayer" replace />
  }

  if (!roles.includes(effectiveRole)) {
    return <Navigate to={HOME[effectiveRole]} replace />
  }

  return <>{children}</>
}
