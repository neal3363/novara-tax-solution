import { useAppStore } from '../../store/useAppStore'
import { OFFICE_TIERS, formatMoney } from '../../data/fees'
import '../shared.css'

export function OfficeHome() {
  const { returns } = useAppStore()
  const unsigned = returns.filter((r) => r.state === 'Signature Pending').length
  const rejected = returns.filter((r) => r.state === 'Rejected').length
  const business = returns.filter((r) => r.isBusiness).length
  const revenue = returns.reduce((sum, r) => sum + r.feeSnapshot.reduce((s, f) => s + f.amount, 0), 0)

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tax Office AI</p>
          <h1>Summit Tax Office</h1>
        </div>
        <span className="badge badge-ok">Tenant isolated</span>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Pipeline</p>
          <p className="value">{returns.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Unsigned</p>
          <p className="value">{unsigned}</p>
        </div>
        <div className="stat panel">
          <p className="label">Business</p>
          <p className="value">{business}</p>
        </div>
        <div className="stat panel">
          <p className="label">Fee ledger</p>
          <p className="value" style={{ fontSize: '1.2rem' }}>
            {formatMoney(revenue)}
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel">
          <h2>Office Dashboard AI</h2>
          <div className="row-item">
            <div>
              <strong>How many returns are unsigned?</strong>
              <span className="row-meta">{unsigned} waiting on taxpayer e-sign</span>
            </div>
          </div>
          <div className="row-item">
            <div>
              <strong>Rejected returns</strong>
              <span className="row-meta">{rejected} in resolution workflow</span>
            </div>
          </div>
          <div className="row-item">
            <div>
              <strong>Bank products</strong>
              <span className="row-meta">Partner fees pending contract — show itemized estimates before charge</span>
            </div>
            <span className="badge badge-warn">Pending</span>
          </div>
        </section>
        <section className="list-panel panel">
          <h2>Subscription tier</h2>
          {OFFICE_TIERS.slice(0, 3).map((t) => (
            <div className="row-item" key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <span className="row-meta">{t.blurb}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>{t.annual != null ? formatMoney(t.annual) : 'TBD'}</strong>
                <div>
                  <span className={`badge ${t.status === 'approved' ? 'badge-ok' : 'badge-warn'}`}>{t.status}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
