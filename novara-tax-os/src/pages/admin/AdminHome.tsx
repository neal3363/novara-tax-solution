import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'

export function AdminHome() {
  const { returns, documents } = useAppStore()

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Platform Admin AI</p>
          <h1>System status</h1>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => actions.resetDemo()}>
          Reset local demo data
        </button>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Returns (local)</p>
          <p className="value">{returns.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Documents</p>
          <p className="value">{documents.length}</p>
        </div>
        <div className="stat panel">
          <p className="label">Tenants</p>
          <p className="value">2</p>
        </div>
        <div className="stat panel">
          <p className="label">Risk queue</p>
          <p className="value">0</p>
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
            'Tenant isolation enforced in API design (demo is single-browser store)',
            'Consent engine required before non-preparation use',
            'AI cannot transmit, invent evidence, or replace calculations',
            'Immutable fee snapshots per engagement',
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
