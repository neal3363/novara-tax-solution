import { Link } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import type { BenefitSnapshot } from '../../data/types'
import { buildCalcAuditTrail } from '../../engine/calcAuditTrail'
import { runBenefitOptimization, type TaxpayerProfile } from '../../engine/benefitOptimizer'
import { PUBLIC_DEMO_RESULT_LABEL, isPublicDemoMode } from '../../engine/demo/publicDemo'
import { actions } from '../../store/useAppStore'
import './RefundMaximizer.css'

type Finding = NonNullable<BenefitSnapshot['findings']>[number]

/**
 * AI Refund Maximizer — current verified refund vs potential scenario,
 * live breakdown, and missed opportunities the taxpayer hasn't explored.
 */
export function RefundMaximizer({
  report,
  profile,
  interviewBase = '/app/taxpayer/benefits/interview',
  preparePath = '/app/taxpayer/prepare',
  onOpenMapsTo,
}: {
  report: BenefitSnapshot | null
  profile?: TaxpayerProfile | null
  interviewBase?: string
  preparePath?: string
  onOpenMapsTo?: (mapsTo: string) => void
}) {
  if (!report) {
    return (
      <section className="refund-max panel" data-testid="refund-maximizer">
        <p className="eyebrow">AI Refund Maximizer</p>
        <h2>Start answering to unlock your estimate</h2>
        <p className="muted">
          Upload documents or answer questions — NOVARA recalculates your current estimated refund and remaining
          lawful opportunities as you go.
        </p>
        <Link className="btn btn-primary" to={preparePath}>
          Open questionnaire
        </Link>
      </section>
    )
  }

  const current = report.projectedRefund
  const potential = report.projectedRefund + report.potentialSavings
  const applied = report.findings.filter((f) => f.status === 'applied' || f.status === 'pending_verification')
  const open = report.findings.filter(
    (f) => f.status === 'needs_info' || f.status === 'eligible_unverified' || f.status === 'flagged_review',
  )
  const missed = open.filter((f) => (f.missingAnswers?.length ?? 0) > 0 || f.estimatedSavings > 0)
  const deltaNote = report.lastChangeNote
  const trail =
    profile != null
      ? buildCalcAuditTrail(profile, runBenefitOptimization(profile))
      : null

  return (
    <section className="refund-max panel rise" data-testid="refund-maximizer" aria-live="polite">
      <div className="refund-max-head">
        <div>
          <p className="eyebrow">AI Refund Maximizer</p>
          <h2>Interactive tax savings</h2>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => actions.runBenefitScan()}>
          Recalculate
        </button>
      </div>

      <p className="refund-max-lead muted">
        Confirmed amounts use verified answers and documents. Potential scenarios stay separate until eligibility is
        confirmed — NOVARA never invents a refund.
        {isPublicDemoMode() ? ` ${PUBLIC_DEMO_RESULT_LABEL}` : ''}
      </p>

      <div className="refund-max-dual">
        <div className="refund-max-card current">
          <p className="label">Current estimated refund</p>
          <p className="refund-max-amount" key={`c-${current}`}>
            {formatMoney(current)}
          </p>
          <p className="refund-max-sub">
            Base {formatMoney(report.baseRefund)}
            {report.verifiedSavings > 0 ? ` + applied benefits ${formatMoney(report.verifiedSavings)}` : ''}
          </p>
        </div>
        <div className="refund-max-card potential">
          <p className="label">Potential refund scenario</p>
          <p className="refund-max-amount accent" key={`p-${potential}`}>
            {formatMoney(potential)}
          </p>
          <p className="refund-max-sub">
            If open items verify: +{formatMoney(report.potentialSavings)} still unexplored or unverified
          </p>
        </div>
      </div>

      <div className="refund-max-progress" aria-hidden>
        <div
          className="refund-max-progress-fill"
          style={{
            width: `${Math.min(
              100,
              Math.max(12, 35 + (report.verifiedSavings > 0 ? 25 : 0) + (report.potentialSavings > 0 ? 20 : 0)),
            )}%`,
          }}
        />
      </div>

      {deltaNote && (
        <p className="refund-max-delta" role="status">
          {deltaNote}
        </p>
      )}

      <div className="refund-max-breakdown">
        <h3>How your refund changes</h3>
        <ol className="refund-max-steps">
          <li>
            <span>Starting estimate (forms / withholding)</span>
            <strong>{formatMoney(report.baseRefund)}</strong>
          </li>
          {applied.map((f) => (
            <li key={f.ruleId}>
              <span>
                {f.status === 'applied' ? 'Applied' : 'Pending verification'}: {f.shortName || f.name}
              </span>
              <strong className="positive">+{formatMoney(f.affectingRefund || f.estimatedSavings)}</strong>
            </li>
          ))}
          <li className="refund-max-total">
            <span>Updated estimated refund</span>
            <strong>{formatMoney(current)}</strong>
          </li>
          {missed.slice(0, 6).map((f) => (
            <li key={`p-${f.ruleId}`} className="hypothetical">
              <span>Still open: {f.shortName || f.name}</span>
              <strong>+{formatMoney(f.estimatedSavings)} potential</strong>
            </li>
          ))}
          <li className="refund-max-total hypothetical">
            <span>If remaining opportunities verify</span>
            <strong>{formatMoney(potential)}</strong>
          </li>
        </ol>
        {trail && trail.entries.length > 0 && (
          <details className="refund-max-trail">
            <summary>Calculation audit trail ({trail.entries.length})</summary>
            <ul>
              {trail.entries.map((e) => (
                <li key={e.id}>
                  <span>
                    {e.formLine}: {e.applicableRule}
                  </span>
                  <strong>{formatMoney(e.amount)}</strong>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="refund-max-missed" data-testid="missed-opportunities">
        <h3>Potential Tax Savings You Haven’t Explored</h3>
        <p className="muted">
          Skipped or unanswered items stay here until you finish the interview. Tap to resume — answers recalculate
          your refund immediately.
        </p>
        {missed.length === 0 ? (
          <p className="muted">No open savings questions right now. Continue the questionnaire or rescan.</p>
        ) : (
          <div className="refund-max-cards">
            {missed.map((f) => (
              <MissedCard
                key={f.ruleId}
                finding={f}
                interviewBase={interviewBase}
                onOpenMapsTo={onOpenMapsTo}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MissedCard({
  finding,
  interviewBase,
  onOpenMapsTo,
}: {
  finding: Finding
  interviewBase: string
  onOpenMapsTo?: (mapsTo: string) => void
}) {
  const next = finding.missingAnswers?.[0]
  return (
    <article className="refund-max-qcard">
      <div className="refund-max-qcard-top">
        <strong>{finding.shortName || finding.name}</strong>
        {finding.estimatedSavings > 0 && (
          <span className="badge badge-warn">up to {formatMoney(finding.estimatedSavings)}</span>
        )}
      </div>
      <p>{finding.explanation}</p>
      <div className="refund-max-qcard-actions">
        {next && onOpenMapsTo && (
          <button className="btn btn-primary" type="button" onClick={() => onOpenMapsTo(next)}>
            Answer next
          </button>
        )}
        <Link
          className="btn btn-secondary"
          to={`${interviewBase}?benefit=${encodeURIComponent(finding.ruleId)}`}
          onClick={() => actions.startBenefitCheck(finding.ruleId)}
        >
          Explore this credit
        </Link>
      </div>
    </article>
  )
}
