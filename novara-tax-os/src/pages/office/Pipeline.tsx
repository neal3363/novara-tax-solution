import { useAppStore } from '../../store/useAppStore'
import '../shared.css'

export function Pipeline() {
  const { returns } = useAppStore()

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Practice management</p>
          <h1>Client pipeline</h1>
        </div>
      </header>
      <section className="list-panel panel rise">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th>
                <th>Return</th>
                <th>Workflow state</th>
                <th>Readiness</th>
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
                  <td>{new Date(r.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
