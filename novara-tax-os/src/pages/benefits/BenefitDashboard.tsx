import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, type BenefitCategory } from '../../data/benefitsCatalog'
import { formatMoney } from '../../data/fees'
import { nextInterviewQuestions, runBenefitOptimization } from '../../engine/benefitOptimizer'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './Benefits.css'

export function BenefitDashboard() {
  const { benefitReport, taxProfile, benefitReviewSigned, currentUser } = useAppStore()
  const report = benefitReport
  const live = runBenefitOptimization(taxProfile)
  const questions = nextInterviewQuestions(taxProfile, live)

  const groups = (status: string) => report?.findings.filter((f) => f.status === status) ?? []

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mandatory Tax Benefit Optimization Engine</p>
          <h1>Tax Savings Discovery</h1>
        </div>
        <div className="benefit-actions">
          <button className="btn btn-secondary" type="button" onClick={() => actions.runBenefitScan()}>
            Find More Tax Savings
          </button>
          <Link className="btn btn-primary" to={currentUser?.role === 'preparer' ? '/app/preparer/return' : '/app/taxpayer/benefits/interview'}>
            {currentUser?.role === 'preparer' ? 'Open return' : 'Continue interview'}
          </Link>
        </div>
      </header>

      <RefundTracker report={report} />

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel">
          <h2>Tax Savings Discovery panel</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Overlooked benefits are probed even when the taxpayer did not volunteer them. Engine never assumes
            ineligibility without asking.
          </p>
          {(report?.findings.filter((f) => f.status !== 'ineligible') ?? []).slice(0, 8).map((f) => (
            <div className="row-item" key={f.ruleId}>
              <div>
                <strong>{f.shortName}</strong>
                <span className="row-meta">
                  {CATEGORY_LABELS[f.category as BenefitCategory] ?? f.category} · {f.ruleCitation}
                </span>
                <span className="row-meta">{f.explanation}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>{formatMoney(f.estimatedSavings)}</strong>
                <div>
                  <span
                    className={`badge ${
                      f.status === 'applied'
                        ? 'badge-ok'
                        : f.status === 'needs_info' || f.status === 'flagged_review'
                          ? 'badge-warn'
                          : 'badge-neutral'
                    }`}
                  >
                    {f.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="list-panel panel">
          <h2>Outstanding questions & docs</h2>
          {questions.length === 0 ? (
            <p className="muted">No interview prompts queued — run Find More Tax Savings or open the interview.</p>
          ) : (
            questions.map((q) => (
              <div className="row-item" key={q.id}>
                <div>
                  <strong>{q.prompt}</strong>
                  <span className="row-meta">Maps to {q.mapsTo}</span>
                </div>
                <Link to={currentUser?.role === 'preparer' ? '/app/preparer/return' : '/app/taxpayer/benefits/interview'}>
                  Answer
                </Link>
              </div>
            ))
          )}
          <div className="row-item">
            <div>
              <strong>Mandatory final review</strong>
              <span className="row-meta">
                {benefitReviewSigned
                  ? 'Signed — filing gate unlocked'
                  : report?.auditComplete
                    ? 'Ready for preparer/taxpayer approval'
                    : `${report?.blockers.length ?? 0} blockers remain`}
              </span>
            </div>
            <Link to={currentUser?.role === 'preparer' ? '/app/preparer/benefits/review' : '/app/taxpayer/benefits/review'}>
              Review
            </Link>
          </div>
        </section>
      </div>

      <div className="benefit-status-grid" style={{ marginTop: '1rem' }}>
        {[
          ['Applied', groups('applied')],
          ['Needs info', groups('needs_info')],
          ['Eligible (unverified)', groups('eligible_unverified')],
          ['Ineligible (explained)', groups('ineligible').slice(0, 6)],
        ].map(([title, items]) => {
          const list = items as { ruleId: string; shortName: string; explanation: string; estimatedSavings: number }[]
          return (
          <section className="list-panel panel" key={title as string}>
            <h2>{title as string}</h2>
            {list.length === 0 && <p className="muted">None</p>}
            {list.map((f) => (
              <div className="row-item" key={f.ruleId}>
                <div>
                  <strong>{f.shortName}</strong>
                  <span className="row-meta">{f.explanation}</span>
                </div>
                <strong>{formatMoney(f.estimatedSavings)}</strong>
              </div>
            ))}
          </section>
          )
        })}
      </div>

      {report && (
        <section className="list-panel panel" style={{ marginTop: '1rem' }}>
          <h2>Optimization comparisons</h2>
          {report.comparisonNotes.map((n) => (
            <div className="row-item" key={n}>
              <div>
                <strong>{n}</strong>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
