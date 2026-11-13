import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { actions } from '../store/useAppStore'
import { fetchViewerSession } from '../auth/sessionClient'
import './Login.css'

const IS_DEV = import.meta.env.DEV

/** Role picker lives in a DEV-only chunk — never shipped in production. */
const LoginDev = IS_DEV ? lazy(() => import('./LoginDev').then((m) => ({ default: m.LoginDev }))) : null

function enterSampleSandbox(navigate: ReturnType<typeof useNavigate>, name?: string) {
  actions.loginAsSampleSandbox(name)
  navigate('/app/taxpayer', { replace: true })
}

export function Login() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(!IS_DEV)
  const [error, setError] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState('')

  useEffect(() => {
    if (IS_DEV) return
    let cancelled = false
    ;(async () => {
      setBusy(true)
      const session = await fetchViewerSession()
      if (cancelled) return
      if (session.verified) {
        actions.loginWithVerifiedViewer(session)
        navigate('/app/taxpayer', { replace: true })
        return
      }
      setError(
        session.error === 'unauthorized' || session.error === 'person_required'
          ? 'Cursor sign-in was not available for this visit.'
          : `Could not verify Cursor session (${session.error}).`,
      )
      setBusy(false)
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
            <p>
              Sample tax sandbox — owners signed in to Cursor open automatically. Anyone viewing this demo can also
              enter an editable sample workspace on this device.
            </p>
          </div>
        </div>
        {busy && <p className="muted">Checking your Cursor session…</p>}
        {!busy && (
          <div className="panel rise">
            <strong>Enter sample sandbox</strong>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              Open an editable taxpayer workspace. Upload docs, answer questions, and change return data — saved only in
              this browser session.
            </p>
            <label className="field" style={{ display: 'block', marginTop: '0.75rem' }}>
              <span className="muted">Display name (optional)</span>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. App Owner"
                autoComplete="name"
              />
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => enterSampleSandbox(navigate, ownerName)}
              >
                Continue & edit sample
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setBusy(true)
                  setError(null)
                  void fetchViewerSession().then((session) => {
                    if (session.verified) {
                      actions.loginWithVerifiedViewer(session)
                      navigate('/app/taxpayer', { replace: true })
                      return
                    }
                    setError(`Cursor session still unavailable (${session.error}). Use sample sandbox below.`)
                    setBusy(false)
                  })
                }}
              >
                Retry Cursor sign-in
              </button>
            </div>
            {error && (
              <p className="muted" style={{ marginTop: '0.75rem' }} role="status">
                {error} If this app is Private, invite viewers in Publish Settings or switch visibility to Team/Public
                so others can open it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
