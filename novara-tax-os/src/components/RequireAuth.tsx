import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { fetchViewerSession } from '../auth/sessionClient'
import { actions, useAppStore } from '../store/useAppStore'
import { AppNav } from './AppNav'

const IS_DEV = import.meta.env.DEV

/**
 * Production: re-verify Cursor identity on every protected load and rebind the
 * server-assigned role so sessionStorage cannot elevate privileges.
 */
export function RequireAuth() {
  const { currentUser } = useAppStore()
  const [ready, setReady] = useState(IS_DEV)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (IS_DEV) return
    let cancelled = false
    ;(async () => {
      const session = await fetchViewerSession()
      if (cancelled) return
      if (!session.verified) {
        actions.clearSession()
        setDenied(true)
        setReady(true)
        return
      }
      actions.loginWithVerifiedViewer(session)
      setDenied(false)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!IS_DEV && !ready) {
    return (
      <div className="app-shell container" style={{ padding: '2rem' }}>
        <p className="muted">Verifying your Cursor session…</p>
      </div>
    )
  }

  if (!IS_DEV && denied) return <Navigate to="/login" replace />
  if (!currentUser) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">
        <div className="container" style={{ paddingTop: '0.85rem' }}>
          <div className="sample-banner" role="status">
            Private sandbox — identity verified by Cursor. Role is server-assigned (taxpayer). Session only on this
            device.
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
