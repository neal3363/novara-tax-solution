import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import {
  OFFICE_PIPELINE_STATUSES,
  mapReturnToOfficeStatus,
  officeDashboardMetrics,
} from '../../engine/officePipeline'
import { runPreFilingQa } from '../../engine/qaEngine'
import '../shared.css'

export function Pipeline() {
  const { returns, benefitReport, taxProfile, documents, benefitReviewSigned, currentUser } = useAppStore()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterPreparer, setFilterPreparer] = useState<string>('all')

  const metrics = officeDashboardMetrics(returns)
  const years = Array.from(new Set(returns.map((r) => r.taxYear))).sort((a, b) => b - a)
  const preparers = Array.from(new Set(returns.map((r) => r.preparerId).filter(Boolean))) as string[]

  const rows = useMemo(() => {
    return returns
      .map((r) => {
        const qa = runPreFilingQa({
          profile: { ...taxProfile, taxYear: r.taxYear },
          documents: documents.filter((d) => d.taxYear === r.taxYear),
          taxReturn: r,
          benefitReviewSigned,
          authorizedToFile: false,
        })
        const status = mapReturnToOfficeStatus(r, { qaCritical: !qa.canFile })
        return { r, status, qa }
      })
      .filter((row) => (filterStatus === 'all' ? true : row.status === filterStatus))
      .filter((row) => (filterYear === 'all' ? true : String(row.r.taxYear) === filterYear))
      .filter((row) => (filterPreparer === 'all' ? true : row.r.preparerId === filterPreparer))
  }, [returns, taxProfile, documents, benefitReviewSigned, filterStatus, filterYear, filterPreparer])

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Office · {currentUser?.tenantId}</p>
          <h1>Return status dashboard</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/office/request-docs">
          Request documents
        </Link>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Active clients</p>
          <p className="value">{metrics.totalActive}</p>
        </div>
        <div className="stat panel">
          <p className="label">In progress</p>
          <p className="value">{metrics.inProgress}</p>
        </div>
        <div className="stat panel">
          <p className="label">Waiting on clients</p>
          <p className="value">{metrics.waitingOnClients}</p>
        </div>
        <div className="stat panel">
          <p className="label">Ready to file</p>
          <p className="value">{metrics.readyToFile}</p>
        </div>
        <div className="stat panel">
          <p className="label">Accepted / Rejected</p>
          <p className="value" style={{ fontSize: '1.1rem' }}>
            {metrics.accepted} / {metrics.rejected}
          </p>
        </div>
        <div className="stat panel">
          <p className="label">Est. prep revenue</p>
          <p className="value" style={{ fontSize: '1.1rem' }}>
            {formatMoney(metrics.estimatedRevenue)}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        <label>
          Status{' '}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            {OFFICE_PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tax year{' '}
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="all">All</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preparer{' '}
          <select value={filterPreparer} onChange={(e) => setFilterPreparer(e.target.value)}>
            <option value="all">All</option>
            {preparers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="list-panel panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Client</th>
                <th>Year</th>
                <th>Type</th>
                <th>Office status</th>
                <th>Refund/Bal</th>
                <th>QA</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, status, qa }) => (
                <tr key={r.id}>
                  <td>{r.clientName}</td>
                  <td>{r.taxYear}</td>
                  <td>
                    {r.returnType}
                    {r.filingMode === 'amended' ? ' · amended' : ''}
                  </td>
                  <td>{status}</td>
                  <td>{formatMoney(r.refundOrOwe || benefitReport?.projectedRefund || 0)}</td>
                  <td>{qa.canFile ? 'Clear' : `${qa.criticalCount} critical`}</td>
                  <td>{new Date(r.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          IRS Accepted / Rejected only appear after an authorized e-file provider response (sandbox demo uses return
          state). Rejection codes will display from the provider when connected — never invented.
        </p>
      </section>
    </div>
  )
}
