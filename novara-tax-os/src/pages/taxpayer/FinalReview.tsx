import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { buildFinalDocumentChecklist, checklistToPrintableText } from '../../engine/finalChecklist'
import {
  buildWorkingReturnPacket,
  returnPacketToPrintableHtml,
  returnPacketToSimplePdf,
} from '../../engine/returnPacket'
import {
  IRS_PERJURY_DECLARATION,
  NOVARA_ACCURACY_ACK,
  FORM_8879_VERSION,
  signatureLockStatus,
  type ConsentKind,
} from '../../engine/filingAuthorizations'
import { runPreFilingQa } from '../../engine/qaEngine'
import { buildTaxPreparationCompletionScore } from '../../engine/taxReadiness'
import { buildPreSignFeeBreakdown } from '../../engine/feeLedger'
import { TaxReadinessScore } from '../../components/filing/TaxReadinessScore'
import { FeeBreakdownPanel } from '../../components/filing/FeeBreakdownPanel'
import { RefundDeliveryPanel } from '../../components/filing/RefundDeliveryPanel'
import { RefundMaximizer } from '../../components/benefits/RefundMaximizer'
import { FinalReturnReviewPanel } from '../../components/filing/FinalReturnReviewPanel'
import { BalanceDuePanel } from '../../components/filing/BalanceDuePanel'
import { runFinalReturnReview } from '../../engine/finalReturnReview'
import { buildBalanceDueGuidance } from '../../engine/balanceDuePayments'
import { buildInterviewProgress } from '../../engine/questionProgress'
import '../shared.css'
import './FinalReview.css'

