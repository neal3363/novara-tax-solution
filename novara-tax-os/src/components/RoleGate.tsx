import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '../data/types'
import { useAppStore } from '../store/useAppStore'

const HOME: Record<Role, string> = {
  taxpayer: '/app/taxpayer',
  preparer: '/app/preparer',
  efin_owner: '/app/office',
  admin: '/app/admin',
}

export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { currentUser } = useAppStore()
  if (!currentUser) return <Navigate to="/login" replace />
  if (!roles.includes(currentUser.role)) return <Navigate to={HOME[currentUser.role]} replace />
  return <>{children}</>
}
