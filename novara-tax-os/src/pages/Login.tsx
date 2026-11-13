import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import {
  cursorAppAuthorizeUrl,
  explainSessionError,
  fetchViewerSession,
} from '../auth/sessionClient'
import './Login.css'

const IS_DEV = import.meta.env.DEV

/** Role picker lives in a DEV-only chunk — never shipped in production. */
const LoginDev = IS_DEV ? lazy(() => import('./LoginDev').then((m) => ({ default: m.LoginDev }))) : null

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/app/')) return '/app/taxpayer'
  return raw
}

export function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [busy, setBusy] = useState(!IS_DEV)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEV) return
    let cancelled = false
    ;(async () => {
      setBusy(true)
      try {
        sessionStorage.removeItem('novara-tax-os-sample-sandbox')
      } catch {
        /* ignore */
      }
      const session = await fetchViewerSession()
      if (cancelled) return
      if (session.verified) {
        actions.loginWithVerifiedViewer(session)
        navigate(next, { replace: true })
        return
      }
      actions.clearSession()
      setErrorCode(session.error)
      setError(explainSessionError(session.error))
      setBusy(false)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, next])

  function startCursorSignIn() {
    const returnTo = next.startsWith('/app/') ? next : '/'
    window.location.assign(cursorAppAuthorizeUrl(returnTo))
  }

  async function retrySession() {
    setBusy(true)
    setError(null)
    setErrorCode(null)
    const session = await fetchViewerSession()
    if (session.verified) {
      actions.loginWithVerifiedViewer(session)
      navigate(next, { replace: true })
      return
    }
    actions.clearSession()
    setErrorCode(session.error)
    setError(explainSessionError(session.error))
    setBusy(false)
  }

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
            <p>
              Private taxpayer workspace. Access requires a verified Cursor sign-in for this app — there is no guest
              sandbox on the published site.
            </p>
          </div>
        </div>
        {busy && <p className="muted">Checking your Cursor session…</p>}
        {!busy && (
          <div className="panel rise">
            <strong>Sign in required</strong>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              On iPad Safari or another browser, open the Cursor sign-in link below so Cursor can attach your session to
              this private app. Retry alone only works after that sign-in completes.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
              <button className="btn btn-primary" type="button" onClick={startCursorSignIn}>
                Sign in with Cursor
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => void retrySession()}>
                Retry session check
              </button>
            </div>
            {error && (
              <p className="muted" style={{ marginTop: '0.75rem' }} role="status">
                {error}
                {errorCode ? ` (${errorCode})` : ''} If this app is Private, only the owner (and invited viewers) can
                open it after Cursor sign-in. Change visibility or invites in Publish Settings.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
