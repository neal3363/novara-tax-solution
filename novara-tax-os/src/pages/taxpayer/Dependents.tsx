import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnswerHistory, InterviewChoice } from '../../components/interview/InterviewChoice'
import { RefundTracker } from '../../components/benefits/RefundTracker'
import {
  buildDependentDocumentChecklist,
  displayTin,
  getDiscoveryState,
  nextDependentQuestion,
} from '../../engine/dependentsEngine'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../benefits/Benefits.css'

export function Dependents() {
  const { taxProfile, benefitReport, interviewAnswers, documents, currentUser } = useAppStore()
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const active = nextDependentQuestion(taxProfile.answers, taxProfile.dependents)
  const discovery = getDiscoveryState(taxProfile.answers, taxProfile.dependents)
  const vaultHasId = documents.some((d) => d.type === 'ID' && (d.status === 'extracted' || d.status === 'verified'))
  const vaultHasChildcare = documents.some((d) => d.type === 'Childcare')
  const depDocs = buildDependentDocumentChecklist(
    taxProfile.dependents,
    taxProfile.answers,
    taxProfile.childcarePaid > 0,
    vaultHasId,
    false,
    false,
    vaultHasChildcare,
  )

  const history = interviewAnswers.filter(
    (a) =>
      a.mapsTo === 'potential_dependents' ||
      a.mapsTo === 'dependent_count' ||
      a.mapsTo.startsWith('dep_'),
  )

  const depsPath = currentUser?.role === 'preparer' ? '/app/preparer/return' : '/app/taxpayer/prepare'
  const docsPath = currentUser?.role === 'preparer' ? '/app/preparer/documents' : '/app/taxpayer/documents'
  const savingsPath = currentUser?.role === 'preparer' ? '/app/preparer/benefits' : '/app/taxpayer/benefits'

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
      actions.answerDependentQuestion(active.mapsTo, normalized, active.prompt)
      await new Promise((r) => setTimeout(r, 120))
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
          <p className="eyebrow">Mandatory dependent verification</p>
          <h1>Dependents</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to={depsPath}>
            Prepare
          </Link>
          <Link className="btn btn-secondary" to={savingsPath}>
            Savings
          </Link>
        </div>
      </header>

      <p className="muted" style={{ maxWidth: '42rem' }}>
        NOVARA asks how many potential dependents you have, then collects facts for each person. We never assume a
        dependent count from documents or refund estimates. Full Social Security numbers are never shown on this screen.
      </p>

      <RefundTracker report={benefitReport} />

      {benefitReport?.refundIncomplete && (
        <section className="list-panel panel" style={{ marginTop: '1rem', borderColor: 'var(--warn, #b45309)' }}>
          <strong>{benefitReport.refundIncompleteReason}</strong>
          <p className="muted" style={{ marginBottom: 0 }}>
            Complete the dependent interview below. Only then will Child Tax Credit, EITC, childcare credit, and related
            amounts affect a verified refund projection.
          </p>
        </section>
      )}

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Discovery status</h2>
        <div className="row-item">
          <div>
            <strong>Potential dependents asked</strong>
            <span className="row-meta">{discovery.askedPotential ? 'Yes' : 'Not yet'}</span>
          </div>
          <span className={`badge ${discovery.askedPotential ? 'badge-ok' : 'badge-warn'}`}>
            {discovery.hasPotentialDependents === false
              ? 'None'
              : discovery.hasPotentialDependents
                ? 'Yes'
                : 'Open'}
          </span>
        </div>
        <div className="row-item">
          <div>
            <strong>Declared count</strong>
            <span className="row-meta">
              {discovery.countAnswered ? String(discovery.declaredCount ?? 0) : 'Not answered'}
            </span>
          </div>
        </div>
        <div className="row-item">
          <div>
            <strong>Per-dependent interview</strong>
            <span className="row-meta">
              {discovery.interviewComplete ? 'Complete' : 'In progress — each person must be reviewed'}
            </span>
          </div>
          <span className={`badge ${discovery.interviewComplete ? 'badge-ok' : 'badge-warn'}`}>
            {discovery.interviewComplete ? 'Ready' : 'Incomplete'}
          </span>
        </div>
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        {active ? (
          <>
            <p className="turn-label" style={{ marginTop: 0 }}>
              Dependent interview
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
        ) : (
          <p className="muted">
            {discovery.interviewComplete
              ? 'Dependent information is complete. Benefits have been reevaluated against each person’s eligibility.'
              : 'No open dependent questions.'}
          </p>
        )}
        <AnswerHistory
          items={history}
          onEdit={(mapsTo) => actions.editInterviewAnswer(mapsTo)}
        />
      </section>

      {taxProfile.dependents.length > 0 && (
        <section className="list-panel panel" style={{ marginTop: '1rem' }}>
          <h2>Dependents on this return</h2>
          {taxProfile.dependents.map((d) => (
            <div className="row-item" key={d.id}>
              <div>
                <strong>{d.fullLegalName || d.id}</strong>
                <span className="row-meta">
                  Age {d.age >= 0 ? d.age : '—'} · {d.relationship || 'relationship TBD'} · TIN {displayTin(d)} ·{' '}
                  {d.monthsLivedWith ?? '—'} months
                </span>
                <span className="row-meta">
                  {[
                    d.ctcEligible ? 'CTC' : null,
                    d.odcEligible ? 'ODC' : null,
                    d.eitcQualifyingChild ? 'EITC child' : null,
                    d.cdccQualifyingPerson ? 'CDCC' : null,
                    d.hohQualifyingPerson ? 'HOH QP' : null,
                    !d.interviewComplete ? 'Interview incomplete' : null,
                    d.anotherMayClaim ? 'Another may claim' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Eligibility pending interview'}
                </span>
              </div>
              <span className={`badge ${d.interviewComplete ? 'badge-ok' : 'badge-warn'}`}>
                {d.interviewComplete ? 'Reviewed' : 'Needs info'}
              </span>
            </div>
          ))}
        </section>
      )}

      <section
        className={`dropzone ${drag ? 'drag' : ''}`}
        style={{ marginTop: '1rem' }}
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
        <span className="badge">Secure upload</span>
        <h2>Dependent identification documents</h2>
        <p>
          Upload Social Security cards, ITIN letters, birth certificates, or residency records when needed. Full SSNs are
          not displayed after upload — only verification status.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
          onChange={(e) => e.target.files && actions.uploadFiles(e.target.files)}
        />
      </section>

      {depDocs.length > 0 && (
        <section className="list-panel panel" style={{ marginTop: '1rem' }}>
          <h2>Dependent documents still needed</h2>
          {depDocs.map((item) => (
            <div className="row-item" key={item.id}>
              <div>
                <strong>
                  {item.dependentName}: {item.name}
                </strong>
                <span className="row-meta">{item.reason}</span>
                {item.alternative && <span className="row-meta">Alternative: {item.alternative}</span>}
                <span className="row-meta">
                  {item.requiredForFiling ? 'Required for filing / due diligence' : 'Recommended for audit protection'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge ${item.status === 'needed' ? 'badge-warn' : 'badge-ok'}`}>{item.status}</span>
                <Link className="btn btn-ghost" to={docsPath}>
                  Upload
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
