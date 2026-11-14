import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { AppliedBenefitBanner } from '../../components/benefits/AppliedBenefitBanner'
import { SavingsOpportunityPanel } from '../../components/benefits/SavingsOpportunityPanel'
import { InterviewChoice } from '../../components/interview/InterviewChoice'
import { VoiceInput } from '../../components/VoiceInput'
import { NovaraSpeak } from '../../components/NovaraSpeak'
import { resolveInterviewTurn, buildInterviewProgress } from '../../engine/questionProgress'
import { QuestionOverview, QuestionProgressBar } from '../../components/interview/QuestionProgress'
import { detectFilingIntent } from '../../engine/conversationIntent'
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
 * Conversational tax assistant — speak, type, or upload into ONE shared interview engine.
 * Voice is optional at every step; calculations never come from conversational guesses.
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
    interviewFocusMapsTo,
  } = useAppStore()
  const [params] = useSearchParams()
  const mode = params.get('mode')
  const inputRef = useRef<HTMLInputElement>(null)
  const answerPanelRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'upload') {
      // Defer so the dropzone input is mounted
      requestAnimationFrame(() => inputRef.current?.click())
      return
    }
    if (mode === 'speak' || mode === 'type') {
      document.getElementById('novara-compose')?.scrollIntoView({ behavior: 'auto', block: 'center' })
      if (mode === 'type') typeRef.current?.focus()
    }
  }, [mode])
  const [drag, setDrag] = useState(false)
  const [typed, setTyped] = useState('')
  const [pendingVoice, setPendingVoice] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{ mapsTo: string; value: string | number; label: string } | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const [voiceOut, setVoiceOut] = useState(false)
  const [voiceRate, setVoiceRate] = useState(1)

  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === activeTaxYear)
  const checklist = useMemo(() => buildDocumentChecklist(taxProfile, documents), [taxProfile, documents])
  const outstanding = outstandingDocumentRequests(documents, householdIntake)
  const progress = useMemo(() => buildInterviewProgress(taxProfile), [taxProfile])
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

  const activeTurn = resolveInterviewTurn(taxProfile, interviewFocusMapsTo)
  const rel = nextRelationshipPrompt(householdIntake)

  function openUnanswered(mapsTo: string) {
    actions.focusInterviewQuestion(mapsTo)
    requestAnimationFrame(() => {
      answerPanelRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' })
    })
  }

  async function submitAnswer(value: string | number) {
    if (!activeTurn || saving) return
    setSaving(true)
    try {
      if (
        activeTurn.phase === 'dependents' ||
        activeTurn.mapsTo.startsWith('dep_') ||
        activeTurn.mapsTo === 'potential_dependents' ||
        activeTurn.mapsTo === 'dependent_count'
      ) {
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

  function handleConversation(raw: string) {
    const text = raw.trim()
    if (!text) return
    const cmd = detectFilingIntent(text)

    if (cmd.type === 'yes_no' && activeTurn) {
      // submitAnswer already appends to interviewChat via answerSmartInterview / dependent path
      void submitAnswer(cmd.value === 'yes' ? 'Yes' : 'No')
      return
    }
    if (cmd.type === 'continue') {
      const next = progress.nextUnanswered
      if (next) openUnanswered(next.mapsTo)
      actions.addMessage('user', text)
      actions.addMessage('assistant', next ? `Continuing with: ${next.prompt}` : 'Nothing unanswered right now.')
      return
    }
    if (cmd.type === 'show_unanswered') {
      const list = progress.questions.filter((q) => q.status === 'unanswered').slice(0, 8)
      actions.addMessage('user', text)
      actions.addMessage(
        'assistant',
        list.length
          ? `You still have ${progress.unansweredCount} unanswered. Next up: ${list.map((q) => q.prompt).join(' · ')}`
          : 'No unanswered interview questions right now.',
      )
      if (list[0]) openUnanswered(list[0].mapsTo)
      return
    }
    if (cmd.type === 'goto_mapsTo' || cmd.type === 'edit_mapsTo') {
      actions.addMessage('user', text)
      if (cmd.type === 'edit_mapsTo') {
        actions.editInterviewAnswer(cmd.mapsTo)
        actions.addMessage('assistant', `Opening ${cmd.label} so you can change it. Confirm the new answer before it saves.`)
      } else {
        openUnanswered(cmd.mapsTo)
        actions.addMessage('assistant', `Opening ${cmd.label}.`)
      }
      return
    }
    if (cmd.type === 'set_amount') {
      setPendingConfirm({ mapsTo: cmd.mapsTo, value: cmd.value, label: cmd.label })
      actions.addMessage('user', text)
      actions.addMessage(
        'assistant',
        `I heard ${cmd.label} as ${cmd.value}. Confirm to save that amount to your return, or edit the text and send again.`,
      )
      return
    }
    if (cmd.type === 'intent') {
      actions.addMessage('user', text)
      if (cmd.taxYear) actions.setActiveTaxYear(cmd.taxYear)
      actions.setPrepStep(Math.max(2, 2))
      const clarify = cmd.clarify
      actions.addMessage(
        'assistant',
        clarify
          ? `Got it — ${cmd.intent.replace(/_/g, ' ')}. ${clarify}`
          : `Got it — routing you for ${cmd.intent.replace(/_/g, ' ')}. Upload docs or answer the next question below. Voice stays optional.`,
      )
      if (progress.nextUnanswered) openUnanswered(progress.nextUnanswered.mapsTo)
      return
    }

    // free_text / none — shared NL fact ingest (same engine as Prepare)
    actions.askAi(text)
  }

  function confirmPendingAmount() {
    if (!pendingConfirm) return
    actions.answerSmartInterview(pendingConfirm.mapsTo, pendingConfirm.value, pendingConfirm.label)
    actions.addMessage('assistant', `Saved ${pendingConfirm.label}: ${pendingConfirm.value}.`)
    setPendingConfirm(null)
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
          <p className="eyebrow">NOVARA conversational assistant · TY{activeTaxYear}</p>
          <h1>Speak It. Upload It. File It.</h1>
          <p className="muted" style={{ marginTop: '0.35rem', maxWidth: '36rem' }}>
            Tell NOVARA what you’re filing, upload documents, and answer only what’s still missing. Switch between voice
            and typing anytime — one shared interview.
          </p>
        </div>
        <Link className="btn btn-secondary" to="/app/taxpayer/years/select">
          Change years
        </Link>
      </header>

      <section className="list-panel panel rise" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              document.getElementById('novara-compose')?.scrollIntoView({ behavior: 'auto', block: 'center' })
            }}
          >
            Start Speaking
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => inputRef.current?.click()}>
            Upload Documents
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              typeRef.current?.focus()
              document.getElementById('novara-compose')?.scrollIntoView({ behavior: 'auto', block: 'center' })
            }}
          >
            Type to NOVARA
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 0, marginTop: '0.65rem' }}>
          Microphone never starts by itself. Browser speech (when available) requires your permission; confirm names and
          amounts before they save.
        </p>
      </section>

      <div className="grid-2 rise">
        <section className="list-panel panel">
          <h2>1. Documents</h2>
          <div
            className={`dropzone ${drag ? 'drag' : ''} ${mode === 'upload' ? 'drag' : ''}`}
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
            <p>ID, W-2s, 1099s, dependent docs — AI extracts what it can. You confirm uncertain fields. We never invent missing values.</p>
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
          <AppliedBenefitBanner events={benefitReport?.lastApplications} returnPath="/app/taxpayer/assistant" />
          <SavingsOpportunityPanel
            report={benefitReport}
            compact
            onOpenMapsTo={(mapsTo) => {
              actions.focusInterviewQuestion(mapsTo)
            }}
          />
          <p className="muted">
            Status:{' '}
            {benefitReport?.refundIncomplete
              ? 'Awaiting information'
              : benefitReport?.auditComplete
                ? 'Ready for final review'
                : 'Preliminary'}{' '}
            — engine calc only (not AI guesses).
          </p>
          <div className="row-item">
            <div>
              <strong>Federal estimate</strong>
            </div>
            <strong>{formatMoney(benefitReport?.projectedRefund ?? 0)}</strong>
          </div>
        </section>
      </div>

      <section className="list-panel panel rise" style={{ marginTop: '1rem' }} id="novara-compose">
        <h2>3. Talk with NOVARA · voice or text</h2>
        <QuestionProgressBar profile={taxProfile} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
            <input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} />
            Allow NOVARA to speak questions (optional)
          </label>
          <label style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
            Speed
            <select value={voiceRate} onChange={(e) => setVoiceRate(Number(e.target.value))} disabled={!voiceOut}>
              <option value={0.85}>Slow</option>
              <option value={1}>Normal</option>
              <option value={1.15}>Faster</option>
            </select>
          </label>
          <NovaraSpeak text={activeTurn?.prompt ?? ''} enabled={voiceOut} rate={voiceRate} />
        </div>

        <div className="chat-log" style={{ maxHeight: 220, overflow: 'auto', marginBottom: '0.75rem' }}>
          {interviewChat.slice(-10).map((m) => (
            <div key={m.id} className={`chat-bubble ${m.role}`}>
              <p>{m.text}</p>
            </div>
          ))}
        </div>

        <QuestionOverview
          profile={taxProfile}
          focusMapsTo={activeTurn?.mapsTo ?? interviewFocusMapsTo}
          onSelectUnanswered={(q) => openUnanswered(q.mapsTo)}
          onEditAnswered={(mapsTo) => {
            actions.editInterviewAnswer(mapsTo)
            requestAnimationFrame(() => {
              answerPanelRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' })
            })
          }}
        />

        <div
          className="active-turn"
          id="assistant-active-answer"
          ref={answerPanelRef}
          style={{ marginTop: '1rem', scrollMarginTop: '5rem' }}
        >
          {activeTurn ? (
            <>
              <p className="turn-label" style={{ marginTop: 0 }}>
                Current question — tap Yes/No, type, or speak then confirm
              </p>
              <InterviewChoice
                key={activeTurn.id}
                questionId={activeTurn.id}
                mapsTo={activeTurn.mapsTo}
                prompt={activeTurn.prompt}
                kind={activeTurn.kind}
                choices={activeTurn.choices}
                saving={saving}
                onConfirm={(v) => void submitAnswer(v)}
              />
            </>
          ) : (
            <p className="muted">
              No required interview question right now. Use <Link to="/app/taxpayer/benefits">Benefits</Link> for optional
              questionnaires, or continue to review.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginTop: '0.75rem', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="aiType">Type to NOVARA</label>
            <input
              ref={typeRef}
              id="aiType"
              value={pendingVoice ?? typed}
              onChange={(e) => {
                setPendingVoice(null)
                setTyped(e.target.value)
              }}
              placeholder='e.g. “I’m filing personal and business” or “Go back to childcare”'
            />
          </div>
          <VoiceInput
            labelStart="Start speaking"
            labelStop="Stop listening"
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
              handleConversation(text)
              setTyped('')
              setPendingVoice(null)
            }}
          >
            {pendingVoice ? 'Confirm spoken message' : 'Send'}
          </button>
        </div>
        {pendingVoice && (
          <p className="muted">Spoken text needs your confirmation before it updates the return.</p>
        )}
        {pendingConfirm && (
          <div className="callout-success" style={{ marginTop: '0.75rem' }}>
            <p>
              Confirm change: <strong>{pendingConfirm.label}</strong> → {String(pendingConfirm.value)}
            </p>
            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={confirmPendingAmount}>
                Save to return
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setPendingConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel">
          <h2>4. Missing documents</h2>
          {outstanding.length === 0 && checklist.filter((c) => c.status === 'needed').length === 0 && (
            <p className="muted">Nothing required outstanding from the current facts.</p>
          )}
          {[
            ...outstanding.map((o) => ({ id: o.id, name: o.label, reason: o.detail })),
            ...checklist.filter((c) => c.status === 'needed').map((c) => ({ id: c.id, name: c.name, reason: c.reason })),
          ]
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
            <Link className="btn btn-primary" to="/app/taxpayer/final-review">
              Checklist, return &amp; sign
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
