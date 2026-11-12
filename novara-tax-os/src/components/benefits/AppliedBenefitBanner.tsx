import { Link } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import type { BenefitApplicationEvent } from '../../data/types'
import './AppliedBenefitBanner.css'

export function AppliedBenefitBanner({
  events,
  returnPath,
}: {
  events?: BenefitApplicationEvent[]
  returnPath: string
}) {
  const real = (events ?? []).filter((e) => e.ruleId !== 'recalc')
  if (real.length === 0) return null
  const latest = real[real.length - 1]
  const changed = latest.updatedRefund !== latest.previousRefund

  return (
    <section className="applied-banner rise" aria-live="polite">
      <p className="eyebrow">Tax benefit applied successfully</p>
      <h2>
        Credit: {latest.name}
      </h2>
      <div className="applied-metrics">
        <div>
          <p className="label">Allowable amount</p>
          <p className="value">{formatMoney(latest.amount)}</p>
        </div>
        <div>
          <p className="label">Previous refund</p>
          <p className="value">{formatMoney(latest.previousRefund)}</p>
        </div>
        <div>
          <p className="label">Updated refund</p>
          <p className="value accent">{formatMoney(latest.updatedRefund)}</p>
        </div>
      </div>
      <p className="applied-note">
        {changed
          ? `Populated ${latest.form} · ${latest.field} and recalculated your return.`
          : `Applied to ${latest.form} · ${latest.field}. The refund did not change because of other limits or offsets on this return.`}
      </p>
      <Link className="btn btn-primary" to={returnPath}>
        View updated tax return
      </Link>
    </section>
  )
}
