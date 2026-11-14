import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { AppliedBenefitBanner } from '../../components/benefits/AppliedBenefitBanner'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { SavingsOpportunityPanel } from '../../components/benefits/SavingsOpportunityPanel'
import { RefundMaximizer } from '../../components/benefits/RefundMaximizer'
import { AnswerHistory, InterviewChoice } from '../../components/interview/InterviewChoice'
import { QuestionOverview, QuestionProgressBar } from '../../components/interview/QuestionProgress'
import {
  QuestionnaireTabs,
  sectionStats,
  type QuestionnaireSectionId,
} from '../../components/interview/QuestionnaireTabs'
import { VoiceInput } from '../../components/VoiceInput'
import { NovaraSpeak } from '../../components/NovaraSpeak'
import { detectFilingIntent } from '../../engine/conversationIntent'
import {
  extractConfirmedFields,
  knownFactsSummary,
} from '../../engine/smartInterview'
import { resolveInterviewTurn } from '../../engine/questionProgress'
import {
  DOCUMENT_REQUESTS,
  RELATIONSHIP_CHOICES,
  docsAlreadySatisfied,
  nextDependentQualifyPrompt,
  nextRelationshipPrompt,
  outstandingDocumentRequests,
  type HouseholdRelationChoice,
} from '../../engine/documentIntakeEngine'
import { buildDocumentChecklist } from '../../engine/documentChecklist'
import { takeLandingUploads } from '../../engine/pendingLandingUploads'
import '../shared.css'
import './Prepare.css'

const INTENT_KEY = 'novara-pending-intent'

const STEPS = [
  'Upload',
  'Extract',
  'Identify',
  'Household',
  'Interview',
  'Calculate',
  'Review',
  'E-file',
]

