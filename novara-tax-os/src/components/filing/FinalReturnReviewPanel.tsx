import type { FinalReturnReviewReport } from '../../engine/finalReturnReview'
import './FilingPanels.css'

export function FinalReturnReviewPanel({ report }: { report: FinalReturnReviewReport }) {
  return (
    <section className="filing-panel" data-testid="final-return-review">
      <p className="eyebrow">AI Final Return Review</p>
      <h2>Return review status</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Complements the AI Refund Maximizer. Mandatory failures block e-file; warnings need professional review.
      </p>
      <p role="status">
        <span className={`badge ${report.canEfile ? 'badge-ok' : 'badge-warn'}`}>
          {report.overall.replace(/_/g, ' ')}
        </span>{' '}
        {report.summary}
      </p>
      <ul className="readiness-list">
        {report.checks.map((c) => (
          <li key={c.id} className={`readiness-item status-${c.status === 'pass' ? 'complete' : c.status === 'warn' ? 'attention' : 'blocked'}`}>
            <strong>
              {c.label}
              {c.blocking ? ' (required)' : ''}
            </strong>
            <span>{c.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
