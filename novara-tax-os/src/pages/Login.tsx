import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import { clampProductionRole, fetchViewerSession } from '../auth/sessionClient'
import './Login.css'

const IS_DEV = import.meta.env.DEV

/** Role picker lives in a DEV-only chunk — never shipped in production. */
const LoginDev = IS_DEV ? lazy(() => import('./LoginDev').then((m) => ({ default: m.LoginDev }))) : null

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/app/')) return '/app/taxpayer/prepare'
  return raw
}

export function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [busy, setBusy] = useState(!IS_DEV)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEV) return
    let cancelled = false
    ;(async () => {
      setBusy(true)
      const session = await fetchViewerSession()
      if (cancelled) return
      if (session.verified) {
        actions.loginWithVerifiedViewer({
          ...session,
          role: clampProductionRole(session.role),
        })
      } else {
        // Public host: do not send people to Cursor apps-gate (dead page).
        actions.loginAsPublicGuest()
        setNote('Opened a browser workspace for this public app — no Cursor sign-in required.')
      }
      navigate(next, { replace: true })
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
            <p>Opening your public tax workspace…</p>
          </div>
        </div>
        {busy && <p className="muted">Starting filing…</p>}
        {note && (
          <p className="muted" role="status">
            {note}
          </p>
        )}
        {!busy && (
          <div className="panel rise">
            <p className="muted" style={{ marginTop: 0 }}>
              If you were not redirected, continue below.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  actions.loginAsPublicGuest()
                  navigate(next)
                }}
              >
                Continue to questionnaire
              </button>
              <Link className="btn btn-ghost" to="/">
                Back to welcome
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