function downloadBlob(filename: string, data: BlobPart, type: string) {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function FinalReview() {
  const {
    currentUser,
    taxProfile,
    benefitReport,
    documents,
    returns,
    activeTaxYear,
    activeReturnId,
    benefitReviewSigned,
    filingAuthorized,
    filingAuth,
    lastQaReport,
    refundDelivery,
  } = useAppStore()
  const uploadRef = useRef<HTMLInputElement>(null)
  const [typedSig, setTypedSig] = useState('')
  const [spouseSig, setSpouseSig] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [showReturn, setShowReturn] = useState(false)

  const mine =
    returns.find((r) => r.id === activeReturnId) ??
    returns.find((r) => r.clientId === currentUser?.id && r.taxYear === activeTaxYear)
  const spouseRequired = taxProfile.filingStatus === 'mfj'
  const checklist = useMemo(
    () => buildFinalDocumentChecklist(taxProfile, documents),
    [taxProfile, documents],
  )
  const packet = useMemo(
    () =>
      buildWorkingReturnPacket({
        profile: taxProfile,
        benefitReport,
        clientName: currentUser?.name ?? mine?.clientName ?? 'Taxpayer',
        locked: Boolean(filingAuth?.lockedVersion),
        lockedVersionId: filingAuth?.lockedVersion?.versionId,
        lockedHash: filingAuth?.lockedVersion?.contentHash,
        filingMode: mine?.filingMode ?? 'original',
        isDraft: !filingAuth?.lockedVersion,
      }),
    [taxProfile, benefitReport, currentUser, mine, filingAuth],
  )
  const progress = useMemo(() => buildInterviewProgress(taxProfile), [taxProfile])
  const readinessScore = useMemo(
    () =>
      buildTaxPreparationCompletionScore({
        profile: taxProfile,
        benefitReport,
        documents,
        refundDelivery,
        filingAuth,
        filingAuthorized,
        clientName: currentUser?.name,
        taxReturn: mine,
      }),
    [taxProfile, benefitReport, documents, refundDelivery, filingAuth, filingAuthorized, currentUser, mine],
  )
  const feeBreakdown = useMemo(
    () =>
      buildPreSignFeeBreakdown({
        accountType: currentUser?.accountType,
        taxReturn: mine,
        taxYear: activeTaxYear,
      }),
    [currentUser, mine, activeTaxYear],
  )
  const finalReview = useMemo(
    () =>
      runFinalReturnReview({
        profile: taxProfile,
        benefitReport,
        documents,
        refundDelivery,
        filingAuth,
        filingAuthorized,
        taxReturn: mine,
        clientName: currentUser?.name,
      }),
    [taxProfile, benefitReport, documents, refundDelivery, filingAuth, filingAuthorized, mine, currentUser],
  )
  const balanceGuidance = useMemo(
    () =>
      buildBalanceDueGuidance({
        refundOrBalance: benefitReport?.projectedRefund ?? mine?.refundOrOwe ?? 0,
        taxYear: activeTaxYear,
        filingState: String(taxProfile.answers.filing_state || ''),
      }),
    [benefitReport, mine, activeTaxYear, taxProfile],
  )
  const auth = filingAuth
  const lockCheck = auth ? signatureLockStatus(auth, packet.contentHash) : { valid: false, reason: 'Not initialized' }
  const qa =
    lastQaReport ??
    runPreFilingQa({
      profile: taxProfile,
      documents,
      taxReturn: mine,
      benefitReviewSigned,
      authorizedToFile: filingAuthorized && lockCheck.valid,
    })

  function ensureAuth() {
    actions.ensureFilingAuth({ spouseRequired })
  }

  function toggleConsent(kind: ConsentKind, checked: boolean) {
    ensureAuth()
    if (checked) actions.acceptFilingConsent(kind, currentUser?.name ?? 'Taxpayer')
    else actions.revokeFilingConsent(kind)
  }

  function lockAndSignPrimary(e: FormEvent) {
    e.preventDefault()
    ensureAuth()
    if (!typedSig.trim()) {
      setMsg('Type your full legal name to sign.')
      return
    }
    if (typedSig.trim().toLowerCase() !== (currentUser?.name ?? '').trim().toLowerCase()) {
      setMsg('Typed signature should match the taxpayer name on file for this sandbox demo.')
      return
    }
    const result = actions.lockAndSignReturn({
      role: 'primary',
      typedName: typedSig.trim(),
      packet,
    })
    setMsg(result.ok ? 'Primary signature recorded and return version locked.' : result.error)
  }

  function signSpouse(e: FormEvent) {
    e.preventDefault()
    ensureAuth()
    if (!spouseSig.trim()) {
      setMsg('Spouse typed name required.')
      return
    }
    const result = actions.lockAndSignReturn({
      role: 'spouse',
      typedName: spouseSig.trim(),
      packet,
    })
    setMsg(result.ok ? 'Spouse signature recorded.' : result.error)
  }

  function downloadChecklist() {
    const text = checklistToPrintableText(checklist, currentUser?.name ?? 'Taxpayer')
    downloadBlob(`novara-checklist-ty${taxProfile.taxYear}.txt`, text, 'text/plain')
  }

  function downloadReturnPdf() {
    const pdf = returnPacketToSimplePdf(packet)
    downloadBlob(`novara-return-ty${taxProfile.taxYear}.pdf`, pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, 'application/pdf')
  }

  function printReturn() {
    const html = returnPacketToPrintableHtml(packet)
    const w = window.open('', '_blank')
    if (!w) {
      setMsg('Pop-up blocked — allow pop-ups to print, or use Download PDF.')
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  function downloadPacket() {
    const checklistText = checklistToPrintableText(checklist, currentUser?.name ?? 'Taxpayer')
    const html = returnPacketToPrintableHtml(packet)
    const consents =
      auth?.consents
        .filter((c) => c.accepted)
        .map((c) => `${c.label} · ${c.signerName} · ${c.acceptedAt} · v${c.version}`)
        .join('\n') ?? 'None accepted'
    const sigs =
      auth?.signatures
        .map((s) => `${s.role}: ${s.typedName} at ${s.signedAt} · version ${s.returnVersionId}`)
        .join('\n') ?? 'None'
    const bundle = [
      'NOVARA FINAL TAX PREPARATION PACKET (sandbox)',
      `Taxpayer: ${currentUser?.name}`,
      `Tax year: ${taxProfile.taxYear}`,
      ``,
      '=== CALCULATION SUMMARY ===',
      `Projected refund/balance: ${packet.summary.projectedRefund}`,
      `Version: ${packet.versionId}`,
      `Hash: ${packet.contentHash}`,
      ``,
      '=== DOCUMENT CHECKLIST ===',
      checklistText,
      ``,
      '=== SIGNATURES ===',
      sigs,
      ``,
      '=== DISCLOSURES ACCEPTED ===',
      consents,
      ``,
      '=== RETURN HTML (also use Print / PDF tools) ===',
      '(Open Download PDF or Print Tax Return for form layout.)',
      ``,
      'Identity documents and Social Security cards are NOT included in this general packet.',
    ].join('\n')
    downloadBlob(`novara-final-packet-ty${taxProfile.taxYear}.txt`, bundle, 'text/plain')
    downloadBlob(`novara-return-ty${taxProfile.taxYear}.html`, html, 'text/html')
  }

  function submitFiling() {
    ensureAuth()
    const result = actions.finalizeAndFile()
    setMsg(result.ok ? result.message : result.error)
  }

  return (
    <div className="page container final-review">
      <header className="page-header">
        <div>
          <p className="eyebrow">Final preparation · TY{activeTaxYear}</p>
          <h1>Review, checklist, sign &amp; authorize</h1>
          <p className="muted">
            Answers already update your working return. Complete documents, review the calculated return, accept
            separate disclosures, sign the locked version, then authorize e-file.
          </p>
        </div>
        <Link className="btn btn-secondary" to="/app/taxpayer/assistant">
          Back to questions
        </Link>
      </header>

      <div className="stat-row rise">
        <div className="stat panel">
          <p className="label">Questions</p>
          <p className="value" style={{ fontSize: '1.1rem' }}>
            {progress.answeredCount}/{progress.applicableTotal}
          </p>
        </div>
        <div className="stat panel">
          <p className="label">Refund / balance</p>
          <p className="value" style={{ fontSize: '1.1rem' }}>
            {formatMoney(packet.summary.projectedRefund)}
          </p>
        </div>
        <div className="stat panel">
          <p className="label">Return version</p>
          <p className="value" style={{ fontSize: '0.95rem' }}>
            {packet.locked ? 'Locked' : 'Draft'}
          </p>
        </div>
        <div className="stat panel">
          <p className="label">QA</p>
          <p className="value" style={{ fontSize: '0.95rem' }}>
            {qa.canFile && lockCheck.valid ? 'Clear' : 'Blocked'}
          </p>
        </div>
      </div>

      <TaxReadinessScore score={readinessScore} />
      <RefundMaximizer report={benefitReport} profile={taxProfile} preparePath="/app/taxpayer/prepare" />
      <FeeBreakdownPanel breakdown={feeBreakdown} />
      <RefundDeliveryPanel
        verifiedRefund={benefitReport?.projectedRefund ?? mine?.refundOrOwe ?? 0}
        existing={refundDelivery}
        officeTenantId={currentUser?.tenantId}
      />
      <BalanceDuePanel guidance={balanceGuidance} />
      <FinalReturnReviewPanel report={finalReview} />

      {/* 1. Document checklist */}
      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <div className="final-section-head">
          <h2>1. Final document checklist</h2>
          <div className="final-actions">
            <button className="btn btn-secondary" type="button" onClick={() => uploadRef.current?.click()}>
              Upload outstanding
            </button>
            <button className="btn btn-secondary" type="button" onClick={downloadChecklist}>
              Download checklist
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                downloadChecklist()
                window.print()
              }}
            >
              Print checklist
            </button>
          </div>
        </div>
        <input
          ref={uploadRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => e.target.files && actions.uploadFiles(e.target.files)}
        />
        <p className="muted">{checklist.summary}</p>
        {checklist.items.map((item) => (
          <div className={`row-item final-doc final-doc-${item.visual}`} key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <span className="row-meta">
                {item.benefitName ? `${item.benefitName} · ` : ''}
                {item.reason}
                {item.requiredForFiling ? ' · Required before filing' : item.category === 'recommended' ? ' · Recommended' : ''}
              </span>
            </div>
            <span className={`badge final-badge-${item.visual}`}>
              {item.visual === 'green' ? '✓ ' : item.visual === 'orange' ? '● ' : '— '}
              {item.statusLabel}
            </span>
          </div>
        ))}
      </section>

      {/* 2. Working return */}
      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <div className="final-section-head">
          <h2>2. Working tax return</h2>
          <div className="final-actions">
            <button className="btn btn-secondary" type="button" onClick={() => setShowReturn((v) => !v)}>
              {showReturn ? 'Hide return' : 'View tax return'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={downloadReturnPdf}>
              Download PDF
            </button>
            <button className="btn btn-secondary" type="button" onClick={printReturn}>
              Print tax return
            </button>
          </div>
        </div>
        {packet.draftWatermark && <p className="callout warn">{packet.draftWatermark}</p>}
        <div className="row-item">
          <div>
            <strong>Projected refund / balance due</strong>
            <span className="row-meta">
              Version {packet.versionId} · {packet.schedules.join(', ')}
            </span>
          </div>
          <strong>{formatMoney(packet.summary.projectedRefund)}</strong>
        </div>
        {showReturn && (
          <div className="return-preview">
            <table className="data">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Line</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {packet.formLines.map((l, i) => (
                  <tr key={`${l.form}-${l.field}-${i}`}>
                    <td>{l.form}</td>
                    <td>{l.field}</td>
                    <td>{l.description}</td>
                    <td>{formatMoney(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">
              Built from your verified answers and the deterministic calculation engine — not a sample return.
            </p>
          </div>
        )}
      </section>

      {/* 3. Disclosures — never prechecked */}
      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <h2>3. Disclosures &amp; agreements</h2>
        <p className="muted">
          Each item is a separate legal action. None are pre-checked. Preparer legal duties are not eliminated by these
          acknowledgments.
        </p>
        <button className="btn btn-secondary" type="button" onClick={ensureAuth} style={{ marginBottom: '0.75rem' }}>
          Load disclosure set
        </button>
        {auth?.consents.map((c) => (
          <label className="final-consent" key={c.kind}>
            <input
              type="checkbox"
              checked={c.accepted}
              onChange={(e) => toggleConsent(c.kind, e.target.checked)}
            />
            <span>
              <strong>{c.label}</strong>
              <span className="row-meta">Version {c.version}</span>
            </span>
          </label>
        ))}
        <div className="declaration-box">
          <h3>IRS declaration</h3>
          <p>{IRS_PERJURY_DECLARATION}</p>
          <h3>NOVARA acknowledgment</h3>
          <p>{NOVARA_ACCURACY_ACK}</p>
          <h3>E-file authorization</h3>
          <p>
            {FORM_8879_VERSION}: By accepting the e-file authorization consent and signing, you authorize electronic
            filing of the locked return version through an authorized provider (sandbox until connected).
          </p>
        </div>
      </section>

      {/* 4. Signatures */}
      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <h2>4. Electronic signatures</h2>
        <p className="muted">
          Typing your name records a sandbox electronic signature with timestamp and return version. Drawing on screen
          alone does not satisfy every IRS signature requirement — provider-specific procedures apply in production.
        </p>
        {auth?.lockedVersion && auth.lockedVersion.contentHash !== packet.contentHash && (
          <p className="callout warn">
            Return data changed after lock. Prior signatures were cleared. Review the updated return and sign again.
          </p>
        )}
        <form className="final-sign-form" onSubmit={lockAndSignPrimary}>
          <div className="field">
            <label htmlFor="sig">Primary taxpayer — type full legal name</label>
            <input id="sig" value={typedSig} onChange={(e) => setTypedSig(e.target.value)} autoComplete="name" />
          </div>
          <button className="btn btn-primary" type="submit">
            Sign &amp; lock this return version
          </button>
        </form>
        {spouseRequired && (
          <form className="final-sign-form" onSubmit={signSpouse}>
            <div className="field">
              <label htmlFor="spouse">Spouse signature — type full legal name</label>
              <input id="spouse" value={spouseSig} onChange={(e) => setSpouseSig(e.target.value)} />
            </div>
            <button className="btn btn-secondary" type="submit">
              Capture spouse signature
            </button>
          </form>
        )}
        {(auth?.signatures.length ?? 0) > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            {auth!.signatures.map((s) => (
              <div className="row-item" key={s.role}>
                <div>
                  <strong>
                    {s.role} · {s.typedName}
                  </strong>
                  <span className="row-meta">
                    {s.signedAt} · version {s.returnVersionId}
                  </span>
                </div>
                <span className="badge badge-ok">Signed</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. QA + submit */}
      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <h2>5. Quality assurance &amp; submit</h2>
        <p>
          <strong>{qa.summary}</strong>
        </p>
        <p className={lockCheck.valid ? 'muted' : undefined}>
          Signature / authorization gate: {lockCheck.valid ? 'Ready' : lockCheck.reason}
        </p>
        {qa.findings
          .filter((f) => f.severity === 'critical')
          .slice(0, 8)
          .map((f) => (
            <div className="row-item" key={f.id}>
              <div>
                <strong>{f.title}</strong>
                <span className="row-meta">
                  {f.explanation} → {f.action}
                </span>
              </div>
              <span className="badge badge-warn">critical</span>
            </div>
          ))}
        <div className="final-actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-secondary" type="button" onClick={() => actions.runQaCheck()}>
            Re-run QA
          </button>
          <button className="btn btn-secondary" type="button" onClick={downloadPacket}>
            Download final packet
          </button>
          <button className="btn btn-primary" type="button" onClick={submitFiling}>
            Authorize &amp; submit (sandbox e-file)
          </button>
        </div>
        {!finalReview.canEfile && (
          <p className="muted">{finalReview.summary}</p>
        )}
        {!refundDelivery && benefitReport && (benefitReport.projectedRefund ?? 0) > 0 && (
          <p className="muted">Refund delivery method not selected — required before e-file.</p>
        )}
        {!benefitReviewSigned && (
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Tip: complete{' '}
            <Link to="/app/taxpayer/benefits/review">benefit review</Link> if QA still requires it.
          </p>
        )}
      </section>

      {msg && (
        <p className="callout" style={{ marginTop: '1rem' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
