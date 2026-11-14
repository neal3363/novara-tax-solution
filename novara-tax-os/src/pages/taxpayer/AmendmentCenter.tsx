import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { buildCorrectionCenterReport } from '../../engine/returnCorrectionCenter'
import { formatMoney } from '../../data/fees'
import { useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../../components/filing/FilingPanels.css'

export function AmendmentCenterPage() {
  const {
    currentUser,
    returns,
    activeReturnId,
    activeTaxYear,
    benefitReport,
    refundDelivery,
    bankProductApplication,
    filingAuth,
  } = useAppStore()

  const mine =
    returns.find((r) => r.id === activeReturnId) ??
    returns.find((r) => r.clientId === currentUser?.id && r.taxYear === activeTaxYear)

  const report = useMemo(
    () =>
      buildCorrectionCenterReport({
        taxReturn: mine,
        verifiedRefund: benefitReport?.projectedRefund ?? mine?.refundOrOwe ?? 0,
        delivery: refundDelivery,
        bankApp: bankProductApplication,
        lockedVersion: filingAuth?.lockedVersion
          ? {
              versionId: filingAuth.lockedVersion.versionId,
              contentHash: filingAuth.lockedVersion.contentHash,
              lockedAt: filingAuth.lockedVersion.lockedAt,
              projectedRefund: filingAuth.lockedVersion.projectedRefund,
            }
          : null,
        isBusiness: Boolean(benefitReport?.findings.some((f) => f.category === 'business')),
      }),
    [mine, benefitReport, refundDelivery, bankProductApplication, filingAuth],
  )

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Corrections</p>
          <h1>Return correction &amp; amendment center</h1>
        </div>
        <div className="benefit-actions">
          <Link className="btn btn-secondary" to="/app/taxpayer/prepare">
            Correct in interview
          </Link>
          <Link className="btn btn-primary" to="/app/taxpayer/final-review">
            Re-authorize &amp; file
          </Link>
        </div>
      </header>

      <p className="muted" style={{ maxWidth: '44rem' }}>
        {report.preserveOriginalNote}
      </p>

      <section className="filing-panel">
        <h2>Status</h2>
        <p role="status">{report.aiExplanation}</p>
        {report.rejectionReason && (
          <p>
            Rejection: <strong>{report.rejectionReason}</strong>
          </p>
        )}
        {!report.canEnterCorrection && (
          <p className="muted">No active rejection or amendment — workspace stays available for prior-year tracking.</p>
        )}
      </section>

      {report.rejectionCodes.length > 0 && (
        <section className="filing-panel">
          <h2>IRS rejection codes</h2>
          <ul className="readiness-list">
            {report.rejectionCodes.map((c) => (
              <li key={c.code} className="readiness-item status-attention">
                <strong>
                  {c.code} — {c.title}
                </strong>
                <span>
                  {c.explanation} Fix: {c.typicalFix}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.amendment && (
        <section className="filing-panel">
          <h2>Original vs amended</h2>
          <p className="muted">
            Form {report.amendment.amendedForm} · filing {report.amendment.filingMethod} · net tax Δ{' '}
            {formatMoney(report.amendment.netTaxDifference)}
          </p>
          <p>{report.amendment.filingMethodNote}</p>
        </section>
      )}

      <section className="filing-panel">
        <h2>Version history</h2>
        <ul className="tracking-events">
          {report.versions.length === 0 && <li className="muted">No locked versions yet.</li>}
          {report.versions.map((v) => (
            <li key={v.versionId}>
              <span className="src">{v.preserved ? 'preserved' : 'draft'}</span>
              <strong>{v.label}</strong>
              <div className="muted">
                {v.at} · hash {v.contentHash} · {formatMoney(v.projectedRefund)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="filing-panel">
        <h2>Change log</h2>
        <ul>
          {report.changeLog.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {report.reauthorizationRequired && (
          <p className="callout">Taxpayer reauthorization required before resubmitting a corrected return.</p>
        )}
      </section>
    </div>
  )
}
