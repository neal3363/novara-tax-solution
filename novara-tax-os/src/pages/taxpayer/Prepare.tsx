import { useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { AppliedBenefitBanner } from '../../components/benefits/AppliedBenefitBanner'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { AnswerHistory, InterviewChoice } from '../../components/interview/InterviewChoice'
import {
  extractConfirmedFields,
  knownFactsSummary,
  nextBenefitDiscoveryTurn,
  nextFilingStatusTurn,
} from '../../engine/smartInterview'
import { nextDependentQuestion } from '../../engine/dependentsEngine'
import '../shared.css'
import './Prepare.css'

const STEPS = [
  'Upload',
  'Confirm',
  'Smart interview',
  'Tax calculation',
  'Review & sign',
  'E-file',
]

export function Prepare() {
  const {
    documents,
    prepStep,
    returns,
    currentUser,
    taxProfile,
    benefitReport,
    interviewChat,
    interviewAnswers,
    uploadIssues,
  } = useAppStore()
  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === 2025)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [saving, setSaving] = useState(false)
  const fields = useMemo(() => extractConfirmedFields(documents), [documents])
  const known = useMemo(() => knownFactsSummary(documents, taxProfile), [documents, taxProfile])

  const filingTurn = nextFilingStatusTurn(taxProfile)
  const depQ = filingTurn ? null : nextDependentQuestion(taxProfile.answers, taxProfile.dependents)
  const dependentTurn = depQ
    ? {
        id: depQ.id,
        phase: 'dependents' as const,
        prompt: depQ.prompt,
        kind: (depQ.kind === 'date' ? 'text' : depQ.kind) as 'yesno' | 'choice' | 'number' | 'text',
        choices: depQ.choices,
        mapsTo: depQ.mapsTo,
        aiLead: 'We need exact dependent facts before any dependent credit can change a verified refund.',
      }
    : null
  const benefitTurn = filingTurn || dependentTurn ? null : nextBenefitDiscoveryTurn(taxProfile)
  const activeTurn = filingTurn ?? dependentTurn ?? benefitTurn

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) actions.uploadFiles(e.dataTransfer.files)
  }

  async function confirmTurn(value: string | number) {
    if (!activeTurn || saving) return
    setSaving(true)
    try {
      if (activeTurn.phase === 'dependents' || activeTurn.mapsTo.startsWith('dep_') || activeTurn.mapsTo === 'dependent_count' || activeTurn.mapsTo === 'potential_dependents') {
        const normalized =
          typeof value === 'string' && value.toLowerCase() === 'yes'
            ? 'yes'
            : typeof value === 'string' && value.toLowerCase() === 'no'
              ? 'no'
              : value
        actions.answerDependentQuestion(activeTurn.mapsTo, normalized, activeTurn.prompt)
      } else {
        actions.answerSmartInterview(activeTurn.mapsTo, value, activeTurn.prompt)
      }
      await new Promise((r) => setTimeout(r, 160))
    } finally {
      setSaving(false)
    }
  }

  async function skipTurn() {
    if (!activeTurn || saving) return
    if (activeTurn.phase === 'dependents') return // do not skip mandatory dependent facts
    setSaving(true)
    try {
      actions.markBenefitUnresolved(activeTurn.mapsTo, activeTurn.prompt)
      await new Promise((r) => setTimeout(r, 160))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">AI Smart Tax Interview</p>
          <h1>Document-first preparation</h1>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => actions.resetDemo()}>
          Reset demo
        </button>
      </header>

      <p className="muted prepare-lead">
        Upload → AI extracts → you confirm → filing-status questions → tax-benefit discovery → calculation → review →
        signature → e-file. One question. One clear selection. One confirmed answer.
      </p>

      <div className="stepper" aria-label="Preparation steps">
        {STEPS.map((s, i) => (
          <span key={s} className={`step-pill ${prepStep === i ? 'active' : prepStep > i ? 'done' : ''}`}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {prepStep <= 1 && (
        <section className="rise">
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <span className="badge">Upload documents first</span>
            <h2>Drop ID, W-2s, 1099s, and supporting docs</h2>
            <p>
              Driver’s license / state ID, SSN or tax ID docs, W-2s, 1099s, dependent IDs, tuition statements, and more.
              AI extracts names, DOB, IDs, addresses, wages, and withholding.
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              onChange={(e) => e.target.files && actions.uploadFiles(e.target.files)}
            />
          </div>

          {uploadIssues.length > 0 && (
            <div className="list-panel panel" style={{ marginTop: '1rem' }}>
              <h2>Document checks</h2>
              {uploadIssues.slice(0, 4).map((issue) => (
                <div className="row-item" key={`${issue.kind}-${issue.title}`}>
                  <div>
                    <strong>{issue.title}</strong>
                    <span className="row-meta">{issue.detail}</span>
                  </div>
                  <span className={`badge ${issue.severity === 'high' ? 'badge-warn' : 'badge-neutral'}`}>
                    {issue.kind}
                  </span>
                </div>
              ))}
            </div>
          )}

          {documents.length > 0 && (
            <div className="list-panel panel" style={{ marginTop: '1rem' }}>
              <h2>Confirm extracted information</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Correct only missing, inconsistent, or unverified fields. Do not re-enter accurate extracted values.
              </p>
              {known.length > 0 && (
                <div className="known-box">
                  {known.map((k) => (
                    <span key={k} className="badge badge-neutral">
                      {k}
                    </span>
                  ))}
                </div>
              )}
              {fields.map((f) => (
                <div className="row-item" key={f.id}>
                  <div>
                    <strong>
                      {f.label}: {f.value}
                    </strong>
                    <span className="row-meta">{f.source}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {f.needsAttention && f.docId && f.factId && !f.confirmed && (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        style={{ padding: '0.35rem 0.7rem' }}
                        onClick={() => actions.verifyFact(f.docId!, f.factId!)}
                      >
                        Confirm
                      </button>
                    )}
                    {(f.confirmed || !f.needsAttention) && <span className="badge badge-ok">Confirmed</span>}
                    {f.needsAttention && !f.confirmed && <span className="badge badge-warn">Needs check</span>}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" type="button" onClick={() => actions.confirmExtracedDetails()}>
                  Looks good — start smart interview
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {prepStep === 2 && (
        <section className="smart-interview rise">
          <div className="interview-layout">
            <div className="list-panel panel interview-chat">
              <h2>Conversational tax interview</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Select YES or NO, confirm Your answer, then press Continue. Answers are not saved until you continue.
              </p>
              <div className="chat-log" role="log" aria-live="polite">
                {interviewChat.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.role}`}>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>

              {activeTurn ? (
                <div className="active-turn">
                  <p className="turn-label">
                    {activeTurn.phase === 'filing_status'
                      ? 'Filing status'
                      : activeTurn.phase === 'dependents'
                        ? 'Dependent verification'
                        : 'Tax benefit discovery'}
                  </p>
                  <InterviewChoice
                    key={activeTurn.id}
                    questionId={activeTurn.id}
                    prompt={activeTurn.prompt}
                    kind={activeTurn.kind}
                    choices={activeTurn.choices}
                    saving={saving}
                    secondaryLabel={activeTurn.phase === 'dependents' ? undefined : 'Skip / unresolved'}
                    onSecondary={activeTurn.phase === 'dependents' ? undefined : () => void skipTurn()}
                    onConfirm={(value) => confirmTurn(value)}
                  />
                  {activeTurn.phase === 'dependents' && (
                    <p className="muted" style={{ marginTop: '0.75rem' }}>
                      Or continue on the dedicated{' '}
                      <Link to="/app/taxpayer/dependents">Dependents</Link> page (secure ID upload + checklist).
                    </p>
                  )}
                </div>
              ) : (
                <div className="answer-row">
                  <Link className="btn btn-secondary" to="/app/taxpayer/dependents">
                    Review dependents
                  </Link>
                  <button className="btn btn-primary" type="button" onClick={() => actions.completeSmartInterview()}>
                    Calculate my result
                  </button>
                </div>
              )}

              <AnswerHistory items={interviewAnswers} onEdit={(mapsTo) => actions.editInterviewAnswer(mapsTo)} />
            </div>

            <div className="side-stack">
              <RefundTracker report={benefitReport} />
              <AppliedBenefitBanner events={benefitReport?.lastApplications} returnPath="/app/taxpayer/prepare" />
              {(benefitReport?.formLines?.length ?? 0) > 0 && (
                <section className="list-panel panel">
                  <h2>Applied on return</h2>
                  {benefitReport!.formLines.map((line) => (
                    <div className="row-item" key={line.id}>
                      <div>
                        <strong>{line.name}</strong>
                        <span className="row-meta">
                          {line.form} · {line.field}
                        </span>
                      </div>
                      <strong>{formatMoney(line.amount)}</strong>
                    </div>
                  ))}
                </section>
              )}
              <section className="list-panel panel">
                <h2>Already on file</h2>
                <div className="row-item">
                  <div>
                    <strong>Wages</strong>
                    <span className="row-meta">From documents — not re-asked</span>
                  </div>
                  <strong>{formatMoney(taxProfile.wages)}</strong>
                </div>
                <div className="row-item">
                  <div>
                    <strong>Withholding</strong>
                    <span className="row-meta">From documents — not re-asked</span>
                  </div>
                  <strong>{formatMoney(taxProfile.withholding)}</strong>
                </div>
                <div className="row-item">
                  <div>
                    <strong>Filing status</strong>
                    <span className="row-meta">From interview when legally needed</span>
                  </div>
                  <strong>{taxProfile.filingStatus}</strong>
                </div>
                <div className="row-item">
                  <div>
                    <strong>Dependents</strong>
                    <span className="row-meta">
                      {benefitReport?.dependentInfoComplete
                        ? 'Verified for credit calculation'
                        : 'Interview incomplete — credits blocked'}
                    </span>
                  </div>
                  <strong>{taxProfile.dependents.length}</strong>
                </div>
                <Link className="btn btn-secondary" to="/app/taxpayer/dependents">
                  Open dependent interview
                </Link>
              </section>
            </div>
          </div>
        </section>
      )}

      {prepStep >= 3 && prepStep < 5 && (
        <section className="grid-2 rise">
          <div className="result-hero panel">
            <span className="badge badge-ok">Tax calculation</span>
            <p className="eyebrow" style={{ marginTop: '0.8rem' }}>
              Estimated refund / balance
            </p>
            <p className="amount">{formatMoney(benefitReport?.projectedRefund ?? mine?.refundOrOwe ?? 0)}</p>
            <p className="muted">
              Base from confirmed documents {formatMoney(benefitReport?.baseRefund ?? 0)}. Verified benefits{' '}
              {formatMoney(benefitReport?.verifiedSavings ?? 0)}. Potential still under review{' '}
              {formatMoney(benefitReport?.potentialSavings ?? 0)}. Unsupported deductions are never applied.
            </p>
            <div style={{ margin: '1rem 0' }}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${mine?.readiness ?? 88}%` }} />
              </div>
            </div>
            {prepStep === 3 && (
              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" type="button" onClick={() => actions.setPrepStep(4)}>
                  Continue to review &amp; sign
                </button>
                <Link className="btn btn-secondary" to="/app/taxpayer/benefits">
                  Find more tax savings
                </Link>
              </div>
            )}
          </div>
          {prepStep === 4 && (
            <div className="list-panel panel">
              <h2>Review → Signature → E-file</h2>
              <p className="muted">
                Professional review when required. Bank products optional and separately disclosed.
              </p>
              {(mine?.feeSnapshot ?? []).map((f) => (
                <div className="row-item" key={f.label}>
                  <div>
                    <strong>{f.label}</strong>
                    <span className="row-meta">{f.status}</span>
                  </div>
                  <strong>{formatMoney(f.amount)}</strong>
                </div>
              ))}
              <div className="row-item">
                <div>
                  <strong>Benefit audit</strong>
                  <span className="row-meta">
                    {benefitReport?.auditComplete
                      ? 'Complete'
                      : `${benefitReport?.blockers.length ?? 0} open items — filing should not claim unverified benefits`}
                  </span>
                </div>
                <Link to="/app/taxpayer/benefits/review">Open</Link>
              </div>
              <AnswerHistory items={interviewAnswers} onEdit={(mapsTo) => {
                actions.editInterviewAnswer(mapsTo)
              }} />
              <button className="btn btn-primary" type="button" style={{ marginTop: '0.75rem' }} onClick={() => actions.signAndFile()}>
                Approve, sign &amp; e-file
              </button>
            </div>
          )}
        </section>
      )}

      {prepStep >= 5 && (
        <section className="result-hero panel rise">
          <span className="badge badge-ok">E-file transmitted</span>
          <h2 style={{ marginBottom: 0 }}>Return submitted — year-round support continues</h2>
          <p className="muted">Documents stay in your vault. Refund tracker remains active.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <Link className="btn btn-primary" to="/app/taxpayer/vault">
              Open Tax Vault
            </Link>
            <Link className="btn btn-secondary" to="/app/taxpayer">
              Year-round home
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
