import { useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { AppliedBenefitBanner } from '../../components/benefits/AppliedBenefitBanner'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import { AnswerHistory, InterviewChoice } from '../../components/interview/InterviewChoice'
import { QuestionOverview, QuestionProgressBar } from '../../components/interview/QuestionProgress'
import {
  extractConfirmedFields,
  knownFactsSummary,
} from '../../engine/smartInterview'
import { nextInterviewTurn } from '../../engine/questionProgress'
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
import '../shared.css'
import './Prepare.css'

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
  } = useAppStore()
  const mine = returns.find((r) => r.clientId === currentUser?.id && r.taxYear === 2025)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameEdit, setNameEdit] = useState('')
  const [missingName, setMissingName] = useState('')
  const [missingDob, setMissingDob] = useState('')
  const [missingRel, setMissingRel] = useState<HouseholdRelationChoice>('son')
  const fields = useMemo(() => extractConfirmedFields(documents), [documents])
  const known = useMemo(() => knownFactsSummary(documents, taxProfile), [documents, taxProfile])
  const activeStep = stepIndex(householdIntake.phase, prepStep)
  const outstanding = outstandingDocumentRequests(documents, householdIntake)
  const checklist = useMemo(() => buildDocumentChecklist(taxProfile, documents), [taxProfile, documents])

  const activeTurn = nextInterviewTurn(taxProfile)
  const relPrompt = nextRelationshipPrompt(householdIntake)
  const qualifyPrompt = nextDependentQualifyPrompt(householdIntake)

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

  const showUpload = prepStep <= 1 && (householdIntake.phase === 'upload' || householdIntake.phase === 'extract_review')
  const showIdentify = householdIntake.phase === 'identify_primary'
  const showRelationships = householdIntake.phase === 'confirm_relationships'
  const showMissing = householdIntake.phase === 'discover_missing'
  const showInterview = prepStep === 2 || householdIntake.phase === 'interview'

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Document-first tax preparation</p>
          <h1>Upload → identify → apply benefits</h1>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => actions.resetDemo()}>
          Reset demo
        </button>
      </header>

      <p className="muted prepare-lead">
        NOVARA reads your documents, identifies people listed, asks who each person is, builds your household, then
        calculates the maximum legally allowable refund. You confirm — you don’t retype reliable extracted data.
      </p>

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
              Tip for this demo: name files like <code>ID_Jordan_Blake.pdf</code>, <code>license_Mary_Johnson.pdf</code>,{' '}
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

      {showInterview && prepStep >= 2 && prepStep < 3 && (
        <section className="smart-interview rise">
          <div className="interview-layout">
            <div className="list-panel panel interview-chat">
              <h2>Tax questions &amp; benefits</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Green means answered. Orange means unanswered. Continue opens the next unanswered question — never
                restarts completed ones.
              </p>
              <QuestionProgressBar profile={taxProfile} />
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
                      ? 'Filing status · next unanswered'
                      : activeTurn.phase === 'dependents'
                        ? 'Dependent verification · next unanswered'
                        : 'Tax benefit discovery · next unanswered'}
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

              <QuestionOverview
                profile={taxProfile}
                focusMapsTo={activeTurn?.mapsTo}
                onSelectUnanswered={(q) => {
                  actions.focusInterviewQuestion(q.mapsTo)
                  // Scroll active turn into view
                  document.querySelector('.active-turn')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }}
                onEditAnswered={(mapsTo) => actions.editInterviewAnswer(mapsTo)}
              />

              <AnswerHistory items={interviewAnswers} onEdit={(mapsTo) => actions.editInterviewAnswer(mapsTo)} />
            </div>

            <div className="side-stack">
              <RefundTracker report={benefitReport} />
              <AppliedBenefitBanner events={benefitReport?.lastApplications} returnPath="/app/taxpayer/prepare" />
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
                <button className="btn btn-primary" type="button" onClick={() => actions.setPrepStep(4)}>
                  Continue to review &amp; sign
                </button>
                <Link className="btn btn-secondary" to="/app/taxpayer/documents">
                  Documents still needed
                </Link>
              </div>
            )}
          </div>
          {prepStep === 4 && (
            <div className="list-panel panel">
              <h2>Verify → Authorize filing</h2>
              <p className="muted">Review household, benefits, and fees before e-sign.</p>
              {(mine?.feeSnapshot ?? []).map((f) => (
                <div className="row-item" key={f.label}>
                  <div>
                    <strong>{f.label}</strong>
                    <span className="row-meta">{f.status}</span>
                  </div>
                  <strong>{formatMoney(f.amount)}</strong>
                </div>
              ))}
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
