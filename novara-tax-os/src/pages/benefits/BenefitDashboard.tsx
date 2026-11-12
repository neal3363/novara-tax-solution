import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, STATUS_LABELS, type BenefitCategory } from '../../data/benefitsCatalog'
import { formatMoney } from '../../data/fees'
import { nextInterviewQuestions, runBenefitOptimization } from '../../engine/benefitOptimizer'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './Benefits.css'

function statusBadge(status: string) {
  if (status === 'applied') return 'badge-ok'
  if (status === 'needs_info' || status === 'flagged_review') return 'badge-warn'
  return 'badge-neutral'
}

export function BenefitDashboard() {
  const { benefitReport, taxProfile, benefitReviewSigned, currentUser, auditEvents, uploadIssues } = useAppStore()
  const report = benefitReport
  const live = runBenefitOptimization(taxProfile)
  const questions = nextInterviewQuestions(taxProfile, live)
  const isPreparer = currentUser?.role === 'preparer'
  const interviewPath = isPreparer ? '/app/preparer/benefits/interview' : '/app/taxpayer/benefits/interview'
  const reviewPath = isPreparer ? '/app/preparer/benefits/review' : '/app/taxpayer/benefits/review'
  const vaultPath = isPreparer ? '/app/preparer/clients' : '/app/taxpayer/vault'
  const preparePath = isPreparer ? '/app/preparer/return' : '/app/taxpayer/prepare'

  const actionable =
    report?.findings.filter((f) => f.status !== 'ineligible').slice(0, 12) ??
    live.findings.filter((f) => f.status !== 'ineligible').slice(0, 12)

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Upload → Answer → Review → Approve</p>
          <h1>Tax Savings</h1>
        </div>
        <div className="benefit-actions">
          <button className="btn btn-secondary" type="button" onClick={() => actions.runBenefitScan()}>
            Recheck my savings
          </button>
          <Link className="btn btn-primary" to={interviewPath}>
            Answer questions
          </Link>
        </div>
      </header>

      <p className="muted" style={{ marginTop: '-0.35rem', maxWidth: '42rem' }}>
        NOVARA looks for every legally available credit and deduction supported by your documents and answers. Verified
        amounts update your refund estimate; possible savings stay separate until confirmed.
      </p>

      <RefundTracker report={report} />

      {uploadIssues.length > 0 && (
        <section className="list-panel panel" style={{ marginTop: '1rem' }}>
          <h2>Document checks</h2>
          {uploadIssues.slice(0, 5).map((issue) => (
            <div className="row-item" key={`${issue.kind}-${issue.title}`}>
              <div>
                <strong>{issue.title}</strong>
                <span className="row-meta">{issue.detail}</span>
              </div>
              <span className={`badge ${issue.severity === 'high' ? 'badge-warn' : 'badge-neutral'}`}>{issue.kind}</span>
            </div>
          ))}
        </section>
      )}

      <section style={{ marginTop: '1.25rem' }}>
        <h2 className="savings-section-title">Benefits to review</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Each card has a clear next step. Nothing is claimed until you verify it.
        </p>
        <div className="savings-card-grid">
          {actionable.map((f) => (
            <article className="savings-card" key={f.ruleId}>
              <div className="savings-card-top">
                <h3>{f.shortName || f.name}</h3>
                <span className={`badge ${statusBadge(f.status)}`}>
                  {STATUS_LABELS[f.status] ?? f.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="savings-card-body">{f.explanation}</p>
              <p className="savings-card-meta">
                {CATEGORY_LABELS[f.category as BenefitCategory] ?? f.category}
                {f.estimatedSavings > 0 ? ` · up to ${formatMoney(f.estimatedSavings)}` : ''}
              </p>
              <div className="savings-card-actions">
                <Link
                  className="btn btn-primary"
                  to={interviewPath}
                  onClick={() => actions.startBenefitCheck(f.ruleId)}
                >
                  Check if I qualify
                </Link>
                <Link className="btn btn-secondary" to={vaultPath}>
                  Upload document
                </Link>
                <Link className="btn btn-ghost" to={interviewPath}>
                  Answer questions
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid-2" style={{ marginTop: '1.25rem' }}>
        <section className="list-panel panel">
          <h2>Next questions</h2>
          {questions.length === 0 ? (
            <p className="muted">No open questions — upload more documents or continue to review.</p>
          ) : (
            questions.slice(0, 4).map((q) => (
              <div className="row-item" key={q.id}>
                <div>
                  <strong>{q.prompt}</strong>
                </div>
                <Link to={interviewPath}>Answer</Link>
              </div>
            ))
          )}
          <div className="row-item">
            <div>
              <strong>Final benefit review</strong>
              <span className="row-meta">
                {benefitReviewSigned
                  ? 'Signed — filing gate unlocked'
                  : report?.auditComplete
                    ? 'Ready for approval'
                    : `${report?.blockers.length ?? questions.length} items still open`}
              </span>
            </div>
            <Link to={reviewPath}>Review</Link>
          </div>
          <Link className="btn btn-secondary" to={preparePath} style={{ marginTop: '0.75rem' }}>
            Back to prepare workflow
          </Link>
        </section>

        <section className="list-panel panel">
          <h2>Activity (safe audit trail)</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Document extraction, answers, and recalculations — without logging Social Security numbers.
          </p>
          {auditEvents.length === 0 ? (
            <p className="muted">No events yet this session.</p>
          ) : (
            auditEvents
              .slice()
              .reverse()
              .slice(0, 8)
              .map((e) => (
                <div className="row-item" key={e.id}>
                  <div>
                    <strong>{e.action.replace(/_/g, ' ')}</strong>
                    <span className="row-meta">
                      {e.summary} · {new Date(e.at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
          )}
        </section>
      </div>

      {report && report.comparisonNotes.length > 0 && (
        <section className="list-panel panel" style={{ marginTop: '1rem' }}>
          <h2>What NOVARA compared</h2>
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
