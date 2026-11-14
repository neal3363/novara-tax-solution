import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'

export function AdminHome() {
  const { currentUser } = useAppStore()
  const stats = actions.platformStats()

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Platform Admin AI</p>
          <h1>System status</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/admin/tax-law">Tax-law updates</Link>
        <button className="btn btn-secondary" type="button" onClick={() => actions.resetDemo()}>
          Reset local demo data
        </button>
      </header>

      <p className="muted rise">
        Signed in as {currentUser?.name}. Taxpayer documents and returns are not opened by default — only aggregate
        platform metrics and audited support grants are available.
      </p>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Returns (aggregate)</p>
          <p className="value">{stats.returnCount}</p>
        </div>
        <div className="stat panel">
          <p className="label">Documents (aggregate)</p>
          <p className="value">{stats.documentCount}</p>
        </div>
        <div className="stat panel">
          <p className="label">Tenants</p>
          <p className="value">{stats.tenantCount}</p>
        </div>
        <div className="stat panel">
          <p className="label">Content access</p>
          <p className="value">{stats.contentAccess ? 'Granted' : 'Off'}</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel">
          <h2>Feature flags</h2>
          {[
            ['Business returns', 'On for business-enabled tiers'],
            ['Bank products', 'Off until partner contract'],
            ['Resolution Center', 'Data hooks only (V3 UI)'],
            ['Proprietary MeF transmitter', 'Off — V1 uses adapter'],
            ['Admin document browse', 'Off — audited support grant required'],
          ].map(([k, v]) => (
            <div className="row-item" key={k}>
              <div>
                <strong>{k}</strong>
                <span className="row-meta">{v}</span>
              </div>
            </div>
          ))}
        </section>
        <section className="list-panel panel">
          <h2>Compliance baseline</h2>
          {[
            'Unique tenant IDs on every client, return, and vault file',
            'Server-side authorization — never UI-only filtering',
            'Admin has no default access to taxpayer documents',
            'TP/Office: unlimited clients & returns; per-return fees only',
            'Consent + audit required before any cross-tenant transfer',
          ].map((t) => (
            <div className="row-item" key={t}>
              <div>
                <strong>{t}</strong>
              </div>
              <span className="badge badge-ok">Required</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
