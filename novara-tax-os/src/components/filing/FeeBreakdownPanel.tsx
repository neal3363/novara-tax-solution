import { formatMoney } from '../../data/fees'
import type { FeeBreakdown } from '../../engine/feeLedger'
import './FilingPanels.css'

export function FeeBreakdownPanel({ breakdown }: { breakdown: FeeBreakdown }) {
  return (
    <section className="filing-panel" data-testid="fee-breakdown">
      <p className="eyebrow">Fees before you sign</p>
      <h2>Itemized fee breakdown</h2>
      <ul className="fee-lines">
        {breakdown.lines.map((line) => (
          <li key={line.id}>
            <div>
              <strong>{line.label}</strong>
              <span className="muted">
                {line.category.replace(/_/g, ' ')}
                {line.note ? ` · ${line.note}` : ''}
                {line.status !== 'due' ? ` · ${line.status.replace(/_/g, ' ')}` : ''}
              </span>
            </div>
            <strong>{line.status === 'provider_pending' || line.status === 'not_applicable' ? '—' : formatMoney(line.amount)}</strong>
          </li>
        ))}
      </ul>
      <div className="fee-totals">
        <div>
          <span>NOVARA / preparer fees</span>
          <strong>{formatMoney(breakdown.novaraTotal)}</strong>
        </div>
        <div>
          <span>Banking / processing</span>
          <strong>{formatMoney(breakdown.bankingTotal)}</strong>
        </div>
        <div className="grand">
          <span>Total due now (software)</span>
          <strong>{formatMoney(breakdown.novaraTotal)}</strong>
        </div>
      </div>
      <p className="muted">{breakdown.disclaimer}</p>
    </section>
  )
}
