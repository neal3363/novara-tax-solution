import { useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import '../shared.css'

/**
 * Pipeline is status tracking for the office. The tax-preparation engine lives in the
 * preparer Return workspace + Benefit Optimization screens.
 */
export function Pipeline() {
  const { returns, benefitReport } = useAppStore()

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Practice management</p>
          <h1>Client pipeline</h1>
        </div>
        <span className="badge badge-neutral">Status board</span>
      </header>

      <section className="list-panel panel rise">
        <h2>What Pipeline does</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Pipeline tracks return status across the office. It is <strong>not</strong> the tax-preparation engine.
          Preparers enter income, dependents, childcare, education, and deductions in the preparer{' '}
          <strong>Return</strong> workspace, then run Tax Benefit Optimization before filing.
        </p>
        <div className="row-item">
          <div>
            <strong>Working-return projected refund</strong>
            <span className="row-meta">From the benefit engine on the active return profile</span>
          </div>
          <strong>{formatMoney(benefitReport?.projectedRefund ?? 0)}</strong>
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th>
                <th>Return</th>
                <th>Workflow state</th>
                <th>Ready</th>
                <th>Benefit audit</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.clientName}</td>
                  <td>{r.returnType}</td>
                  <td>{r.state}</td>
                  <td>{r.readiness}%</td>
                  <td>{r.state === 'Ready to File' || r.readiness >= 96 ? 'Cleared / near-clear' : 'In progress'}</td>
                  <td>{new Date(r.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          To open and edit a return: sign in as <strong>Tax preparer</strong> → <strong>Return</strong> or{' '}
          <strong>Benefits</strong>.
        </p>
      </section>
    </div>
  )
}
