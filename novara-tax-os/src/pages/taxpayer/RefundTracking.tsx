import { Link } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import { buildRefundTrackingSnapshot } from '../../engine/refundTracking'
import { RefundMaximizer } from '../../components/benefits/RefundMaximizer'
import { BalanceDuePanel } from '../../components/filing/BalanceDuePanel'
import { buildBalanceDueGuidance } from '../../engine/balanceDuePayments'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../../components/filing/FilingPanels.css'

export function RefundTrackingPage() {
  const {
    currentUser,
    returns,
    activeReturnId,
    activeTaxYear,
    benefitReport,
    taxProfile,
    refundDelivery,
    bankProductApplication,
  } = useAppStore()

  const mine =
    returns.find((r) => r.id === activeReturnId) ??
    returns.find((r) => r.clientId === currentUser?.id && r.taxYear === activeTaxYear)

  const balanceGuidance = buildBalanceDueGuidance({
    refundOrBalance: benefitReport?.projectedRefund ?? mine?.refundOrOwe ?? 0,
    taxYear: activeTaxYear,
    filingState: String(taxProfile.answers.filing_state || ''),
  })

  const snap = buildRefundTrackingSnapshot({
    taxReturn: mine,
    verifiedRefund: benefitReport?.projectedRefund ?? mine?.refundOrOwe ?? 0,
    delivery: refundDelivery,
    bankApp: bankProductApplication,
  })

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Refund & filing status</p>
          <h1>Refund tracking</h1>
        </div>
        <div className="benefit-actions">
          <Link className="btn btn-secondary" to="/app/taxpayer/final-review">
            Sign & file
          </Link>
          <button className="btn btn-ghost" type="button" onClick={() => actions.runBenefitScan()}>
            Refresh maximizer
          </button>
        </div>
      </header>

      <p className="muted" style={{ maxWidth: '44rem' }}>
        NOVARA, IRS, and bank-provider statuses are shown separately. Sandbox acknowledgments are labeled — this is not a
        live IRS Where’s My Refund feed.
      </p>

      <div className="tracking-grid">
        <div className="tracking-card">
          <p className="label">NOVARA</p>
          <strong>{snap.novaraPhase}</strong>
        </div>
        <div className="tracking-card">
          <p className="label">IRS</p>
          <strong>{snap.irsPhase}</strong>
        </div>
        <div className="tracking-card">
          <p className="label">Bank provider</p>
          <strong>{snap.bankPhase}</strong>
        </div>
      </div>

      <section className="filing-panel">
        <h2>Verified refund</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Delivery method: {snap.deliveryMethod?.replace(/_/g, ' ') ?? 'not selected'} · Verified amount{' '}
          {formatMoney(snap.verifiedRefund)}
        </p>
        {snap.rejectionReason && (
          <p role="status">
            Rejection: {snap.rejectionReason}
            {snap.canCorrect ? ' — open the questionnaire to correct and resubmit.' : ''}
          </p>
        )}
        <ul className="tracking-events">
          {snap.events.map((e) => (
            <li key={e.id}>
              <span className="src">{e.source}</span>
              <strong>{e.title}</strong>
              <div className="muted">{e.detail}</div>
            </li>
          ))}
        </ul>
      </section>

      <BalanceDuePanel guidance={balanceGuidance} />
      <RefundMaximizer report={benefitReport} profile={taxProfile} />
    </div>
  )
}
