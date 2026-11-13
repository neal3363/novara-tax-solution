import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import { fetchViewerSession } from '../auth/sessionClient'
import './Login.css'

const IS_DEV = import.meta.env.DEV

/** Role picker lives in a DEV-only chunk — never shipped in production. */
const LoginDev = IS_DEV ? lazy(() => import('./LoginDev').then((m) => ({ default: m.LoginDev }))) : null

export function Login() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(!IS_DEV)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEV) return
    let cancelled = false
    ;(async () => {
      setBusy(true)
      const session = await fetchViewerSession()
      if (cancelled) return
      if (!session.verified) {
        setError(
          session.error === 'unauthorized'
            ? 'Sign in with Cursor to open this private app.'
            : `Could not verify session (${session.error}).`,
        )
        setBusy(false)
        return
      }
      actions.loginWithVerifiedViewer(session)
      navigate('/app/taxpayer', { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  if (IS_DEV && LoginDev) {
    return (
      <Suspense fallback={<div className="login-page container">Loading local login…</div>}>
        <LoginDev />
      </Suspense>
    )
  }

  return (
    <div className="login-page">
      <div className="container login-wrap">
        <div className="login-brand rise">
          <BrandMark size={52} />
          <div>
            <h1 className="brand">NOVARA</h1>
            <p>Private sandbox — opening your personal tax workspace after Cursor verifies you.</p>
          </div>
        </div>
        {busy && <p className="muted">Verifying your Cursor session…</p>}
        {error && (
          <div className="panel">
            <p>{error}</p>
            <p className="muted">This app is private. Open it while signed in to Cursor, then retry.</p>
            <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
