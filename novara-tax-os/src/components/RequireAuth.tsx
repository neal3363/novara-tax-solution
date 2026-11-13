import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { fetchViewerSession } from '../auth/sessionClient'
import { actions, isSampleSandboxSession, useAppStore } from '../store/useAppStore'
import { AppNav } from './AppNav'

const IS_DEV = import.meta.env.DEV

/**
 * Production: prefer Cursor-verified identity; otherwise allow the sample
 * sandbox session so owners and demo viewers can stay in and edit.
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
      if (session.verified) {
        actions.loginWithVerifiedViewer(session)
        setDenied(false)
        setReady(true)
        return
      }
      // Keep sample sandbox users in (editable demo on this device).
      if (isSampleSandboxSession()) {
        if (!currentUser) actions.loginAsSampleSandbox()
        setDenied(false)
        setReady(true)
        return
      }
      setDenied(true)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
    // Intentionally once on mount — sample/current user rebound inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const sample = !IS_DEV && isSampleSandboxSession()

  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">
        <div className="container" style={{ paddingTop: '0.85rem' }}>
          <div className="sample-banner" role="status">
            {sample
              ? 'Sample sandbox — editable on this device. Not a live IRS filing connection.'
              : 'Signed in with Cursor — editable taxpayer workspace on this device. Not a live IRS filing connection.'}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
