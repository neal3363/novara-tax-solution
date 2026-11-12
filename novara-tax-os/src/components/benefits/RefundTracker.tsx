import { formatMoney } from '../../data/fees'
import type { BenefitSnapshot } from '../../data/types'
import './RefundTracker.css'

export function RefundTracker({ report }: { report: BenefitSnapshot | null }) {
  if (!report) {
    return (
      <section className="panel refund-tracker">
        <p className="eyebrow">Refund Opportunity Tracker</p>
        <h2>Run tax benefit discovery</h2>
        <p className="muted">Projected refund updates as benefits are discovered and verified.</p>
      </section>
    )
  }

  const delta = report.projectedRefund - report.baseRefund
  const potential = report.projectedRefund + report.potentialSavings

  return (
    <section className="panel refund-tracker rise">
      <div className="refund-head">
        <div>
          <p className="eyebrow">Refund Opportunity Tracker</p>
          <h2>Live refund projection</h2>
        </div>
        <span className={`badge ${report.auditComplete ? 'badge-ok' : 'badge-warn'}`}>
          {report.auditComplete ? 'Benefit audit complete' : 'Review still open'}
        </span>
      </div>

      <div className="refund-metrics">
        <div>
          <p className="label">Base (forms only)</p>
          <p className="value">{formatMoney(report.baseRefund)}</p>
        </div>
        <div>
          <p className="label">Verified benefits</p>
          <p className="value positive">+{formatMoney(report.verifiedSavings)}</p>
        </div>
        <div>
          <p className="label">Current projection</p>
          <p className="value accent">{formatMoney(report.projectedRefund)}</p>
        </div>
        <div>
          <p className="label">If open items verify</p>
          <p className="value">{formatMoney(potential)}</p>
        </div>
      </div>

      <div className="progress-track" aria-hidden>
        <div
          className="progress-fill"
          style={{
            width: `${Math.min(100, Math.max(8, 40 + (delta > 0 ? 35 : 0) + (report.potentialSavings > 0 ? 15 : 0)))}%`,
          }}
        />
      </div>
      <p className="muted tracker-note">
        Example: disclose qualifying childcare after dependents → Child & Dependent Care Credit is evaluated and the
        projection moves. NOVARA stops only after the comprehensive benefit review is complete.
      </p>
      <p className="row-meta">Ruleset {report.ruleVersion} · last run {new Date(report.lastRunAt).toLocaleString()}</p>
    </section>
  )
}
