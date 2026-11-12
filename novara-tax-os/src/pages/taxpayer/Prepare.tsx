import { useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import {
  extractConfirmedFields,
  knownFactsSummary,
  nextBenefitDiscoveryTurn,
  nextFilingStatusTurn,
} from '../../engine/smartInterview'
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
  const { documents, prepStep, returns, currentUser, taxProfile, benefitReport, interviewChat } = useAppStore()
  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === 2025)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const fields = useMemo(() => extractConfirmedFields(documents), [documents])
  const known = useMemo(() => knownFactsSummary(documents, taxProfile), [documents, taxProfile])

  const filingTurn = nextFilingStatusTurn(taxProfile)
  const benefitTurn = filingTurn ? null : nextBenefitDiscoveryTurn(taxProfile)
  const activeTurn = filingTurn ?? benefitTurn

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) actions.uploadFiles(e.dataTransfer.files)
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
        signature → e-file. NOVARA asks once, reuses answers, and never invents deductions.
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
                <button className="btn btn-primary" type="button" onClick={() => actions.confirmExtractionsDetails()}>
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
                Feels like an experienced tax pro — dynamic follow-ups only, based on your documents and prior answers.
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
                    {activeTurn.phase === 'filing_status' ? 'Filing status' : 'Tax benefit discovery'}
                  </p>
                  <div className="answer-row">
                    {activeTurn.kind === 'choice' || activeTurn.kind === 'yesno'
                      ? (activeTurn.choices ?? ['Yes', 'No']).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => actions.answerSmartInterview(activeTurn.mapsTo, c)}
                          >
                            {c}
                          </button>
                        ))
                      : null}
                    {activeTurn.kind === 'number' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          const raw = window.prompt('Enter amount (USD)', '4500')
                          if (raw != null) actions.answerSmartInterview(activeTurn.mapsTo, Number(raw) || 0)
                        }}
                      >
                        Enter amount
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => actions.markBenefitUnresolved(activeTurn.mapsTo)}
                    >
                      Skip / unresolved
                    </button>
                  </div>
                </div>
              ) : (
                <div className="answer-row">
                  <button className="btn btn-primary" type="button" onClick={() => actions.completeSmartInterview()}>
                    Calculate my result
                  </button>
                </div>
              )}
            </div>

            <div className="side-stack">
              <RefundTracker report={benefitReport} />
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
                  </div>
                  <strong>{taxProfile.dependents.length}</strong>
                </div>
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
