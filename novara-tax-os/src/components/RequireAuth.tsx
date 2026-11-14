import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { clampProductionRole, fetchViewerSession } from '../auth/sessionClient'
import { PUBLIC_DEMO_BANNER, isPublicDemoMode } from '../engine/demo/publicDemo'
import { actions, useAppStore } from '../store/useAppStore'
import { AppNav } from './AppNav'

const IS_DEV = import.meta.env.DEV
const PUBLIC_DEMO = isPublicDemoMode()

/**
 * Production (public host): prefer a verified Cursor session when present;
 * otherwise open an ephemeral public guest taxpayer workspace.
 * Private/team hosts normally attach identity via the platform gate before the SPA loads.
 * Local DEV: role cards / existing store user.
 */
export function RequireAuth() {
  const { currentUser } = useAppStore()
  const [ready, setReady] = useState(IS_DEV)

  useEffect(() => {
    if (IS_DEV) return
    let cancelled = false
    ;(async () => {
      try {
        sessionStorage.removeItem('novara-tax-os-sample-sandbox')
      } catch {
        /* ignore */
      }
      const session = await fetchViewerSession()
      if (cancelled) return
      if (session.verified) {
        actions.loginWithVerifiedViewer({
          ...session,
          role: clampProductionRole(session.role),
        })
      } else {
        // Public app: no Cursor identity expected — continue as guest taxpayer.
        actions.loginAsPublicGuest()
      }
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

  if (!currentUser) {
    if (IS_DEV) {
      return (
        <div className="app-shell container" style={{ padding: '2rem' }}>
          <p className="muted">Choose a local role on the login page to continue.</p>
          <p>
            <a href="/login">Open local login</a>
          </p>
        </div>
      )
    }
    return (
      <div className="app-shell container" style={{ padding: '2rem' }}>
        <p className="muted">Opening your workspace…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">
        <div className="container" style={{ paddingTop: '0.85rem' }}>
          <div className="sample-banner" role="status">
            {PUBLIC_DEMO
              ? PUBLIC_DEMO_BANNER
              : IS_DEV
                ? 'Local development workspace — not a live IRS filing connection.'
                : 'Browser tax workspace on this device — not a live IRS filing connection. Data stays in this tab.'}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
