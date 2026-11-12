import { useAppStore } from '../../store/useAppStore'
import '../shared.css'

export function Clients() {
  const { returns } = useAppStore()
  const clients = Array.from(new Map(returns.map((r) => [r.clientId, r])).values())

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">CRM basics</p>
          <h1>Clients</h1>
        </div>
      </header>
      <section className="list-panel panel rise">
        {clients.map((c) => (
          <div className="row-item" key={c.clientId}>
            <div>
              <strong>{c.clientName}</strong>
              <span className="row-meta">
                {c.returnType} · TY{c.taxYear} · {c.state}
              </span>
            </div>
            <span className={`badge ${c.isBusiness ? 'badge-warn' : ''}`}>{c.isBusiness ? 'Business' : 'Personal'}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
