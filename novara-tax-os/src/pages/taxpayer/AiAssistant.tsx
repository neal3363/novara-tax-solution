import { useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { InterviewChoice } from '../../components/interview/InterviewChoice'
import { VoiceInput } from '../../components/VoiceInput'
import { nextInterviewTurn } from '../../engine/questionProgress'
import { QuestionOverview, QuestionProgressBar } from '../../components/interview/QuestionProgress'
import {
  DOCUMENT_REQUESTS,
  docsAlreadySatisfied,
  nextRelationshipPrompt,
  outstandingDocumentRequests,
} from '../../engine/documentIntakeEngine'
import { buildDocumentChecklist } from '../../engine/documentChecklist'
import { runPreFilingQa } from '../../engine/qaEngine'
import '../shared.css'

/**
 * One-screen AI tax assistant — upload, ask, review refund, missing docs, without form maze.
 */
export function AiAssistant() {
  const {
    documents,
    taxProfile,
    benefitReport,
    interviewChat,
    householdIntake,
    currentUser,
    activeTaxYear,
    returns,
    benefitReviewSigned,
  } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [typed, setTyped] = useState('')
  const [pendingVoice, setPendingVoice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === activeTaxYear)
  const checklist = useMemo(() => buildDocumentChecklist(taxProfile, documents), [taxProfile, documents])
  const outstanding = outstandingDocumentRequests(documents, householdIntake)
  const qa = useMemo(
    () =>
      runPreFilingQa({
        profile: taxProfile,
        documents,
        taxReturn: mine,
        benefitReviewSigned,
        authorizedToFile: false,
      }),
    [taxProfile, documents, mine, benefitReviewSigned],
  )

  const activeTurn = nextInterviewTurn(taxProfile)

  const rel = nextRelationshipPrompt(householdIntake)

  async function submitAnswer(value: string | number) {
    if (!activeTurn || saving) return
    setSaving(true)
    try {
      if (activeTurn.phase === 'dependents' || activeTurn.mapsTo.startsWith('dep_') || activeTurn.mapsTo === 'potential_dependents' || activeTurn.mapsTo === 'dependent_count') {
        actions.answerDependentQuestion(activeTurn.mapsTo, value, activeTurn.prompt)
      } else {
        actions.answerSmartInterview(activeTurn.mapsTo, value, activeTurn.prompt)
      }
      setTyped('')
      setPendingVoice(null)
    } finally {
      setSaving(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) actions.uploadFiles(e.dataTransfer.files)
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">AI tax assistant · TY{activeTaxYear}</p>
          <h1>Upload. Answer. NOVARA handles the tax work.</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/taxpayer/years/select">
          Change years
        </Link>
      </header>

      <div className="grid-2 rise">
        <section className="list-panel panel">
          <h2>1. Documents</h2>
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
          >
            <span className="badge">Drop files</span>
            <p>ID, W-2s, 1099s, dependent docs — AI extracts what it can. You confirm uncertain fields.</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.json"
              onChange={(e) => e.target.files && actions.uploadFiles(e.target.files)}
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            {DOCUMENT_REQUESTS.filter((r) => r.tier === 'required').slice(0, 4).map((r) => (
              <div className="row-item" key={r.id}>
                <div>
                  <strong>{r.label}</strong>
                </div>
                <span className={`badge ${docsAlreadySatisfied(documents, r) ? 'badge-ok' : 'badge-warn'}`}>
                  {docsAlreadySatisfied(documents, r) ? 'Received' : 'Needed'}
                </span>
              </div>
            ))}
          </div>
          {documents.length > 0 && householdIntake.phase === 'extract_review' && (
            <button className="btn btn-primary" type="button" style={{ marginTop: '0.75rem' }} onClick={() => actions.confirmExtracedDetails()}>
              Confirm extracts — who is filing?
            </button>
          )}
          {householdIntake.phase === 'identify_primary' && (
            <div style={{ marginTop: '0.75rem' }}>
              <p>
                <strong>Which person is filing?</strong>
              </p>
              {householdIntake.candidates.map((p) => (
                <button
                  key={p.id}
                  className="btn btn-secondary"
                  type="button"
                  style={{ marginRight: '0.4rem', marginBottom: '0.4rem' }}
                  onClick={() => actions.setPrimaryTaxpayer(p.id)}
                >
                  {p.fullLegalName}
                </button>
              ))}
            </div>
          )}
          {rel && (
            <div style={{ marginTop: '0.75rem' }}>
              <p>
                <strong>{rel.prompt}</strong>
              </p>
              <Link className="btn btn-secondary" to="/app/taxpayer/prepare">
                Confirm relationships
              </Link>
            </div>
          )}
        </section>

        <section className="list-panel panel">
          <h2>2. Live estimate</h2>
          <RefundTracker report={benefitReport} />
          <p className="muted">
            Status:{' '}
            {benefitReport?.refundIncomplete
              ? 'Awaiting information'
              : benefitReport?.auditComplete
                ? 'Ready for final review'
                : 'Preliminary'}
          </p>
          <div className="row-item">
            <div>
              <strong>Federal estimate</strong>
            </div>
            <strong>{formatMoney(benefitReport?.projectedRefund ?? 0)}</strong>
          </div>
          <div className="row-item">
            <div>
              <strong>State estimate</strong>
              <span className="row-meta">Where supported — sandbox</span>
            </div>
            <strong>—</strong>
          </div>
        </section>
      </div>

      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <h2>3. Ask me anything · type or speak</h2>
        <QuestionProgressBar profile={taxProfile} />
        <div className="chat-log" style={{ maxHeight: 220, overflow: 'auto', marginBottom: '0.75rem' }}>
          {interviewChat.slice(-8).map((m) => (
            <div key={m.id} className={`chat-bubble ${m.role}`}>
              <p>{m.text}</p>
            </div>
          ))}
        </div>

        {activeTurn ? (
          <InterviewChoice
            key={activeTurn.id}
            questionId={activeTurn.id}
            prompt={activeTurn.prompt}
            kind={activeTurn.kind}
            choices={activeTurn.choices}
            saving={saving}
            onConfirm={(v) => void submitAnswer(v)}
          />
        ) : (
          <p className="muted">No required question right now. Upload more docs or continue to review.</p>
        )}
        <QuestionOverview
          profile={taxProfile}
          focusMapsTo={activeTurn?.mapsTo}
          onSelectUnanswered={(q) => actions.focusInterviewQuestion(q.mapsTo)}
          onEditAnswered={(mapsTo) => actions.editInterviewAnswer(mapsTo)}
        />

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginTop: '0.75rem', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="aiType">Or type freely</label>
            <input
              id="aiType"
              value={pendingVoice ?? typed}
              onChange={(e) => {
                setPendingVoice(null)
                setTyped(e.target.value)
              }}
              placeholder="e.g. I drove 4,200 business miles"
            />
          </div>
          <VoiceInput
            onTranscript={(text) => {
              setPendingVoice(text)
              setTyped(text)
            }}
          />
          <button
            className="btn btn-primary"
            type="button"
            disabled={!(pendingVoice ?? typed).trim()}
            onClick={() => {
              const text = (pendingVoice ?? typed).trim()
              if (!text) return
              actions.askAi(text)
              setTyped('')
              setPendingVoice(null)
            }}
          >
            {pendingVoice ? 'Confirm spoken answer' : 'Send'}
          </button>
        </div>
        {pendingVoice && (
          <p className="muted">Spoken answer needs your confirmation before it updates the return.</p>
        )}
      </section>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel">
          <h2>4. Missing documents</h2>
          {outstanding.length === 0 && checklist.filter((c) => c.status === 'needed').length === 0 && (
            <p className="muted">Nothing required outstanding from the current facts.</p>
          )}
          {[...outstanding.map((o) => ({ id: o.id, name: o.label, reason: o.detail })), ...checklist.filter((c) => c.status === 'needed').map((c) => ({ id: c.id, name: c.name, reason: c.reason }))]
            .slice(0, 8)
            .map((d) => (
              <div className="row-item" key={d.id}>
                <div>
                  <strong>{d.name}</strong>
                  <span className="row-meta">{d.reason}</span>
                </div>
              </div>
            ))}
        </section>
        <section className="list-panel panel">
          <h2>5. Pre-filing QA</h2>
          <p className={qa.canFile ? 'muted' : undefined}>
            <strong>{qa.summary}</strong>
          </p>
          {qa.findings.slice(0, 6).map((f) => (
            <div className="row-item" key={f.id}>
              <div>
                <strong>{f.title}</strong>
                <span className="row-meta">
                  {f.explanation} → {f.action}
                </span>
              </div>
              <span className={`badge ${f.severity === 'critical' ? 'badge-warn' : 'badge-neutral'}`}>{f.severity}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <Link className="btn btn-secondary" to="/app/taxpayer/prepare">
              Full prepare flow
            </Link>
            <Link className="btn btn-primary" to="/app/taxpayer/benefits/review">
              Review &amp; authorize
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
