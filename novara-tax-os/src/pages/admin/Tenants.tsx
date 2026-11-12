import '../shared.css'

const TENANTS = [
  {
    id: 'tenant-summit',
    name: 'Summit Tax Office',
    efin: 'EFIN ****4521',
    tier: 'Starter Office ($899 floor)',
    users: 4,
  },
  {
    id: 'tenant-novara-direct',
    name: 'NOVARA Direct Consumer',
    efin: 'Platform ERO path',
    tier: 'Consumer service',
    users: 1,
  },
]

export function Tenants() {
  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tenant management</p>
          <h1>Offices & channels</h1>
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
