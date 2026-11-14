import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, STATUS_LABELS, type BenefitCategory } from '../../data/benefitsCatalog'
import { formatMoney } from '../../data/fees'
import { runBenefitOptimization } from '../../engine/benefitOptimizer'
import { getQuestionnaire, listSupportedBenefitQuestionnaires } from '../../engine/benefitQuestionnaires'
import { buildDocumentChecklist, documentsStillNeeded } from '../../engine/documentChecklist'
import { AppliedBenefitBanner } from '../../components/benefits/AppliedBenefitBanner'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { SavingsOpportunityPanel } from '../../components/benefits/SavingsOpportunityPanel'
import { RefundMaximizer } from '../../components/benefits/RefundMaximizer'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './Benefits.css'

function statusBadge(status: string) {
  if (status === 'applied') return 'badge-ok'
  if (status === 'pending_verification') return 'badge-warn'
  if (status === 'needs_info' || status === 'flagged_review') return 'badge-warn'
  return 'badge-neutral'
}

function docLabel(docStatus?: string) {
  if (docStatus === 'on_file') return 'Documentation on file'
  if (docStatus === 'optional_later') return 'Receipt not yet uploaded (optional for now)'
  if (docStatus === 'requested') return 'More information or documents needed'
  return 'Documentation not required'
}

