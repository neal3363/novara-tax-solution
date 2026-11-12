import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import '../shared.css'

export function PreparerHome() {
  const { returns, currentUser } = useAppStore()
  const mine = returns.filter((r) => r.preparerId === currentUser?.id || true)
  const review = mine.filter((r) => ['Preparer Review', 'Diagnostics', 'Extraction/Verification'].includes(r.state))
  const unsigned = mine.filter((r) => r.state === 'Signature Pending')

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Preparer AI · Summit Tax Office</p>
          <h1>Return inbox</h1>
        </div>
        <Link className="btn btn-primary" to="/app/preparer/workspace">
          Open workspace
        </Link>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Assigned</p>
          <p className="value">{mine.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Needs review</p>
          <p className="value">{review.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Unsigned</p>
          <p className="value">{unsigned.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">TP fee (personal)</p>
          <p className="value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(89.99)}
          </p>
        </div>
      </div>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Pre-built return inbox</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Client uploads arrive as drafted returns waiting for review. AI Review Notes highlight risk and open questions.
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>State</th>
                <th>Ready</th>
                <th>Fee snapshot</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((r) => (
                <tr key={r.id}>
                  <td>{r.clientName}</td>
                  <td>{r.returnType}</td>
                  <td>{r.state}</td>
                  <td>{r.readiness}%</td>
                  <td>{r.feeSnapshot.map((f) => formatMoney(f.amount)).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
