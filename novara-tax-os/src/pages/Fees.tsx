import { CONSUMER_PRICES, OFFICE_TIERS, TP_FEES, formatMoney } from '../data/fees'
import './shared.css'

export function Fees() {
  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Addendum F fee catalog</p>
          <h1>Pricing & entitlements</h1>
        </div>
      </header>

      <section className="list-panel panel rise">
        <h2>Approved independent TP fees</h2>
        {TP_FEES.map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
              <span className="row-meta">{f.note}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>{formatMoney(f.amount)}</strong>
              <div>
                <span className="badge badge-ok">{f.status}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Tax-office subscriptions</h2>
        {OFFICE_TIERS.map((t) => (
          <div className="row-item" key={t.id}>
            <div>
              <strong>{t.name}</strong>
              <span className="row-meta">
                {t.blurb} · Business returns: {t.businessReturns ? 'Yes' : 'No'}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>{t.annual != null ? `${formatMoney(t.annual)}/yr` : 'Custom / TBD'}</strong>
              <div>
                <span className={`badge ${t.status === 'approved' ? 'badge-ok' : 'badge-warn'}`}>{t.status}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Direct consumer prices — provisional</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Discussed as proposals — not approved final prices. Configurable pending approval.
        </p>
        {CONSUMER_PRICES.map((f) => (
          <div className="row-item" key={f.id}>
            <div>
              <strong>{f.label}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>From {formatMoney(f.amount)}</strong>
              <div>
                <span className="badge badge-warn">{f.status}</span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
