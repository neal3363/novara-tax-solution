import { UNLIMITED_CLIENTS_COPY } from '../../data/fees'
import { useAppStore } from '../../store/useAppStore'
import '../shared.css'

export function Clients() {
  const { returns, currentUser } = useAppStore()
  const clients = Array.from(new Map(returns.map((r) => [r.clientId, r])).values())

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Private client workspace · {currentUser?.tenantId ?? '—'} · {UNLIMITED_CLIENTS_COPY}
          </p>
          <h1>Clients</h1>
        </div>
        <span className="badge badge-ok">{clients.length} in this tenant</span>
      </header>
      <section className="list-panel panel rise">
        {clients.length === 0 && <p className="muted">No clients visible in your isolated tenant.</p>}
        {clients.map((c) => (
          <div className="row-item" key={c.clientId}>
            <div>
              <strong>{c.clientName}</strong>
              <span className="row-meta">
                {c.returnType} · TY{c.taxYear} · {c.state}
                {'tenantId' in c && c.tenantId ? ` · ${c.tenantId}` : ''}
              </span>
            </div>
            <span className={`badge ${c.isBusiness ? 'badge-warn' : ''}`}>{c.isBusiness ? 'Business' : 'Personal'}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
