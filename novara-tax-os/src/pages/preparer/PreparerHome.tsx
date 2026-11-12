import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { UNLIMITED_CLIENTS_COPY, formatMoney } from '../../data/fees'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import '../shared.css'

export function PreparerHome() {
  const { returns, entryPlanStatus, entryPlan, preEntryNotes, benefitReport } = useAppStore()
  const review = returns.filter((r) =>
    ['Preparer Review', 'Diagnostics', 'Extraction/Verification'].includes(r.state),
  )
  const unsigned = returns.filter((r) => r.state === 'Signature Pending')
  const openBenefits =
    benefitReport?.findings.filter((f) => f.status === 'needs_info' || f.status === 'eligible_unverified') ?? []

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">TP inbox · {UNLIMITED_CLIENTS_COPY}</p>
          <h1>Returns ready for judgment</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/app/preparer/benefits">
            Tax benefits
          </Link>
          <Link className="btn btn-primary" to="/app/preparer/return">
            Open return
          </Link>
        </div>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Assigned</p>
          <p className="value">{returns.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Needs review</p>
          <p className="value">{review.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Benefit gaps</p>
          <p className="value">{openBenefits.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Unsigned</p>
          <p className="value">{unsigned.length}</p>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <RefundTracker report={benefitReport} />
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel">
          <h2>Live tax-preparation queue</h2>
          {returns.slice(0, 5).map((r) => (
            <div className="row-item" key={r.id}>
              <div>
                <strong>{r.clientName}</strong>
                <span className="row-meta">
                  {r.returnType} · {r.state} · {r.readiness}%
                </span>
              </div>
              <Link to="/app/preparer/return" onClick={() => actions.setActiveReturn(r.id)}>
                Open
              </Link>
            </div>
          ))}
        </section>
        <section className="list-panel panel">
          <h2>AI recommendations</h2>
          {openBenefits.slice(0, 4).map((f) => (
            <div className="row-item" key={f.ruleId}>
              <div>
                <strong>{f.shortName}</strong>
                <span className="row-meta">{f.explanation}</span>
              </div>
              <span className="badge badge-warn">{formatMoney(f.estimatedSavings)}</span>
            </div>
          ))}
          {!openBenefits.length && <p className="muted">No open benefit recommendations on the working return.</p>}
          <div className="row-item">
            <div>
              <strong>Entry plan</strong>
              <span className="row-meta">
                {entryPlanStatus.replace('_', ' ')} · {entryPlan.length} lines · {preEntryNotes.length} notes
              </span>
            </div>
            <Link to="/app/preparer/entry-plan">Open</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
