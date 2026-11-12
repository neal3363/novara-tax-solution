import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatMoney } from '../../data/fees'
import { runBenefitOptimization } from '../../engine/benefitOptimizer'
import {
  benefitQuestionnaireComplete,
  countRemainingQuestions,
  getQuestionnaire,
  nextBenefitSpecificQuestion,
} from '../../engine/benefitQuestionnaires'
import { AppliedBenefitBanner } from '../../components/benefits/AppliedBenefitBanner'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { AnswerHistory, InterviewChoice } from '../../components/interview/InterviewChoice'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './Benefits.css'

export function BenefitInterview() {
  const { taxProfile, benefitReport, currentUser, interviewAnswers } = useAppStore()
  const [params] = useSearchParams()
  const benefitId = params.get('benefit') || params.get('ruleId') || ''
  const questionnaire = benefitId ? getQuestionnaire(benefitId) : undefined
  const live = runBenefitOptimization(taxProfile)
  const finding = live.findings.find((f) => f.ruleId === benefitId)

  const active = useMemo(() => {
    if (!benefitId || !questionnaire) return null
    return nextBenefitSpecificQuestion(benefitId, taxProfile)
  }, [benefitId, questionnaire, taxProfile])

  const remaining = benefitId ? countRemainingQuestions(benefitId, taxProfile) : 0
  const complete = benefitId ? benefitQuestionnaireComplete(benefitId, taxProfile) : false
  const dashPath = currentUser?.role === 'preparer' ? '/app/preparer/benefits' : '/app/taxpayer/benefits'
  const docsPath = currentUser?.role === 'preparer' ? '/app/preparer/benefits' : '/app/taxpayer/documents'
  const returnPath = currentUser?.role === 'preparer' ? '/app/preparer/return' : '/app/taxpayer/prepare'
  const [saving, setSaving] = useState(false)

  const historyForBenefit = interviewAnswers.filter((a) => {
    if (!questionnaire) return true
    return questionnaire.questions.some((q) => q.mapsTo === a.mapsTo)
  })

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

      // Eligibility gate No → save answer only; engine marks benefit not eligible (no invented amount)
      actions.answerBenefitQuestion(active.mapsTo, normalized, active.prompt)
      await new Promise((r) => setTimeout(r, 160))
    } finally {
      setSaving(false)
    }
  }

  if (!benefitId || !questionnaire) {
    return (
      <div className="page container">
        <header className="page-header">
          <div>
            <p className="eyebrow">Benefit interview</p>
            <h1>Choose a tax benefit</h1>
          </div>
          <Link className="btn btn-secondary" to={dashPath}>
            Back to Savings
          </Link>
        </header>
        <section className="list-panel panel">
          <p className="muted">
            Open Savings and tap <strong>Answer questions</strong> on a specific benefit (for example Business mileage or
            Childcare Credit). Each benefit has its own questionnaire.
          </p>
          <Link className="btn btn-primary" to={dashPath}>
            Open Savings
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Benefit-specific interview</p>
          <h1>{questionnaire.title}</h1>
        </div>
        <Link className="btn btn-secondary" to={dashPath}>
          Back to Savings
        </Link>
      </header>

      <p className="muted" style={{ marginTop: '-0.25rem', maxWidth: '40rem' }}>
        {questionnaire.intro} Previously saved answers and uploaded documents are reused — we only ask what’s still
        missing.
      </p>

      <RefundTracker report={benefitReport} />
      <AppliedBenefitBanner events={benefitReport?.lastApplications} returnPath={returnPath} />

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        {active ? (
          <>
            <p className="turn-label" style={{ marginTop: 0 }}>
              {questionnaire.title} · {remaining} remaining
            </p>
            <InterviewChoice
              key={active.id}
              questionId={active.id}
              prompt={active.prompt}
              kind={active.kind}
              choices={active.choices}
              saving={saving}
              onConfirm={(value) => confirm(value)}
            />
          </>
        ) : complete ? (
          <div className="callout-success">
            <strong>
              {finding && (finding.status === 'applied' || finding.status === 'pending_verification')
                ? `${questionnaire.title} evaluated and applied to your working return.`
                : finding?.status === 'ineligible' || finding?.status === 'flagged_review'
                  ? `${questionnaire.title}: ${finding.explanation}`
                  : `${questionnaire.title} questionnaire complete — recalculating.`}
            </strong>
            {finding && (finding.affectingRefund ?? 0) > 0 && (
              <p>
                Allowable amount: {formatMoney(finding.affectingRefund ?? 0)}
                {finding.form ? ` · ${finding.form} · ${finding.field}` : ''}
              </p>
            )}
            <p className="muted">
              Upload supporting documents only if still needed for filing — missing optional receipts do not erase a
              calculated benefit on your working return.
            </p>
            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" to={returnPath}>
                View updated return
              </Link>
              <Link className="btn btn-secondary" to={docsPath}>
                Documents still needed
              </Link>
              <Link className="btn btn-ghost" to={dashPath}>
                Back to Savings
              </Link>
            </div>
          </div>
        ) : (
          <p className="muted">Loading next question…</p>
        )}

        <AnswerHistory
          items={historyForBenefit}
          onEdit={(mapsTo) => {
            actions.editInterviewAnswer(mapsTo)
          }}
        />
      </section>
    </div>
  )
}