export function BenefitDashboard() {
  const {
    benefitReport,
    taxProfile,
    benefitReviewSigned,
    currentUser,
    auditEvents,
    uploadIssues,
    returns,
    activeReturnId,
    documents,
  } = useAppStore()
  const report = benefitReport
  const live = runBenefitOptimization(taxProfile)
  const isPreparer = currentUser?.role === 'preparer'
  const interviewBase = isPreparer ? '/app/preparer/benefits/interview' : '/app/taxpayer/benefits/interview'
  const reviewPath = isPreparer ? '/app/preparer/benefits/review' : '/app/taxpayer/benefits/review'
  const preparePath = isPreparer ? '/app/preparer/return' : '/app/taxpayer/prepare'
  const docsPath = isPreparer ? '/app/preparer/documents' : '/app/taxpayer/documents'
  const mine =
    returns.find((r) => r.clientId === currentUser?.id && r.taxYear === 2025) ??
    returns.find((r) => r.id === activeReturnId)

  const findings = report?.findings ?? live.findings
  const applied = findings.filter((f) => f.status === 'applied' || f.status === 'pending_verification')
  const needsInfo = findings.filter((f) => f.status === 'needs_info' || f.status === 'flagged_review')
  const formLines = report?.formLines?.length ? report.formLines : mine?.appliedBenefits ?? []
  const checklist = buildDocumentChecklist(taxProfile, documents)
  const docsNeeded = documentsStillNeeded(checklist)
  const allQuestionnaires = listSupportedBenefitQuestionnaires()

  function interviewFor(ruleId: string) {
    return `${interviewBase}?benefit=${encodeURIComponent(ruleId)}`
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Answer or upload → Apply → Recalculate</p>
          <h1>Maximize all tax savings</h1>
        </div>
        <div className="benefit-actions">
          <button className="btn btn-secondary" type="button" onClick={() => actions.runBenefitScan()}>
            Recalculate return
          </button>
          <Link className="btn btn-secondary" to={docsPath}>
            Documents needed ({docsNeeded.length})
          </Link>
        </div>
      </header>

      <p className="muted" style={{ marginTop: '-0.35rem', maxWidth: '44rem' }}>
        NOVARA investigates every applicable credit and deduction. Answer, upload, or speak — allowable amounts apply to
        your working return immediately, and open opportunities stay listed until they are applied or ruled out.
      </p>

      <RefundMaximizer report={report} profile={taxProfile} interviewBase={interviewBase} preparePath={preparePath} />
      <RefundTracker report={report} />
      <AppliedBenefitBanner events={report?.lastApplications} returnPath={preparePath} />
      <div style={{ marginTop: '1rem' }}>
        <SavingsOpportunityPanel report={report} interviewBase={interviewBase} preparePath={preparePath} />
      </div>

      <section style={{ marginTop: '1.25rem' }}>
        <h2 className="savings-section-title">Applied benefits</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          These amounts are on your working return and refund projection now.
        </p>
        {applied.length === 0 ? (
          <p className="muted">No benefits applied yet — answer a few questions or upload documents.</p>
        ) : (
          <div className="savings-card-grid">
            {applied.map((f) => (
              <article className="savings-card applied" key={f.ruleId}>
                <div className="savings-card-top">
                  <h3>{f.shortName || f.name}</h3>
                  <span className={`badge ${statusBadge(f.status)}`}>
                    {STATUS_LABELS[f.status] ?? f.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="savings-card-body">{f.explanation}</p>
                <p className="savings-card-meta">
                  Allowable credit: {formatMoney(f.affectingRefund ?? f.estimatedSavings)}
                  {(f.affectingRefund ?? 0) > 0 ? ` · Affecting refund: ${formatMoney(f.affectingRefund ?? 0)}` : ''}
                </p>
                <p className="savings-card-meta">
                  {f.form ? `${f.form} · ${f.field}` : CATEGORY_LABELS[f.category as BenefitCategory]}
                </p>
                <p className="savings-card-meta">{docLabel(f.docStatus)}</p>
                <div className="savings-card-actions">
                  {getQuestionnaire(f.ruleId) && (
                    <Link className="btn btn-ghost" to={interviewFor(f.ruleId)}>
                      Review answers
                    </Link>
                  )}
                  <Link className="btn btn-secondary" to={docsPath}>
                    Upload supporting document
                  </Link>
                  <Link className="btn btn-ghost" to={preparePath}>
                    View return
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {formLines.length > 0 && (
        <section className="list-panel panel" style={{ marginTop: '1.25rem' }}>
          <h2>Tax form entries</h2>
          {formLines.map((line) => (
            <div className="row-item" key={line.id}>
              <div>
                <strong>
                  {line.form} · {line.field}
                </strong>
                <span className="row-meta">
                  {line.name} · {line.status.replace(/_/g, ' ')} · {docLabel(line.docStatus)}
                </span>
              </div>
              <strong>{formatMoney(line.amount)}</strong>
            </div>
          ))}
        </section>
      )}

      <section style={{ marginTop: '1.25rem' }}>
        <h2 className="savings-section-title">Answer questions by benefit</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Opening a card starts that benefit’s questionnaire — not a generic interview.
        </p>
        <div className="savings-card-grid">
          {allQuestionnaires.map((q) => {
            const f = findings.find((x) => x.ruleId === q.ruleId)
            const status = f?.status ?? 'needs_info'
            return (
              <article className="savings-card" key={q.ruleId}>
                <div className="savings-card-top">
                  <h3>{q.title}</h3>
                  <span className={`badge ${statusBadge(status)}`}>
                    {STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="savings-card-body">
                  {f?.explanation ??
                    `${q.questionCount} questions · ${q.conditionalCount} conditional follow-ups. Open to evaluate this benefit only.`}
                </p>
                <div className="savings-card-actions">
                  <Link
                    className="btn btn-primary"
                    to={interviewFor(q.ruleId)}
                    onClick={() => actions.startBenefitCheck(q.ruleId)}
                  >
                    Answer questions
                  </Link>
                  <Link className="btn btn-secondary" to={docsPath}>
                    Upload document
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {docsNeeded.length > 0 && (
        <section className="list-panel panel" style={{ marginTop: '1.25rem' }}>
          <h2>Documents still needed</h2>
          {docsNeeded.slice(0, 6).map((d) => (
            <div className="row-item" key={d.id}>
              <div>
                <strong>
                  {d.benefitName}: {d.name}
                </strong>
                <span className="row-meta">{d.reason}</span>
              </div>
              <Link to={docsPath}>Upload</Link>
            </div>
          ))}
          <Link className="btn btn-secondary" to={docsPath} style={{ marginTop: '0.5rem' }}>
            Open full checklist
          </Link>
        </section>
      )}

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

      <div className="grid-2" style={{ marginTop: '1.25rem' }}>
        <section className="list-panel panel">
          <h2>Review &amp; filing</h2>
          <div className="row-item">
            <div>
              <strong>Final benefit review</strong>
              <span className="row-meta">
                {benefitReviewSigned
                  ? 'Signed — filing gate unlocked'
                  : report?.auditComplete
                    ? 'Ready for approval'
                    : `${report?.blockers.length ?? needsInfo.length} items still open before e-file`}
              </span>
            </div>
            <Link to={reviewPath}>Review</Link>
          </div>
          <div className="row-item">
            <div>
              <strong>Document checklist</strong>
              <span className="row-meta">{docsNeeded.length} items still needed</span>
            </div>
            <Link to={docsPath}>Open</Link>
          </div>
        </section>

        <section className="list-panel panel">
          <h2>Activity (safe audit trail)</h2>
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
    </div>
  )
}
