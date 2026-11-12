import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { formatMoney } from '../../data/fees'
import { resolveFilingSeason } from '../../engine/taxYearCatalog'
import '../shared.css'

export function MultiYearDashboard() {
  const { multiYearEngagements, returns, documents, currentUser } = useAppStore()
  const season = resolveFilingSeason()
  const mine = returns.filter((r) => r.clientId === currentUser?.id)
  const engagements =
    multiYearEngagements.length > 0
      ? multiYearEngagements
      : Array.from(new Set(mine.map((r) => r.taxYear))).map((taxYear) => {
          const yearReturns = mine.filter((r) => r.taxYear === taxYear)
          return {
            id: `legacy-${taxYear}`,
            taxYear,
            filingMode: yearReturns[0]?.filingMode ?? ('original' as const),
            kind: yearReturns.some((r) => r.isBusiness) && yearReturns.some((r) => !r.isBusiness)
              ? ('both' as const)
              : yearReturns[0]?.isBusiness
                ? ('business' as const)
                : ('personal' as const),
            hasIrsNotice: yearReturns.some((r) => r.hasIrsNotice),
            returnIds: yearReturns.map((r) => r.id),
            documentFolderId: yearReturns[0]?.documentFolderId ?? `folder-${taxYear}`,
            status: 'in_progress' as const,
          }
        })

  const invoiceLines = mine.flatMap((r) =>
    r.feeSnapshot.map((f) => ({ ...f, taxYear: r.taxYear, returnId: r.id })),
  )
  // Deduplicate prior-year surcharge lines that might appear once per return in display
  const seenSurcharge = new Set<string>()
  const invoiceUnique = invoiceLines.filter((l) => {
    if (/prior-year surcharge/i.test(l.label)) {
      const key = `${l.taxYear}-${l.label}`
      if (seenSurcharge.has(key)) return false
      seenSurcharge.add(key)
    }
    return true
  })
  const invoiceTotal = invoiceUnique.reduce((s, l) => s + l.amount, 0)

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Multi-year dashboard · season {season.seasonYear} · current TY {season.currentTaxYear}
          </p>
          <h1>Your tax years</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/app/taxpayer/years/select">
            Add years
          </Link>
          <Link className="btn btn-primary" to="/app/taxpayer/prepare">
            Prepare active year
          </Link>
        </div>
      </header>

      <p className="muted">
        Each year shows its own refund/balance and IRS penalty estimates. The combined invoice below does not combine
        tax liabilities or refunds across years.
      </p>

      <section className="list-panel panel rise">
        {engagements.length === 0 && (
          <p className="muted">
            No years selected yet. <Link to="/app/taxpayer/years/select">Select tax years</Link> to begin.
          </p>
        )}
        {engagements.map((eng) => {
          const yearReturns = mine.filter((r) => eng.returnIds.includes(r.id) || r.taxYear === eng.taxYear)
          const refund = yearReturns.reduce((s, r) => s + r.refundOrOwe, 0)
          const fees = yearReturns.reduce((s, r) => s + r.feeSnapshot.reduce((a, f) => a + f.amount, 0), 0)
          // Avoid double-counting surcharge if both personal+business carry it in snapshot — prefer engagement view
          const penalty = yearReturns[0]?.irsPenaltyInterestEstimate ?? 0
          const missing = documents.filter((d) => d.taxYear === eng.taxYear && d.status === 'needs_review').length
          const docsForYear = documents.filter((d) => d.taxYear === eng.taxYear).length
          return (
            <div className="row-item" key={eng.id} style={{ alignItems: 'flex-start' }}>
              <div>
                <strong>
                  {eng.taxYear} · {eng.filingMode} · {eng.kind}
                </strong>
                <span className="row-meta">
                  Status: {yearReturns[0]?.state ?? eng.status}
                  {eng.hasIrsNotice ? ' · IRS notice on file' : ''}
                  {' · '}
                  Folder {eng.documentFolderId}
                </span>
                <span className="row-meta">
                  Est. refund/balance {formatMoney(refund)} · Est. IRS penalties/interest {formatMoney(penalty)}{' '}
                  (estimate only) · Docs {docsForYear}
                  {missing ? ` · ${missing} need review` : ''}
                </span>
                <span className="row-meta">
                  Filing: {yearReturns[0]?.filingMethod ?? '—'}
                  {yearReturns[0]?.refundClaimWarning ? ` · ${yearReturns[0].refundClaimWarning}` : ''}
                </span>
                <span className="row-meta">NOVARA fees on this year (see invoice): {formatMoney(fees)}</span>
              </div>
              <Link
                className="btn btn-secondary"
                to="/app/taxpayer/prepare"
                onClick={() => actions.setActiveTaxYear(eng.taxYear)}
              >
                Prepare {eng.taxYear}
              </Link>
            </div>
          )
        })}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Combined NOVARA invoice</h2>
        <p className="muted">Service fees only — not IRS tax, penalties, or interest.</p>
        {invoiceUnique.map((l, i) => (
          <div className="row-item" key={`${l.returnId}-${l.label}-${i}`}>
            <div>
              <strong>
                TY{l.taxYear}: {l.label}
              </strong>
            </div>
            <strong>{formatMoney(l.amount)}</strong>
          </div>
        ))}
        <div className="row-item">
          <div>
            <strong>Invoice total</strong>
          </div>
          <strong>{formatMoney(invoiceTotal)}</strong>
        </div>
      </section>
    </div>
  )
}
