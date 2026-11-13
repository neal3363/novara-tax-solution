import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import {
  PRIOR_YEAR_SURCHARGE,
  formatMoney,
  roleToTier,
  type YearReturnKind,
} from '../../data/fees'
import { availableTaxYears, buildTaxYearCatalog, resolveFilingSeason } from '../../engine/taxYearCatalog'
import '../shared.css'

type DraftYear = {
  taxYear: number
  selected: boolean
  filingMode: 'original' | 'amended'
  kind: YearReturnKind
  hasIrsNotice: boolean
}

export function YearSelect() {
  const { currentUser, accountTier } = useAppStore()
  const navigate = useNavigate()
  const season = resolveFilingSeason()
  const available = availableTaxYears(season)
  const catalog = buildTaxYearCatalog(season)
  const tier = accountTier ?? roleToTier(currentUser?.role ?? 'taxpayer') ?? 'TC'

  const [drafts, setDrafts] = useState<DraftYear[]>(() =>
    available.map((y) => ({
      taxYear: y.taxYear,
      selected: y.taxYear === season.currentTaxYear,
      filingMode: 'original',
      kind: 'personal',
      hasIrsNotice: false,
    })),
  )
  const [error, setError] = useState<string | null>(null)

  const selected = drafts.filter((d) => d.selected)
  const quote = useMemo(
    () =>
      actions.multiYearQuote(
        selected.map((s) => ({
          taxYear: s.taxYear,
          kind: s.kind,
          filingMode: s.filingMode,
        })),
      ),
    [selected, tier],
  )

  function toggle(year: number) {
    setDrafts((d) => d.map((x) => (x.taxYear === year ? { ...x, selected: !x.selected } : x)))
  }

  function update(year: number, patch: Partial<DraftYear>) {
    setDrafts((d) => d.map((x) => (x.taxYear === year ? { ...x, ...patch } : x)))
  }

  function checkout() {
    setError(null)
    if (!selected.length) {
      setError('Select at least one available tax year.')
      return
    }
    const result = actions.createMultiYearOrder(
      selected.map((s) => ({
        taxYear: s.taxYear,
        filingMode: s.filingMode,
        kind: s.kind,
        hasIrsNotice: s.hasIrsNotice,
      })),
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/app/taxpayer/years')
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {season.seasonYear} filing season · regular price year {season.currentTaxYear}
          </p>
          <h1>Select tax year(s)</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/taxpayer">
          Back
        </Link>
      </header>

      <p className="muted">
        Each selected year gets its own return record and document folder. Prior years add a{' '}
        {formatMoney(PRIOR_YEAR_SURCHARGE)} NOVARA surcharge once per year (not per personal/business). Unsupported
        years stay unavailable until their calculation engines are validated.
      </p>

      <section className="list-panel panel rise">
        <h2>Available years (production engines)</h2>
        {drafts.map((d) => {
          const def = available.find((y) => y.taxYear === d.taxYear)!
          const prior = d.taxYear < season.currentTaxYear
          return (
            <div key={d.taxYear} className="row-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={d.selected} onChange={() => toggle(d.taxYear)} />
                  <strong>
                    Tax year {d.taxYear}
                    {prior ? ` · prior (+${formatMoney(PRIOR_YEAR_SURCHARGE)})` : ' · current season'}
                  </strong>
                </label>
                {d.selected && (
                  <div style={{ marginTop: '0.65rem', display: 'grid', gap: '0.45rem' }}>
                    <label>
                      Filing type{' '}
                      <select
                        value={d.filingMode}
                        onChange={(e) =>
                          update(d.taxYear, { filingMode: e.target.value as 'original' | 'amended' })
                        }
                      >
                        <option value="original">Filing for the first time (original)</option>
                        <option value="amended">Amending an existing return</option>
                      </select>
                    </label>
                    <label>
                      Return kind{' '}
                      <select
                        value={d.kind}
                        onChange={(e) => update(d.taxYear, { kind: e.target.value as YearReturnKind })}
                      >
                        <option value="personal">Personal</option>
                        <option value="business">Business</option>
                        <option value="both">Personal and business</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={d.hasIrsNotice}
                        onChange={(e) => update(d.taxYear, { hasIrsNotice: e.target.checked })}
                      />
                      Received IRS notice(s) for this year
                    </label>
                    <span className="row-meta">
                      Forms {def.formsVersion} · e-file original {def.supportsEfileOriginal ? 'yes' : 'no'} ·
                      amended e-file {def.supportsEfileAmended ? 'yes' : 'no'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </section>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Not available yet</h2>
        {catalog
          .filter((y) => y.status !== 'production')
          .slice(0, 8)
          .map((y) => (
            <div className="row-item" key={y.taxYear}>
              <div>
                <strong>{y.taxYear}</strong>
                <span className="row-meta">{y.unavailableReason}</span>
              </div>
              <span className="badge">Unavailable</span>
            </div>
          ))}
      </section>

      <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
        <h2>Fee breakdown before checkout ({tier})</h2>
        {quote.lines.length === 0 && <p className="muted">Select years to see pricing.</p>}
        {quote.lines.map((l) => (
          <div className="row-item" key={l.id}>
            <div>
              <strong>{l.label}</strong>
            </div>
            <strong>{formatMoney(l.amount)}</strong>
          </div>
        ))}
        <div className="row-item">
          <div>
            <strong>Base preparation fees</strong>
          </div>
          <strong>{formatMoney(quote.basePreparationTotal)}</strong>
        </div>
        <div className="row-item">
          <div>
            <strong>Prior-year surcharge ({quote.priorYearCount} × {formatMoney(PRIOR_YEAR_SURCHARGE)})</strong>
          </div>
          <strong>{formatMoney(quote.priorYearSurchargeTotal)}</strong>
        </div>
        <div className="row-item">
          <div>
            <strong>NOVARA preparation total</strong>
            <span className="row-meta">Enrollment/subscription stays separate</span>
          </div>
          <strong>{formatMoney(quote.preparationGrandTotal)}</strong>
        </div>
        {error && (
          <p className="callout warn" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" type="button" style={{ marginTop: '0.75rem' }} onClick={checkout}>
          Create year engagements &amp; continue
        </button>
      </section>
    </div>
  )
}
