import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import '../shared.css'

export function PreparerHome() {
  const { returns, entryPlanStatus, entryPlan, preEntryNotes } = useAppStore()
  const review = returns.filter((r) =>
    ['Preparer Review', 'Diagnostics', 'Extraction/Verification'].includes(r.state),
  )
  const unsigned = returns.filter((r) => r.state === 'Signature Pending')

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Preparer inbox · Summit Tax Office</p>
          <h1>Returns ready for judgment</h1>
        </div>
        <Link className="btn btn-primary" to="/app/preparer/entry-plan">
          Review entry plan
        </Link>
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
          <p className="label">Plan lines</p>
          <p className="value">{entryPlan.filter((l) => l.status !== 'removed').length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Unsigned</p>
          <p className="value">{unsigned.length}</p>
        </div>
      </div>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>AI Tax Prep status</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Filed model: NOVARA reads documents, shows the plan, you approve, then fields are entered. Your team keeps
          final sign-off.
        </p>
        <div className="row-item">
          <div>
            <strong>Pipeline</strong>
            <span className="row-meta">{entryPlanStatus.replace('_', ' ')} · {preEntryNotes.length} pre-entry notes</span>
          </div>
          <Link to="/app/preparer/entry-plan">Open</Link>
        </div>
        <div className="row-item">
          <div>
            <strong>Binder</strong>
            <span className="row-meta">Docs · Forms · Notes with source provenance</span>
          </div>
          <Link to="/app/preparer/workspace">Open</Link>
        </div>
        <div className="row-item">
          <div>
            <strong>TP personal fee</strong>
            <span className="row-meta">Approved Addendum F</span>
          </div>
          <strong>{formatMoney(89.99)}</strong>
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Client return inbox</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>State</th>
                <th>Ready</th>
                <th>Fee</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.clientName}</td>
                  <td>{r.returnType}</td>
                  <td>{r.state}</td>
                  <td>{r.readiness}%</td>
                  <td>{r.feeSnapshot.map((f) => formatMoney(f.amount)).join(', ')}</td>
                  <td>
                    <Link
                      to="/app/preparer/workspace"
                      onClick={() => actions.setActiveReturn(r.id)}
                    >
                      Binder
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
