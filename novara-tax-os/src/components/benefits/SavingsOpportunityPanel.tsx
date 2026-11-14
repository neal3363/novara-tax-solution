import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, STATUS_LABELS, type BenefitCategory } from '../../data/benefitsCatalog'
import { formatMoney } from '../../data/fees'
import type { BenefitSnapshot } from '../../data/types'
import { actions } from '../../store/useAppStore'
import './SavingsOpportunityPanel.css'

type Finding = NonNullable<BenefitSnapshot['findings']>[number]

function badgeClass(status: string) {
  if (status === 'applied') return 'badge-ok'
  if (status === 'pending_verification' || status === 'needs_info' || status === 'eligible_unverified') {
    return 'badge-warn'
  }
  if (status === 'ineligible') return 'badge-neutral'
  return 'badge-neutral'
}

function OpportunityRow({
  finding,
  interviewBase,
  onOpenMapsTo,
}: {
  finding: Finding
  interviewBase: string
  onOpenMapsTo?: (mapsTo: string) => void
}) {
  const amount = finding.affectingRefund || finding.estimatedSavings || 0
  const missing = finding.missingAnswers?.filter(Boolean) ?? []
  return (
    <div className="sop-row">
      <div className="sop-row-main">
        <div className="sop-row-title">
          <strong>{finding.shortName || finding.name}</strong>
          <span className={`badge ${badgeClass(finding.status)}`}>
            {STATUS_LABELS[finding.status] ?? finding.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="sop-row-body">{finding.explanation}</p>
        <p className="sop-row-meta">
          {CATEGORY_LABELS[finding.category as BenefitCategory] ?? finding.category}
          {finding.form ? ` · ${finding.form}` : ''}
          {amount > 0 ? ` · up to ${formatMoney(amount)}` : ''}
        </p>
        {missing.length > 0 && (
          <p className="sop-row-meta">Still needed: {missing.slice(0, 4).map((m) => m.replace(/_/g, ' ')).join(', ')}</p>
        )}
      </div>
      <div className="sop-row-actions">
        {missing[0] && onOpenMapsTo && (
          <button className="btn btn-primary" type="button" onClick={() => onOpenMapsTo(missing[0])}>
            Answer next
          </button>
        )}
        <Link
          className="btn btn-secondary"
          to={`${interviewBase}?benefit=${encodeURIComponent(finding.ruleId)}`}
          onClick={() => actions.startBenefitCheck(finding.ruleId)}
        >
          Open questions
        </Link>
      </div>
    </div>
  )
}

/**
 * Shows every benefit opportunity the optimizer knows about — applied credits and
 * remaining savings — so taxpayers see maximization progress as they answer/upload/speak.
 */
export function SavingsOpportunityPanel({
  report,
  interviewBase = '/app/taxpayer/benefits/interview',
  preparePath = '/app/taxpayer/prepare',
  onOpenMapsTo,
  compact = false,
}: {
  report: BenefitSnapshot | null
  interviewBase?: string
  preparePath?: string
  onOpenMapsTo?: (mapsTo: string) => void
  compact?: boolean
}) {
  const findings = report?.findings ?? []
  const applied = findings.filter((f) => f.status === 'applied' || f.status === 'pending_verification')
  const open = findings.filter(
    (f) =>
      f.status === 'needs_info' ||
      f.status === 'eligible_unverified' ||
      f.status === 'flagged_review',
  )
  const ineligible = findings.filter((f) => f.status === 'ineligible')

  return (
    <section className={`sop-panel panel ${compact ? 'sop-compact' : ''}`}>
      <div className="sop-head">
        <div>
          <p className="eyebrow">Maximize your return</p>
          <h2>All possible tax savings</h2>
        </div>
        <Link className="btn btn-ghost" to="/app/taxpayer/benefits">
          Full Savings
        </Link>
      </div>
      <p className="muted sop-lead">
        Credits and deductions update as you answer, upload, or speak. Applied amounts raise your refund now; open
        items stay listed until NOVARA can apply them.
      </p>

      <div className="sop-summary">
        <div>
          <span className="label">Applied</span>
          <strong>{applied.length}</strong>
        </div>
        <div>
          <span className="label">Still open</span>
          <strong>{open.length}</strong>
        </div>
        <div>
          <span className="label">Verified $</span>
          <strong>{formatMoney(report?.verifiedSavings ?? 0)}</strong>
        </div>
        <div>
          <span className="label">Potential $</span>
          <strong>{formatMoney(report?.potentialSavings ?? 0)}</strong>
        </div>
      </div>

      {applied.length > 0 && (
        <div className="sop-group">
          <h3>Applied to your return</h3>
          {applied.map((f) => (
            <OpportunityRow key={f.ruleId} finding={f} interviewBase={interviewBase} onOpenMapsTo={onOpenMapsTo} />
          ))}
        </div>
      )}

      <div className="sop-group">
        <h3>Still available — answer to apply</h3>
        {open.length === 0 ? (
          <p className="muted">
            No open benefit questions right now.{' '}
            <Link to={preparePath}>Continue the questionnaire</Link> or{' '}
            <button className="btn btn-ghost" type="button" onClick={() => actions.runBenefitScan()}>
              Rescan all benefits
            </button>
            .
          </p>
        ) : (
          open.map((f) => (
            <OpportunityRow key={f.ruleId} finding={f} interviewBase={interviewBase} onOpenMapsTo={onOpenMapsTo} />
          ))
        )}
      </div>

      {!compact && ineligible.length > 0 && (
        <details className="sop-group">
          <summary>Does not apply ({ineligible.length})</summary>
          {ineligible.map((f) => (
            <OpportunityRow key={f.ruleId} finding={f} interviewBase={interviewBase} />
          ))}
        </details>
      )}
    </section>
  )
}
