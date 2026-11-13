import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import { fetchViewerSession } from '../auth/sessionClient'
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
      setError(
        session.error === 'unauthorized' || session.error === 'person_required'
          ? 'Cursor sign-in was not available for this visit. Sign in to Cursor, then retry.'
          : `Could not verify Cursor session (${session.error}).`,
      )
      setBusy(false)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, next])

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
              Open this app while signed in to Cursor (and invited, if the app is Private). Your workspace binds only
              after session verification succeeds.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setBusy(true)
                  setError(null)
                  void fetchViewerSession().then((session) => {
                    if (session.verified) {
                      actions.loginWithVerifiedViewer(session)
                      navigate(next, { replace: true })
                      return
                    }
                    actions.clearSession()
                    setError(`Cursor session still unavailable (${session.error}).`)
                    setBusy(false)
                  })
                }}
              >
                Retry Cursor sign-in
              </button>
            </div>
            {error && (
              <p className="muted" style={{ marginTop: '0.75rem' }} role="status">
                {error} If this app is Private, invite viewers in Publish Settings or switch visibility to Team so
                teammates can open it after signing in.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
