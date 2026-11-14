import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ENGAGEMENT_DOCUMENTS,
  engagementConsentDownloadText,
  identifyMissingAuthorizations,
  missingIntakeFields,
  type EngagementConsentKind,
} from '../../engine/engagementConsent'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../../components/filing/FilingPanels.css'

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function EngagementConsentPage() {
  const { currentUser, engagementConsent } = useAppStore()
  const [signer, setSigner] = useState(currentUser?.name ?? '')
  const [intakeKey, setIntakeKey] = useState('')
  const [intakeVal, setIntakeVal] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const state = engagementConsent
  const missingAuth = useMemo(
    () => (state ? identifyMissingAuthorizations(state) : []),
    [state],
  )
  const missingIntake = useMemo(
    () =>
      missingIntakeFields({
        answers: state?.intakeAnswers ?? {},
        knownName: currentUser?.name,
        knownEmail: currentUser?.email,
      }),
    [state, currentUser],
  )

  function ensure() {
    actions.ensureEngagementConsent()
  }

  function saveIntake(e: FormEvent) {
    e.preventDefault()
    ensure()
    if (!intakeKey.trim()) return
    actions.saveEngagementIntake({ [intakeKey]: intakeVal })
    setIntakeKey('')
    setIntakeVal('')
    setMsg('Intake field saved (only missing fields are requested).')
  }

  function sign(kind: EngagementConsentKind) {
    ensure()
    const r = actions.signEngagementConsent(kind, signer)
    setMsg(r.ok ? `Signed ${kind.replace(/_/g, ' ')}.` : r.error)
  }

  function withdraw(kind: EngagementConsentKind) {
    ensure()
    const r = actions.withdrawEngagementConsent(kind, 'Taxpayer withdrew consent')
    setMsg(r.ok ? `Withdrew ${kind.replace(/_/g, ' ')}.` : r.error)
  }

  function download() {
    ensure()
    const live = actions.getEngagementConsentSnapshot()
    if (!live) {
      setMsg('Nothing to download yet.')
      return
    }
    downloadText(
      `novara-engagement-consents.txt`,
      engagementConsentDownloadText(live, currentUser?.name ?? 'Taxpayer'),
    )
    setMsg('Signed package downloaded.')
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Client onboarding</p>
          <h1>Intake, engagement &amp; consent</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/taxpayer/final-review">
          Final review
        </Link>
      </header>

      <p className="muted" style={{ maxWidth: '44rem' }}>
        Digital intake and IRC §7216-oriented consents. An engagement letter is not authorization for every use or
        disclosure of tax return information. Filing Form 8879 consents remain on Final Review.
      </p>

      <section className="filing-panel">
        <h2>Missing intake</h2>
        {missingIntake.length === 0 ? (
          <p className="muted">No missing intake fields from known records.</p>
        ) : (
          <ul>
            {missingIntake.map((f) => (
              <li key={f.id}>{f.label}</li>
            ))}
          </ul>
        )}
        <form className="stack-form" onSubmit={saveIntake}>
          <label>
            Field
            <select value={intakeKey} onChange={(e) => setIntakeKey(e.target.value)}>
              <option value="">Select…</option>
              {missingIntake.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Value
            <input value={intakeVal} onChange={(e) => setIntakeVal(e.target.value)} />
          </label>
          <button className="btn btn-secondary" type="submit">
            Save intake answer
          </button>
        </form>
      </section>

      <section className="filing-panel">
        <h2>Authorizations</h2>
        <p className="muted">
          Missing / expired / withdrawn: {missingAuth.length}. AI asks only for authorizations not already on file.
        </p>
        <label>
          Typed signature name
          <input value={signer} onChange={(e) => setSigner(e.target.value)} />
        </label>
        <ul className="readiness-list">
          {(state?.records ?? ENGAGEMENT_DOCUMENTS.map((d) => ({
            id: d.kind,
            kind: d.kind,
            version: d.version,
            status: 'pending' as const,
            contentHash: '',
          }))).map((r) => {
            const doc = ENGAGEMENT_DOCUMENTS.find((d) => d.kind === r.kind)
            return (
              <li key={r.kind} className={`readiness-item status-${r.status === 'signed' ? 'complete' : 'attention'}`}>
                <strong>
                  {doc?.title ?? r.kind} · {r.status} · v{r.version}
                </strong>
                <span>{doc?.body}</span>
                <div className="final-actions" style={{ marginTop: '0.5rem' }}>
                  <button className="btn btn-primary" type="button" onClick={() => sign(r.kind)}>
                    Sign
                  </button>
                  {r.status === 'signed' && (
                    <button className="btn btn-ghost" type="button" onClick={() => withdraw(r.kind)}>
                      Withdraw
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <button className="btn btn-secondary" type="button" onClick={download}>
          Download signed package
        </button>
      </section>

      {state && state.audit.length > 0 && (
        <section className="filing-panel">
          <h2>Consent audit trail</h2>
          <ul className="tracking-events">
            {state.audit.slice(0, 20).map((a) => (
              <li key={a.id}>
                <span className="src">{a.action}</span>
                <strong>
                  {a.kind} v{a.version}
                </strong>
                <div className="muted">
                  {a.at} — {a.detail}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {msg && <p className="callout">{msg}</p>}
    </div>
  )
}
