import type { TaxPreparationCompletionScore } from '../../engine/taxReadiness'
import './FilingPanels.css'

export function TaxReadinessScore({ score }: { score: TaxPreparationCompletionScore }) {
  return (
    <section className="filing-panel rise" data-testid="tax-readiness-score">
      <p className="eyebrow">AI Tax Preparation Completion Score</p>
      <h2>{score.label}</h2>
      <div className="readiness-bar" aria-hidden>
        <div className="readiness-fill" style={{ width: `${Math.min(100, score.percent)}%` }} />
      </div>
      <ul className="readiness-list">
        {score.items.map((item) => (
          <li key={item.id} className={`readiness-item status-${item.status}`}>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
      {!score.readyToFile && score.blockers.length > 0 && (
        <p className="muted" style={{ marginBottom: 0 }}>
          Before e-file: {score.blockers.slice(0, 3).join(' · ')}
        </p>
      )}
    </section>
  )
}
