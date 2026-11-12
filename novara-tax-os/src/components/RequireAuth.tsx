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
        <div className="container" style={{ paddingTop: '0.85rem' }}>
          <div className="sample-banner" role="status">
            Sample demo data — session only on this device. Not a live filing connection.
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
