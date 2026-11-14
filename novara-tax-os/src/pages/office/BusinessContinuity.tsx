import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildContinuityDashboard,
  runSyntheticRecoveryTest,
  type ContinuityDashboard,
} from '../../engine/backupRecovery'
import { useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../../components/filing/FilingPanels.css'

export function BusinessContinuityPage() {
  const { currentUser, auditEvents, documents } = useAppStore()
  const [dash, setDash] = useState<ContinuityDashboard | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const base = useMemo(
    () =>
      buildContinuityDashboard({
        role: currentUser?.role ?? 'taxpayer',
        auditEventCount: auditEvents.length,
        documentCount: documents.length,
      }),
    [currentUser, auditEvents, documents],
  )
  const view = dash ?? base

  function runTest() {
    const result = runSyntheticRecoveryTest(view)
    setDash(result.dashboard)
    setMsg(result.log)
  }

  if (!view.access.canViewInventory) {
    return (
      <div className="page container">
        <p className="callout">Backup inventory is restricted to office owners and administrators.</p>
        <Link to="/app/office">Back</Link>
      </div>
    )
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Business continuity</p>
          <h1>Backup &amp; recovery</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/office">
          Office home
        </Link>
      </header>

      <p className="muted" style={{ maxWidth: '44rem' }}>
        {view.summary} Production restore remains disabled.
      </p>

      <section className="filing-panel">
        <h2>Backup jobs</h2>
        <ul className="readiness-list">
          {view.jobs.map((j) => (
            <li key={j.id} className={`readiness-item status-${j.status === 'verified' ? 'complete' : 'attention'}`}>
              <strong>
                {j.label} · {j.status} {j.encrypted ? '(encrypted)' : ''}
              </strong>
              <span>
                {j.sizeLabel} · integrity {j.integrityHash} — {j.notes}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="filing-panel">
        <h2>Recovery objectives</h2>
        <ul>
          {view.objectives.map((o) => (
            <li key={o.id}>
              <strong>{o.name}</strong>: {o.target} ({o.status})
            </li>
          ))}
        </ul>
        <button className="btn btn-primary" type="button" onClick={runTest} disabled={!view.access.canRunRecoveryTest}>
          Run synthetic recovery test
        </button>
      </section>

      <section className="filing-panel">
        <h2>Procedures &amp; incidents</h2>
        <ol>
          {view.procedures.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <ul className="tracking-events">
          {view.incidents.map((i) => (
            <li key={i.id}>
              <span className="src">{i.severity}</span>
              <strong>{i.title}</strong>
              <div className="muted">
                {i.at} — {i.detail}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {msg && <p className="callout">{msg}</p>}
    </div>
  )
}