function stepIndex(phase: string, prepStep: number): number {
  if (prepStep >= 5) return 7
  if (prepStep >= 4) return 6
  if (prepStep >= 3) return 5
  if (prepStep >= 2 || phase === 'interview') return 4
  if (phase === 'confirm_relationships' || phase === 'discover_missing') return 3
  if (phase === 'identify_primary') return 2
  if (phase === 'extract_review' || prepStep === 1) return 1
  return 0
}

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
    householdIntake,
    interviewFocusMapsTo,
    activeTaxYear,
  } = useAppStore()
  const [params] = useSearchParams()
  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === activeTaxYear)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameEdit, setNameEdit] = useState('')
  const [missingName, setMissingName] = useState('')
  const [missingDob, setMissingDob] = useState('')
  const [missingRel, setMissingRel] = useState<HouseholdRelationChoice>('son')
  const [section, setSection] = useState<QuestionnaireSectionId>('filing')
  const [compose, setCompose] = useState('')
  const [pendingVoice, setPendingVoice] = useState<string | null>(null)
  const [voiceOut, setVoiceOut] = useState(false)
  const fields = useMemo(() => extractConfirmedFields(documents), [documents])
  const known = useMemo(() => knownFactsSummary(documents, taxProfile), [documents, taxProfile])
  const activeStep = stepIndex(householdIntake.phase, prepStep)
  const outstanding = outstandingDocumentRequests(documents, householdIntake)
  const checklist = useMemo(() => buildDocumentChecklist(taxProfile, documents), [taxProfile, documents])

  const activeTurn = resolveInterviewTurn(taxProfile, interviewFocusMapsTo)
  const relPrompt = nextRelationshipPrompt(householdIntake)
  const qualifyPrompt = nextDependentQualifyPrompt(householdIntake)

  useEffect(() => {
    // Welcome-screen intent / upload handoff
    let intentRaw: string | null = null
    try {
      intentRaw = sessionStorage.getItem(INTENT_KEY)
      if (intentRaw) sessionStorage.removeItem(INTENT_KEY)
    } catch {
      /* ignore */
    }
    if (intentRaw) {
      try {
        const parsed = JSON.parse(intentRaw) as {
          text?: string
          intent?: string
          taxYear?: number
          clarify?: string
        }
        if (parsed.taxYear) actions.setActiveTaxYear(parsed.taxYear)
        actions.setPrepStep(2)
        if (parsed.text) {
          actions.addMessage('user', parsed.text)
          actions.addMessage(
            'assistant',
            parsed.clarify
              ? `Got it — ${String(parsed.intent ?? 'filing').replace(/_/g, ' ')}. ${parsed.clarify}`
              : `Got it — opening your questionnaire for ${String(parsed.intent ?? 'your return').replace(/_/g, ' ')}. Tabs show what’s complete and what’s still needed. Speak, type, or upload anytime.`,
          )
        }
        if (parsed.intent === 'personal_and_business' || parsed.intent === 'business') {
          setSection('business')
          // Unlock business follow-ups (mileage, depreciation, QBI, etc.) in the shared interview.
          actions.answerSmartInterview(
            'self_employed',
            'Yes',
            'Did you earn money from your own business or freelancing?',
          )
          actions.focusInterviewQuestion('business_structure')
        } else if (parsed.intent === 'amend' || parsed.intent === 'prior_year') {
          setSection('filing')
        } else {
          setSection('filing')
        }
      } catch {
        actions.setPrepStep(2)
      }
    }
    const stashed = takeLandingUploads()
    if (stashed.length > 0) {
      actions.uploadFiles(stashed)
      actions.setPrepStep(2)
      actions.addMessage(
        'assistant',
        `Sorted ${stashed.length} landing upload${stashed.length === 1 ? '' : 's'} into your return by document type. Missing a credit receipt? Upload it later from Documents or the Vault — it will route the same way.`,
      )
    } else if (params.get('upload') === '1') {
      // Legacy handoff: open the picker if the landing page only set the flag.
      requestAnimationFrame(() => inputRef.current?.click())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on enter
  }, [])

  useEffect(() => {
    if (!activeTurn) return
    document.querySelector('.active-turn')?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  }, [interviewFocusMapsTo, activeTurn])

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) actions.uploadFiles(e.dataTransfer.files)
  }

  async function confirmTurn(value: string | number) {
    if (!activeTurn || saving) return
    setSaving(true)
    try {
      if (
        activeTurn.phase === 'dependents' ||
        activeTurn.mapsTo.startsWith('dep_') ||
        activeTurn.mapsTo === 'dependent_count' ||
        activeTurn.mapsTo === 'potential_dependents'
      ) {
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
    if (activeTurn.phase === 'dependents') return
    setSaving(true)
    try {
      actions.markBenefitUnresolved(activeTurn.mapsTo, activeTurn.prompt)
      await new Promise((r) => setTimeout(r, 160))
    } finally {
      setSaving(false)
    }
  }

  function addMissing(e: FormEvent) {
    e.preventDefault()
    if (!missingName.trim()) return
    actions.addMissingHouseholdPerson({
      fullLegalName: missingName.trim(),
      dateOfBirth: missingDob || undefined,
      relation: missingRel,
    })
    setMissingName('')
    setMissingDob('')
  }

  const showUpload =
    section === 'personal' ||
    section === 'income' ||
    (prepStep <= 1 && (householdIntake.phase === 'upload' || householdIntake.phase === 'extract_review'))
  const showIdentify = householdIntake.phase === 'identify_primary'
  const showRelationships = householdIntake.phase === 'confirm_relationships'
  const showMissing = householdIntake.phase === 'discover_missing'
  const showInterview = prepStep >= 2 || householdIntake.phase === 'interview' || section !== 'personal'

  function openUnanswered(mapsTo: string) {
    actions.focusInterviewQuestion(mapsTo)
    requestAnimationFrame(() => {
      document.querySelector('.active-turn')?.scrollIntoView({ behavior: 'auto', block: 'center' })
    })
  }

  function handleCompose(raw: string) {
    const text = raw.trim()
    if (!text) return
    const cmd = detectFilingIntent(text)
    if (cmd.type === 'yes_no' && activeTurn) {
      void confirmTurn(cmd.value === 'yes' ? 'Yes' : 'No')
      setCompose('')
      setPendingVoice(null)
      return
    }
    if (cmd.type === 'goto_mapsTo' || cmd.type === 'edit_mapsTo') {
      if (cmd.type === 'edit_mapsTo') actions.editInterviewAnswer(cmd.mapsTo)
      else openUnanswered(cmd.mapsTo)
      actions.addMessage('user', text)
      actions.addMessage('assistant', `Opening ${cmd.label}.`)
      setCompose('')
      setPendingVoice(null)
      return
    }
    if (cmd.type === 'show_unanswered') {
      const stats = sectionStats(taxProfile, section)
      const next = stats.items.find((q) => q.status === 'unanswered')
      if (next) openUnanswered(next.mapsTo)
      actions.addMessage('user', text)
      actions.addMessage(
        'assistant',
        next ? `Next unanswered in this section: ${next.prompt}` : 'Nothing unanswered in this section right now.',
      )
      setCompose('')
      setPendingVoice(null)
      return
    }
    if (cmd.type === 'continue') {
      actions.setPrepStep(Math.max(prepStep, 2))
      const next = resolveInterviewTurn(taxProfile, null)
      if (next) openUnanswered(next.mapsTo)
      setCompose('')
      setPendingVoice(null)
      return
    }
    actions.askAi(text)
    actions.setPrepStep(Math.max(prepStep, 2))
    setCompose('')
    setPendingVoice(null)
  }

  function onSelectSection(id: QuestionnaireSectionId) {
    setSection(id)
    if (id === 'review') {
      if (prepStep < 3) actions.setPrepStep(Math.max(prepStep, 2))
      return
    }
    if (id !== 'personal') actions.setPrepStep(Math.max(prepStep, 2))
    const stats = sectionStats(taxProfile, id)
    const next = stats.items.find((q) => q.status === 'unanswered') ?? stats.items[0]
    if (next) {
      if (next.status === 'answered') actions.editInterviewAnswer(next.mapsTo)
      else openUnanswered(next.mapsTo)
    }
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Unified tax questionnaire · TY{activeTaxYear}</p>
          <h1>Prepare your return</h1>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => actions.resetDemo()}>
          Reset demo
        </button>
      </header>

      <p className="muted prepare-lead">
        Speak, type, or upload into the same questionnaire. Tabs show what’s complete (green counts) and what still
        needs answering — jump anytime without choosing an input mode.
      </p>

      <QuestionnaireTabs profile={taxProfile} active={section} onSelect={onSelectSection} />

      <div className="stepper" aria-label="Preparation steps">
        {STEPS.map((s, i) => (
          <span key={s} className={`step-pill ${activeStep === i ? 'active' : activeStep > i ? 'done' : ''}`}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {showUpload && (
        <section className="rise">
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <div className="list-panel panel">
              <h2>Required for this workflow</h2>
              {DOCUMENT_REQUESTS.filter((r) => r.tier === 'required').map((r) => (
                <div className="row-item" key={r.id}>
                  <div>
                    <strong>{r.label}</strong>
                    <span className="row-meta">{r.detail}</span>
                  </div>
                  <span className={`badge ${docsAlreadySatisfied(documents, r) ? 'badge-ok' : 'badge-warn'}`}>
                    {docsAlreadySatisfied(documents, r) ? 'Received' : 'Needed'}
                  </span>
                </div>
              ))}
            </div>
            <div className="list-panel panel">
              <h2>Recommended (you may continue without these)</h2>
              {DOCUMENT_REQUESTS.filter((r) => r.tier === 'recommended').map((r) => (
                <div className="row-item" key={r.id}>
                  <div>
                    <strong>{r.label}</strong>
                    <span className="row-meta">{r.detail}</span>
                  </div>
                  <span className={`badge ${docsAlreadySatisfied(documents, r) ? 'badge-ok' : 'badge-neutral'}`}>
                    {docsAlreadySatisfied(documents, r) ? 'Received' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
          </div>

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
            <span className="badge">Start with documents</span>
            <h2>Drop ID, SSN docs, W-2s, 1099s, and family records</h2>
            <p>
              Tip for this demo: name files like <code>ID_First_Last.pdf</code>, <code>license_Mary_Johnson.pdf</code>,{' '}
              <code>ssn_Emma_Blake.pdf</code> so multiple people are extracted for relationship questions.
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
                Tax IDs are masked. Confirm uncertain fields — do not re-enter accurate extracted values.
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
                  Looks good — identify who is filing
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => inputRef.current?.click()}>
                  Add more documents
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {showIdentify && (
        <section className="list-panel panel rise">
          <h2>Which person is filing this tax return?</h2>
          <p className="muted">Select the primary taxpayer. Correct the name if extraction missed it.</p>
          {householdIntake.candidates.map((p) => (
            <div className="row-item" key={p.id}>
              <div>
                <strong>{p.fullLegalName}</strong>
                <span className="row-meta">
                  {p.dateOfBirth ? `DOB ${p.dateOfBirth} · ` : ''}
                  {p.tinLast4 ? `TIN ***-**-${p.tinLast4} · ` : ''}
                  from {p.sourceLabels.slice(0, 2).join(', ')} · confidence {Math.round(p.confidence * 100)}%
                </span>
              </div>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() =>
                  actions.setPrimaryTaxpayer(
                    p.id,
                    nameEdit && householdIntake.candidates[0]?.id === p.id ? nameEdit : undefined,
                  )
                }
              >
                This is the filer
              </button>
            </div>
          ))}
          <div className="field" style={{ marginTop: '0.75rem' }}>
            <label htmlFor="nameFix">Correct selected name (optional)</label>
            <input id="nameFix" value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} placeholder="Full legal name" />
          </div>
        </section>
      )}

      {showRelationships && (
        <section className="list-panel panel rise">
          <h2>Confirm family relationships</h2>
          <p className="muted">
            Relationships are never assumed from gender, name, age, or documents alone.
          </p>
          {qualifyPrompt && !relPrompt ? (
            <div>
              <p>
                <strong>{qualifyPrompt.prompt}</strong>
              </p>
              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => actions.confirmMayQualifyDependent(qualifyPrompt.person.id, true)}
                >
                  Yes
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => actions.confirmMayQualifyDependent(qualifyPrompt.person.id, false)}
                >
                  No
                </button>
              </div>
            </div>
          ) : relPrompt ? (
            <div>
              <p>
                <strong>{relPrompt.prompt}</strong>
              </p>
              <div className="known-box">
                {RELATIONSHIP_CHOICES.map((c) => (
                  <button
                    key={c.value}
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => actions.confirmPersonRelationship(relPrompt.person.id, c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" type="button" onClick={() => actions.answerMissingHousehold('no')}>
              Continue — discover anyone missing
            </button>
          )}
          <div style={{ marginTop: '1rem' }}>
            {householdIntake.candidates
              .filter((c) => c.id !== householdIntake.primaryPersonId)
              .map((c) => (
                <div className="row-item" key={c.id}>
                  <div>
                    <strong>{c.fullLegalName}</strong>
                    <span className="row-meta">
                      {c.relationToPrimary ? c.relationToPrimary.replace(/_/g, ' ') : 'Awaiting confirmation'}
                      {c.mayQualifyDependent === true ? ' · may be dependent' : ''}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {showMissing && (
        <section className="list-panel panel rise">
          <h2>Anyone else to claim?</h2>
          <p>
            <strong>
              Is there anyone else you may be able to claim on your tax return who was not included in these documents?
            </strong>
          </p>
          <p className="muted">We never assume uploaded documents represent the complete household.</p>
          {householdIntake.missingHouseholdAnswer === null && (
            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={() => actions.answerMissingHousehold('yes')}>
                Yes
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => actions.answerMissingHousehold('no')}>
                No
              </button>
            </div>
          )}
          {householdIntake.missingHouseholdAnswer === 'yes' && (
            <>
              <form onSubmit={addMissing} style={{ marginTop: '1rem' }}>
                <div className="field">
                  <label htmlFor="missName">Full legal name</label>
                  <input id="missName" required value={missingName} onChange={(e) => setMissingName(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="missDob">Date of birth (YYYY-MM-DD)</label>
                  <input id="missDob" value={missingDob} onChange={(e) => setMissingDob(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="missRel">Relationship</label>
                  <select
                    id="missRel"
                    value={missingRel}
                    onChange={(e) => setMissingRel(e.target.value as HouseholdRelationChoice)}
                  >
                    {RELATIONSHIP_CHOICES.filter((c) => c.value !== 'not_on_return').map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-primary" type="submit">
                  Add person
                </button>
              </form>
              <button
                className="btn btn-secondary"
                type="button"
                style={{ marginTop: '0.75rem' }}
                onClick={() => actions.finishHouseholdDiscovery()}
              >
                Done adding — continue to tax questions
              </button>
            </>
          )}
          {householdIntake.filingRecommendation && (
            <p className="muted" style={{ marginTop: '1rem' }}>
              Filing status recommendation: <strong>{householdIntake.filingRecommendation.recommended.toUpperCase()}</strong>{' '}
              — {householdIntake.filingRecommendation.rationale}
            </p>
          )}
        </section>
      )}

      {showInterview && prepStep < 3 && section !== 'review' && (
        <section className="smart-interview rise">
          <div className="interview-layout">
            <div className="list-panel panel interview-chat">
              <h2>Tax questions &amp; maximize savings</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Green means answered. Orange means unanswered. Each answer can apply a credit or deduction to your live
                refund — see All possible tax savings on the right. Speak, type, or upload into the same return.
              </p>
              <QuestionProgressBar profile={taxProfile} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} />
                  Allow NOVARA to speak questions (optional)
                </label>
                <NovaraSpeak text={activeTurn?.prompt ?? ''} enabled={voiceOut} />
              </div>
              <div className="chat-log" role="log" aria-live="polite">
                {interviewChat.slice(-12).map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.role}`}>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>

              {activeTurn ? (
                <div className="active-turn" id="prepare-active-answer">
                  <p className="turn-label">
                    {activeTurn.phase === 'filing_status'
                      ? 'Filing status · current question'
                      : activeTurn.phase === 'dependents'
                        ? 'Dependent verification · current question'
                        : 'Tax benefit discovery · current question'}
                  </p>
                  <InterviewChoice
                    key={activeTurn.id}
                    questionId={activeTurn.id}
                    mapsTo={activeTurn.mapsTo}
                    prompt={activeTurn.prompt}
                    kind={activeTurn.kind}
                    choices={activeTurn.choices}
                    saving={saving}
                    secondaryLabel={activeTurn.phase === 'dependents' ? undefined : 'Skip / unresolved'}
                    onSecondary={activeTurn.phase === 'dependents' ? undefined : () => void skipTurn()}
                    onConfirm={(value) => confirmTurn(value)}
                  />
                </div>
              ) : (
                <div className="answer-row">
                  <Link className="btn btn-secondary" to="/app/taxpayer/documents">
                    Review missing documents
                  </Link>
                  <button className="btn btn-primary" type="button" onClick={() => actions.completeSmartInterview()}>
                    Calculate my result
                  </button>
                </div>
              )}

              <div className="field" style={{ marginTop: '0.85rem' }}>
                <label htmlFor="prepareCompose">Speak or type an answer / command</label>
                <input
                  id="prepareCompose"
                  value={pendingVoice ?? compose}
                  onChange={(e) => {
                    setPendingVoice(null)
                    setCompose(e.target.value)
                  }}
                  placeholder='e.g. “I paid $4,800 for childcare” or “Show unanswered”'
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginTop: '0.45rem' }}>
                <VoiceInput
                  onTranscript={(text) => {
                    setPendingVoice(text)
                    setCompose(text)
                  }}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!(pendingVoice ?? compose).trim()}
                  onClick={() => handleCompose(pendingVoice ?? compose)}
                >
                  {pendingVoice ? 'Confirm spoken message' : 'Send'}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => inputRef.current?.click()}>
                  Upload documents
                </button>
              </div>

              <QuestionOverview
                profile={taxProfile}
                focusMapsTo={activeTurn?.mapsTo}
                onSelectUnanswered={(q) => openUnanswered(q.mapsTo)}
                onEditAnswered={(mapsTo) => {
                  actions.editInterviewAnswer(mapsTo)
                  requestAnimationFrame(() => {
                    document.querySelector('.active-turn')?.scrollIntoView({ behavior: 'auto', block: 'center' })
                  })
                }}
              />

              <AnswerHistory items={interviewAnswers} onEdit={(mapsTo) => actions.editInterviewAnswer(mapsTo)} />
            </div>

            <div className="side-stack">
              <RefundMaximizer
                report={benefitReport}
                profile={taxProfile}
                preparePath="/app/taxpayer/prepare"
                onOpenMapsTo={(mapsTo) => {
                  actions.focusInterviewQuestion(mapsTo)
                  requestAnimationFrame(() => {
                    document.querySelector('.active-turn')?.scrollIntoView({ behavior: 'auto', block: 'center' })
                  })
                }}
              />
              <RefundTracker report={benefitReport} />
              <AppliedBenefitBanner events={benefitReport?.lastApplications} returnPath="/app/taxpayer/prepare" />
              <SavingsOpportunityPanel
                report={benefitReport}
                preparePath="/app/taxpayer/prepare"
                onOpenMapsTo={(mapsTo) => {
                  actions.focusInterviewQuestion(mapsTo)
                  requestAnimationFrame(() => {
                    document.querySelector('.active-turn')?.scrollIntoView({ behavior: 'auto', block: 'center' })
                  })
                }}
              />
              <section className="list-panel panel">
                <h2>Outstanding documents</h2>
                {outstanding.length === 0 && checklist.filter((c) => c.status === 'needed').length === 0 && (
                  <p className="muted">No outstanding required documents from the current interview.</p>
                )}
                {outstanding.map((r) => (
                  <div className="row-item" key={r.id}>
                    <div>
                      <strong>{r.label}</strong>
                      <span className="row-meta">{r.tier}</span>
                    </div>
                  </div>
                ))}
                {checklist
                  .filter((c) => c.status === 'needed')
                  .slice(0, 6)
                  .map((c) => (
                    <div className="row-item" key={c.id}>
                      <div>
                        <strong>{c.name}</strong>
                        <span className="row-meta">{c.reason}</span>
                      </div>
                    </div>
                  ))}
              </section>
              <section className="list-panel panel">
                <h2>Household</h2>
                <div className="row-item">
                  <div>
                    <strong>Filing status</strong>
                  </div>
                  <strong>{taxProfile.filingStatus}</strong>
                </div>
                <div className="row-item">
                  <div>
                    <strong>Dependents</strong>
                  </div>
                  <strong>{taxProfile.dependents.length}</strong>
                </div>
                <div className="row-item">
                  <div>
                    <strong>Wages (from docs)</strong>
                  </div>
                  <strong>{formatMoney(taxProfile.wages)}</strong>
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
              {formatMoney(benefitReport?.potentialSavings ?? 0)}.
            </p>
            {prepStep === 3 && (
              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <Link className="btn btn-primary" to="/app/taxpayer/final-review">
                  Continue to checklist, return &amp; signatures
                </Link>
                <Link className="btn btn-secondary" to="/app/taxpayer/documents">
                  Documents still needed
                </Link>
              </div>
            )}
          </div>
          {prepStep === 4 && (
            <div className="list-panel panel">
              <h2>Verify → Authorize filing</h2>
              <p className="muted">
                Open the final review to view/print the calculated return, complete the document checklist, accept
                separate disclosures, sign the locked version, then authorize e-file.
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
              <Link className="btn btn-primary" to="/app/taxpayer/final-review" style={{ marginTop: '0.75rem' }}>
                Open final review &amp; sign
              </Link>
            </div>
          )}
        </section>
      )}

      {prepStep >= 5 && (
        <section className="result-hero panel rise">
          <span className="badge badge-ok">E-file transmitted</span>
          <h2 style={{ marginBottom: 0 }}>Return submitted — documents remain in your vault</h2>
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
