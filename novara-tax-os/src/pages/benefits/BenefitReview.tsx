import { Link } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import { actions, useAppStore } from '../../store/useAppStore'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import '../shared.css'
import './Benefits.css'

export function BenefitReview() {
  const { benefitReport, benefitReviewSigned, currentUser } = useAppStore()
  const dashPath = currentUser?.role === 'preparer' ? '/app/preparer/benefits' : '/app/taxpayer/benefits'

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mandatory final review</p>
          <h1>Tax-benefit eligibility audit</h1>
        </div>
        <Link className="btn btn-secondary" to={dashPath}>
          Discovery
        </Link>
      </header>

      <RefundTracker report={benefitReport} />

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Pre-submit checklist</h2>
        <ul className="checklist">
          <li>Complete tax-benefit eligibility audit run</li>
          <li>Relevant questions answered or explicitly marked unresolved</li>
          <li>Required supporting documentation verified or flagged</li>
          <li>Incompatible credits/deductions/elections checked</li>
          <li>Federal (and applicable state) recalculated</li>
          <li>Uncertain eligibility flagged for human review</li>
          <li>Preparer and taxpayer approvals captured</li>
        </ul>

        {benefitReport?.blockers.length ? (
          <div className="blockers">
            <h3>Open blockers</h3>
            {benefitReport.blockers.map((b) => (
              <div className="row-item" key={b}>
                <div>
                  <strong>{b}</strong>
                </div>
                <span className="badge badge-warn">Resolve</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="callout-success">
            <strong>No open blockers in the demo ruleset.</strong>
            <p className="muted">Audit complete flag: {benefitReport?.auditComplete ? 'Yes' : 'No'}</p>
          </div>
        )}

        <div className="row-item">
          <div>
            <strong>Projected refund after verified benefits</strong>
            <span className="row-meta">NOVARA will not claim every benefit is secured while eligibility is unverified</span>
          </div>
          <strong>{formatMoney(benefitReport?.projectedRefund ?? 0)}</strong>
        </div>

        <div className="benefit-actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-secondary" type="button" onClick={() => actions.runBenefitScan()}>
            Re-run audit
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={benefitReviewSigned}
            onClick={() => actions.completeBenefitReview()}
          >
            {benefitReviewSigned ? 'Approvals recorded' : 'Complete benefit review & unlock filing'}
          </button>
        </div>
      </section>
    </div>
  )
}
