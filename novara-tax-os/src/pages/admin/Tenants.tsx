import '../shared.css'

/** Admin placeholder rows — no live multi-tenant PII. */
const TENANTS = [
  {
    id: 'tenant-platform',
    name: 'NOVARA platform',
    efin: 'Platform ERO path',
    tier: 'Internal',
    users: 0,
  },
]

export function Tenants() {
  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tenant management</p>
          <h1>Offices & channels</h1>
          <p className="muted">Live office tenants appear here after registration — this view does not embed other customers’ data.</p>
        </div>
      </header>
      <section className="list-panel panel rise">
        {TENANTS.map((t) => (
          <div className="row-item" key={t.id}>
            <div>
              <strong>{t.name}</strong>
              <span className="row-meta">
                {t.efin} · {t.tier} · {t.users} users
              </span>
            </div>
            <span className="badge">Active</span>
          </div>
        ))}
      </section>
    </div>
  )
}
