import { Link } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import { nextInterviewQuestions, runBenefitOptimization } from '../../engine/benefitOptimizer'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './Benefits.css'

export function BenefitInterview() {
  const { taxProfile, benefitReport, currentUser } = useAppStore()
  const live = runBenefitOptimization(taxProfile)
  const questions = nextInterviewQuestions(taxProfile, live)
  const dashPath = currentUser?.role === 'preparer' ? '/app/preparer/benefits' : '/app/taxpayer/benefits'

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Intelligent tax interview</p>
          <h1>Follow-up questions</h1>
        </div>
        <Link className="btn btn-secondary" to={dashPath}>
          Back to discovery
        </Link>
      </header>

      <RefundTracker report={benefitReport} />

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Dynamic questions</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Based on your answers, NOVARA asks only relevant follow-ups — for example childcare details after dependents are
          disclosed — then recalculates the refund opportunity.
        </p>

        {questions.length === 0 ? (
          <div className="callout-success">
            <strong>No open interview prompts.</strong>
            <p className="muted">Run Find More Tax Savings or proceed to mandatory final review.</p>
            <Link className="btn btn-primary" to={dashPath}>
              Open discovery dashboard
            </Link>
          </div>
        ) : (
          <div className="question-list">
            {questions.map((q) => (
              <div className="question panel" key={q.id}>
                <p>{q.prompt}</p>
                <div className="answer-row">
                  {q.kind === 'yesno' &&
                    ['yes', 'no'].map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => actions.answerBenefitQuestion(q.mapsTo, a)}
                      >
                        {a === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  {q.kind === 'number' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        const raw = window.prompt('Enter amount (USD)', '2400')
                        if (raw != null) actions.answerBenefitQuestion(q.mapsTo, Number(raw) || 0)
                      }}
                    >
                      Enter amount
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => actions.markBenefitUnresolved(q.mapsTo)}
                  >
                    Mark unresolved
                  </button>
                </div>
                <span className="row-meta">Affects: {q.benefitIds.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Impact preview</h2>
        <div className="row-item">
          <div>
            <strong>Current projection</strong>
            <span className="row-meta">After verified benefits</span>
          </div>
          <strong>{formatMoney(live.projectedRefund)}</strong>
        </div>
        <div className="row-item">
          <div>
            <strong>Still discoverable</strong>
            <span className="row-meta">Needs info / unverified</span>
          </div>
          <strong>{formatMoney(live.potentialSavings)}</strong>
        </div>
      </section>
    </div>
  )
}
