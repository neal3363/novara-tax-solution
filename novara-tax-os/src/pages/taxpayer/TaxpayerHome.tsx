import { Link } from 'react-router-dom'
import { useAppStore, actions } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import '../shared.css'

export function TaxpayerHome() {
  const { currentUser, returns, documents, prepStep, benefitReport } = useAppStore()
  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === 2025) ?? returns[0]
  const openBenefits = benefitReport?.findings.filter((f) => f.status === 'needs_info' || f.status === 'eligible_unverified') ?? []
  const alerts = [
    documents.some((d) => d.status === 'needs_review') ? 'One document needs verification' : null,
    prepStep < 3 ? 'Finish preparation questions to unlock Your Result' : null,
    openBenefits.length ? `${openBenefits.length} tax-savings items need answers or verification` : null,
    mine?.state === 'Accepted' ? 'Refund tracker: Accepted — monitoring deposit' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Upload → Answer → Review → Approve</p>
          <h1>Hi, {currentUser?.name.split(' ')[0]}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/app/taxpayer/vault">
            Upload documents
          </Link>
          <Link className="btn btn-secondary" to="/app/taxpayer/benefits">
            Tax savings
          </Link>
          <Link className="btn btn-primary" to="/app/taxpayer/prepare">
            {prepStep === 0 ? 'Start My Taxes' : 'Continue preparation'}
          </Link>
        </div>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Tax year</p>
          <p className="value">2025</p>
        </div>
        <div className="stat panel">
          <p className="label">Readiness</p>
          <p className="value">{mine?.readiness ?? 0}%</p>
        </div>
        <div className="stat panel">
          <p className="label">Status</p>
          <p className="value" style={{ fontSize: '1.15rem' }}>
            {mine?.state ?? 'Intake'}
          </p>
        </div>
        <div className="stat panel">
          <p className="label">Projected refund</p>
          <p className="value" style={{ fontSize: '1.25rem' }}>
            {formatMoney(benefitReport?.projectedRefund ?? mine?.refundOrOwe ?? 0)}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <RefundTracker report={benefitReport} />
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel rise rise-delay-1">
          <h2>Alerts & outstanding questions</h2>
          {alerts.length === 0 ? (
            <p className="muted">You’re clear — nothing needs attention right now.</p>
          ) : (
            alerts.map((a) => (
              <div className="row-item" key={a}>
                <div>
                  <strong>{a}</strong>
                  <span className="row-meta">Human Anytime is always available.</span>
                </div>
                <span className="badge badge-warn">Action</span>
              </div>
            ))
          )}
          <Link className="btn btn-secondary" to="/app/taxpayer/benefits/interview" style={{ marginTop: '0.5rem' }}>
            Answer benefit questions
          </Link>
        </section>

        <section className="list-panel panel rise rise-delay-2">
          <h2>Tax-savings summary</h2>
          <div className="row-item">
            <div>
              <strong>Verified savings</strong>
              <span className="row-meta">Applied after eligibility checks</span>
            </div>
            <strong>{formatMoney(benefitReport?.verifiedSavings ?? 0)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Potential savings</strong>
              <span className="row-meta">Needs info or verification</span>
            </div>
            <strong>{formatMoney(benefitReport?.potentialSavings ?? 0)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>Find more tax savings</strong>
              <span className="row-meta">Rerun eligibility assessment</span>
            </div>
            <button className="btn btn-ghost" type="button" onClick={() => actions.runBenefitScan()}>
              Run
            </button>
          </div>
          <div className="row-item">
            <div>
              <strong>Document Manager</strong>
              <span className="row-meta">{documents.length} files</span>
            </div>
            <Link to="/app/taxpayer/vault">Open</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
