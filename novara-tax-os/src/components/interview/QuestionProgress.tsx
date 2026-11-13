import {
  buildInterviewProgress,
  groupProgressByCategory,
  type ProgressQuestion,
  type QuestionStatus,
} from '../../engine/questionProgress'
import type { TaxpayerProfile } from '../../engine/benefitOptimizer'
import './QuestionProgress.css'

function StatusIcon({ status }: { status: QuestionStatus }) {
  if (status === 'answered') {
    return (
      <span className="qp-icon qp-icon-answered" aria-hidden="true">
        ✓
      </span>
    )
  }
  if (status === 'unanswered') {
    return (
      <span className="qp-icon qp-icon-unanswered" aria-hidden="true">
        ●
      </span>
    )
  }
  if (status === 'awaiting_verification') {
    return (
      <span className="qp-icon qp-icon-verify" aria-hidden="true">
        ◐
      </span>
    )
  }
  return (
    <span className="qp-icon qp-icon-na" aria-hidden="true">
      —
    </span>
  )
}

export function QuestionProgressBar({ profile }: { profile: TaxpayerProfile }) {
  const progress = buildInterviewProgress(profile)
  return (
    <div className="qp-bar-wrap" role="status" aria-live="polite">
      <div className="qp-bar-meta">
        <strong>
          {progress.answeredCount} of {progress.applicableTotal} answered
        </strong>
        <span>
          {progress.unansweredCount} unanswered · {progress.percentComplete}% complete
        </span>
      </div>
      <div
        className="qp-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percentComplete}
        aria-label={`Interview progress ${progress.percentComplete} percent`}
      >
        <div className="qp-bar-fill" style={{ width: `${progress.percentComplete}%` }} />
      </div>
      <p className="qp-greeting">{progress.greeting}</p>
    </div>
  )
}

export function QuestionOverview({
  profile,
  onSelectUnanswered,
  onEditAnswered,
  focusMapsTo,
}: {
  profile: TaxpayerProfile
  onSelectUnanswered: (q: ProgressQuestion) => void
  onEditAnswered: (mapsTo: string) => void
  focusMapsTo?: string | null
}) {
  const progress = buildInterviewProgress(profile)
  const groups = groupProgressByCategory(progress)

  return (
    <div className="qp-overview">
      <div className="qp-overview-head">
        <h3>Question overview</h3>
        <button
          className="btn btn-primary"
          type="button"
          disabled={!progress.nextUnanswered}
          onClick={() => progress.nextUnanswered && onSelectUnanswered(progress.nextUnanswered)}
        >
          Next unanswered question
        </button>
      </div>
      {groups.map((g) => (
        <div className="qp-group" key={g.category}>
          <p className="qp-group-title">
            {g.label}{' '}
            <span className="muted">
              ({g.answered}/{g.total})
            </span>
          </p>
          <ul className="qp-list">
            {g.items.map((q) => (
              <li
                key={q.id}
                className={`qp-item qp-status-${q.status}${focusMapsTo === q.mapsTo ? ' qp-item-focus' : ''}`}
              >
                <StatusIcon status={q.status} />
                <div className="qp-item-body">
                  <p className="qp-item-prompt">{q.prompt}</p>
                  <p className="qp-item-status">
                    <span className={`qp-status-text qp-status-text-${q.status}`}>{q.statusLabel}</span>
                  </p>
                </div>
                {q.status === 'unanswered' || q.status === 'awaiting_verification' ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    aria-label={`Open answer controls for: ${q.prompt}`}
                    onClick={() => onSelectUnanswered(q)}
                  >
                    Answer
                  </button>
                ) : (
                  <button className="btn btn-ghost" type="button" onClick={() => onEditAnswered(q.mapsTo)}>
                    Edit
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function useInterviewProgress(profile: TaxpayerProfile) {
  return buildInterviewProgress(profile)
}
