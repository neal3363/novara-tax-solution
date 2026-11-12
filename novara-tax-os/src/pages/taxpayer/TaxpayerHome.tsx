import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import '../shared.css'

export function TaxpayerHome() {
  const { currentUser, returns, documents, prepStep } = useAppStore()
  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === 2025) ?? returns[0]
  const alerts = [
    documents.some((d) => d.status === 'needs_review') ? 'One document needs verification' : null,
    prepStep < 3 ? 'Finish smart questions to unlock Your Result' : null,
    mine?.state === 'Accepted' ? 'Refund tracker: Accepted — monitoring deposit' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Year-round home</p>
          <h1>Hi, {currentUser?.name.split(' ')[0]}</h1>
        </div>
        <Link className="btn btn-primary" to="/app/taxpayer/prepare">
          {prepStep === 0 ? 'Start My Taxes' : 'Continue preparation'}
        </Link>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Tax year</p>
          <p className="value">2025</p>
        </div>
        <div className="stat panel">
          <p className="label">Readiness</p>
          <p className="value">{mine?.readiness ?? 0}%</p>
        </div>
        <div className="stat panel">
          <p className="label">Status</p>
          <p className="value" style={{ fontSize: '1.15rem' }}>
            {mine?.state ?? 'Intake'}
          </p>
        </div>
        <div className="stat panel">
          <p className="label">Estimate</p>
          <p className="value" style={{ fontSize: '1.25rem' }}>
            {mine && mine.refundOrOwe !== 0
              ? mine.refundOrOwe > 0
                ? formatMoney(mine.refundOrOwe)
                : `Owe ${formatMoney(Math.abs(mine.refundOrOwe))}`
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel rise rise-delay-1">
          <h2>Alerts</h2>
          {alerts.length === 0 ? (
            <p className="muted">You’re clear — nothing needs attention right now.</p>
          ) : (
            alerts.map((a) => (
              <div className="row-item" key={a}>
                <div>
                  <strong>{a}</strong>
                  <span className="row-meta">Act when ready — Human Anytime is always available.</span>
                </div>
                <span className="badge badge-warn">Action</span>
              </div>
            ))
          )}
        </section>
        <section className="list-panel panel rise rise-delay-2">
          <h2>Quick links</h2>
          <div className="row-item">
            <div>
              <strong>Tax Vault</strong>
              <span className="row-meta">{documents.length} documents secured locally</span>
            </div>
            <Link to="/app/taxpayer/vault">Open</Link>
          </div>
          <div className="row-item">
            <div>
              <strong>Personal Tax AI</strong>
              <span className="row-meta">Explain status, missing items, next steps</span>
            </div>
            <Link to="/app/taxpayer/ai">Ask</Link>
          </div>
          <div className="row-item">
            <div>
              <strong>Live refund tracker</strong>
              <span className="row-meta">{mine?.state ?? 'Not filed'}</span>
            </div>
            <span className="badge">{mine?.state === 'Accepted' ? 'On track' : 'Pending'}</span>
          </div>
        </section>
      </div>
    </div>
  )
}
