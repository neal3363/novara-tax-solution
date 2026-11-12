import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'

const FILTERS = ['all', 'W-2', '1099-NEC', '1098', 'Bank Statement', 'Prior Return', 'Other']

export function Vault() {
  const { documents, vaultFilter } = useAppStore()
  const filtered = documents.filter((d) => vaultFilter === 'all' || d.type === vaultFilter)

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Secure Cloud Tax Vault</p>
          <h1>Your documents</h1>
        </div>
      </header>

      <div className="stepper" style={{ marginBottom: '1rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`step-pill ${vaultFilter === f ? 'active' : ''}`}
            onClick={() => actions.setVaultFilter(f)}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <section className="list-panel panel rise">
        <h2>
          {filtered.length} file{filtered.length === 1 ? '' : 's'} · organized by taxpayer & tax year
        </h2>
        {filtered.length === 0 && <p className="muted">No documents in this filter yet.</p>}
        {filtered.map((d) => (
          <div className="row-item" key={d.id}>
            <div>
              <strong>
                {d.name}
              </strong>
              <span className="row-meta">
                {d.type} · TY{d.taxYear} · {d.sizeLabel} · {new Date(d.uploadedAt).toLocaleString()}
              </span>
            </div>
            <span className={`badge ${d.status === 'needs_review' ? 'badge-warn' : 'badge-ok'}`}>
              {d.status}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
