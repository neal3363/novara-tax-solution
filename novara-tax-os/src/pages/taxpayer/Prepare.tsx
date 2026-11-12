import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import '../shared.css'

const STEPS = ['Drop Zone', 'Verify', 'Questions', 'Your Result', 'Approve & Sign', 'Done']

export function Prepare() {
  const { documents, questions, prepStep, returns, currentUser } = useAppStore()
  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === 2025)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) actions.uploadFiles(e.dataTransfer.files)
  }

  const answered = questions.filter((q) => q.answer).length

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Upload & Done</p>
          <h1>Prepare your return</h1>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => actions.resetDemo()}>
          Reset demo
        </button>
      </header>

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
            <span className="badge">Upload Anything Mode</span>
            <h2>Drop your tax documents</h2>
            <p>Photos, PDFs, screenshots, mixed bundles. We scan, classify, extract, and link every value to its source.</p>
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
              <h2>Extraction & verification</h2>
              {documents.slice(0, 6).map((d) => (
                <div className="row-item" key={d.id}>
                  <div>
                    <strong>
                      {d.type} · {d.name}
                    </strong>
                    <span className="row-meta">
                      Confidence {Math.round(d.confidence * 100) || '—'}% · {d.status}
                    </span>
                    <div style={{ marginTop: '0.45rem', display: 'grid', gap: '0.35rem' }}>
                      {d.facts.map((f) => (
                        <div key={f.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="row-meta">
                            {f.label}: <strong style={{ color: 'var(--ink)' }}>{f.value}</strong> (p.{f.sourcePage})
                          </span>
                          {!f.verified && d.status !== 'scanning' && (
                            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem' }} type="button" onClick={() => actions.verifyFact(d.id, f.id)}>
                              Verify
                            </button>
                          )}
                          {f.verified && <span className="badge badge-ok">Verified</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary" type="button" onClick={() => actions.setPrepStep(2)}>
                  Continue to smart questions
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {prepStep === 2 && (
        <section className="rise">
          <div className="list-panel panel">
            <h2>Smart questions — only true gaps</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Target: 10 or fewer for W-2 filers. Plain-language answers tied to the Tax Data Graph.
            </p>
            <div className="question-list">
              {questions.map((q) => (
                <div className="question panel" key={q.id}>
                  <p>{q.prompt}</p>
                  <div className="answer-row">
                    {['Yes', 'No', 'Not sure'].map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={`btn ${q.answer === a ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => actions.answerQuestion(q.id, a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                type="button"
                disabled={answered < questions.length}
                onClick={() => actions.completeQuestions()}
              >
                Calculate my result ({answered}/{questions.length})
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => actions.setPrepStep(1)}>
                Back
              </button>
            </div>
          </div>
        </section>
      )}

      {prepStep >= 3 && prepStep < 5 && (
        <section className="grid-2 rise">
          <div className="result-hero panel">
            <span className="badge badge-ok">Deterministic engine result</span>
            <p className="eyebrow" style={{ marginTop: '0.8rem' }}>
              Estimated refund
            </p>
            <p className="amount">{formatMoney(mine?.refundOrOwe || 0)}</p>
            <p className="muted">
              30-second why: wages and withholding from verified W-2 facts, plus screened credits. Tap-any-number provenance
              is available on each extracted field. Not a guarantee — eligibility confirmed by versioned rules + review.
            </p>
            <div style={{ margin: '1rem 0' }}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${mine?.readiness ?? 90}%` }} />
              </div>
              <p className="row-meta" style={{ marginTop: '0.45rem' }}>
                Return readiness {mine?.readiness ?? 90}% — Pre-Rejection Check clear
              </p>
            </div>
            {prepStep === 3 && (
              <button className="btn btn-primary" type="button" onClick={() => actions.setPrepStep(4)}>
                Continue to Approve & Sign
              </button>
            )}
          </div>
          {prepStep === 4 && (
            <div className="list-panel panel">
              <h2>Approve & Sign</h2>
              <p className="muted">
                Itemized estimate (provisional consumer pricing shown for demo). Bank products optional and partner-priced.
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
                  <strong>Consent & e-sign</strong>
                  <span className="row-meta">Preparation use · AI processing · e-file authorization</span>
                </div>
                <span className="badge">Required</span>
              </div>
              <button className="btn btn-primary" type="button" style={{ marginTop: '0.75rem' }} onClick={() => actions.signAndFile()}>
                Approve, sign & file
              </button>
            </div>
          )}
        </section>
      )}

      {prepStep >= 5 && (
        <section className="result-hero panel rise">
          <span className="badge badge-ok">Accepted</span>
          <h2 style={{ marginBottom: 0 }}>You’re done for filing — we’re not done for the year</h2>
          <p className="muted">
            Final records are in your Tax Vault. Live refund tracker is active. Next year’s organizer is drafting from this
            return.
          </p>
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
