import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { fetchViewerSession } from '../auth/sessionClient'
import { actions, useAppStore } from '../store/useAppStore'
import { AppNav } from './AppNav'

const IS_DEV = import.meta.env.DEV

/**
 * Production: Cursor-verified identity only (GET /api/session).
 * Sample / guest sandbox entry is local-dev only.
 */
export function RequireAuth() {
  const { currentUser } = useAppStore()
  const [ready, setReady] = useState(IS_DEV)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (IS_DEV) return
    let cancelled = false
    ;(async () => {
      // Drop any leftover guest-sandbox flag from older builds.
      try {
        sessionStorage.removeItem('novara-tax-os-sample-sandbox')
      } catch {
        /* ignore */
      }
      const session = await fetchViewerSession()
      if (cancelled) return
      if (session.verified) {
        actions.loginWithVerifiedViewer(session)
        setDenied(false)
        setReady(true)
        return
      }
      actions.clearSession()
      setDenied(true)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!IS_DEV && !ready) {
    return (
      <div className="app-shell container" style={{ padding: '2rem' }}>
        <p className="muted">Opening your workspace…</p>
      </div>
    )
  }

  if (!IS_DEV && denied && !currentUser) return <Navigate to="/login" replace />
  if (!currentUser) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">
        <div className="container" style={{ paddingTop: '0.85rem' }}>
          <div className="sample-banner" role="status">
            {IS_DEV
              ? 'Local development workspace — not a live IRS filing connection.'
              : 'Signed in with Cursor — editable taxpayer workspace on this device. Not a live IRS filing connection.'}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
