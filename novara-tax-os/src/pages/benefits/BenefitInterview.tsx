import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import { nextInterviewQuestions, runBenefitOptimization } from '../../engine/benefitOptimizer'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { AnswerHistory, InterviewChoice } from '../../components/interview/InterviewChoice'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './Benefits.css'

export function BenefitInterview() {
  const { taxProfile, benefitReport, currentUser, interviewAnswers } = useAppStore()
  const live = runBenefitOptimization(taxProfile)
  const questions = nextInterviewQuestions(taxProfile, live)
  const active = questions[0] ?? null
  const dashPath = currentUser?.role === 'preparer' ? '/app/preparer/benefits' : '/app/taxpayer/benefits'
  const [saving, setSaving] = useState(false)

  async function confirm(value: string | number) {
    if (!active || saving) return
    setSaving(true)
    try {
      const normalized =
        typeof value === 'string' && value.toLowerCase() === 'yes'
          ? 'yes'
          : typeof value === 'string' && value.toLowerCase() === 'no'
            ? 'no'
            : value
      actions.answerBenefitQuestion(active.mapsTo, normalized, active.prompt)
      await new Promise((r) => setTimeout(r, 160))
    } finally {
      setSaving(false)
    }
  }

  async function skip() {
    if (!active || saving) return
    setSaving(true)
    try {
      actions.markBenefitUnresolved(active.mapsTo, active.prompt)
      await new Promise((r) => setTimeout(r, 160))
    } finally {
      setSaving(false)
    }
  }

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
        <h2>One question at a time</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Tap YES or NO to select, confirm Your answer, then press Continue. Double taps do not submit. Use Change Answer
          anytime before or after saving.
        </p>

        {active ? (
          <div className="question panel">
            <InterviewChoice
              key={active.id}
              questionId={active.id}
              prompt={active.prompt}
              kind={active.kind === 'yesno' ? 'yesno' : active.kind}
              choices={
                active.kind === 'yesno'
                  ? ['Yes', 'No']
                  : active.choices
              }
              saving={saving}
              secondaryLabel="Mark unresolved"
              onSecondary={() => void skip()}
              onConfirm={(value) => confirm(value)}
            />
            <span className="row-meta" style={{ display: 'block', marginTop: '0.75rem' }}>
              Affects: {active.benefitIds.join(', ')} · {questions.length} open prompt{questions.length === 1 ? '' : 's'}
            </span>
          </div>
        ) : (
          <div className="callout-success">
            <strong>No open interview prompts.</strong>
            <p className="muted">Run Find More Tax Savings or proceed to mandatory final review.</p>
            <Link className="btn btn-primary" to={dashPath}>
              Open discovery dashboard
            </Link>
          </div>
        )}

        <AnswerHistory items={interviewAnswers} onEdit={(mapsTo) => actions.editInterviewAnswer(mapsTo)} />
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
