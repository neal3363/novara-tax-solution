import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { AppNav } from './AppNav'

export function RequireAuth() {
  const { currentUser } = useAppStore()
  if (!currentUser) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
