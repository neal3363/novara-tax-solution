import { formatMoney } from '../../data/fees'
import type { BalanceDueGuidance } from '../../engine/balanceDuePayments'
import './FilingPanels.css'

export function BalanceDuePanel({ guidance }: { guidance: BalanceDueGuidance }) {
  if (!guidance.isBalanceDue) {
    return (
      <section className="filing-panel" data-testid="balance-due-panel">
        <p className="eyebrow">Balance due & payments</p>
        <h2>No balance due on current projection</h2>
        <p className="muted">{guidance.explanation}</p>
        <p className="muted">{guidance.disclaimer}</p>
      </section>
    )
  }

  return (
    <section className="filing-panel" data-testid="balance-due-panel">
      <p className="eyebrow">Balance due & payments</p>
      <h2>Estimated amount owed: {formatMoney(guidance.balanceDue)}</h2>
      <p className="muted">{guidance.explanation}</p>
      <ul className="fee-lines">
        {guidance.options.map((opt) => (
          <li key={opt.id}>
            <div>
              <strong>{opt.title}</strong>
              <span className="muted">
                {opt.summary} {opt.howTo} {opt.deadlineNote}
                {opt.infoUrl ? (
                  <>
                    {' '}
                    <a href={opt.infoUrl} target="_blank" rel="noreferrer">
                      Official info
                    </a>
                  </>
                ) : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <ul className="muted">
        {guidance.reminders.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="muted">{guidance.disclaimer}</p>
    </section>
  )
}
