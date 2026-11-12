import '../shared.css'

const STAFF = [
  { name: 'Morgan Lee', role: 'EFIN Owner', ptin: '—', access: 'Full office' },
  { name: 'Alex Rivera', role: 'Signing Preparer', ptin: 'P12345678', access: 'Assigned returns' },
  { name: 'Jamie Patel', role: 'Reviewer / Expert', ptin: 'P87654321', access: 'Escalations' },
  { name: 'Chris Wong', role: 'Bookkeeper', ptin: '—', access: 'Accounting only' },
]

export function Staff() {
  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Roles & credentials</p>
          <h1>Staff</h1>
        </div>
      </header>
      <section className="list-panel panel rise">
        <p className="muted" style={{ marginTop: 0 }}>
          EFINs are firm-specific credentials — never interchangeable login credentials. A PTIN alone does not grant
          authority to file under another office’s EFIN.
        </p>
        {STAFF.map((s) => (
          <div className="row-item" key={s.name}>
            <div>
              <strong>{s.name}</strong>
              <span className="row-meta">
                {s.role} · PTIN {s.ptin} · {s.access}
              </span>
            </div>
            <span className="badge">Active</span>
          </div>
        ))}
      </section>
    </div>
  )
}
