import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveTaxRulePack,
  buildTaxLawUpdateDashboard,
  rulesForTaxYear,
  type TaxRulePack,
} from '../../engine/taxLawUpdateManager'
import { useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../../components/filing/FilingPanels.css'

export function TaxLawUpdatesPage() {
  const { currentUser, activeTaxYear } = useAppStore()
  const [packs, setPacks] = useState<TaxRulePack[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const dash = useMemo(() => buildTaxLawUpdateDashboard(), [])
  const viewPacks = packs ?? dash.packs
  const yearPack = rulesForTaxYear(activeTaxYear, viewPacks)

  function approve(id: string) {
    const pack = viewPacks.find((p) => p.id === id)
    if (!pack) return
    const result = approveTaxRulePack(pack, currentUser?.name ?? 'admin')
    if (!result.ok) {
      setMsg(result.error ?? 'Approval failed')
      return
    }
    setPacks(viewPacks.map((p) => (p.id === id ? result.pack : p)))
    setMsg(`Pack ${id} marked approved — catalog activation still requires controlled review.`)
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tax year controls</p>
          <h1>Tax-law update management</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/admin">
          Admin home
        </Link>
      </header>

      <p className="muted" style={{ maxWidth: '44rem' }}>
        {dash.summary}
      </p>

      <section className="filing-panel">
        <h2>Selected year rules</h2>
        <p>
          Active return year <strong>{activeTaxYear}</strong> →{' '}
          {yearPack
            ? `${yearPack.id} (${yearPack.status}) · forms ${yearPack.formsVersion}`
            : 'No pack found — do not calculate until a year pack exists.'}
        </p>
        <p className="muted">Benefit engine ruleset pin: {dash.activeBenefitRuleVersion}</p>
      </section>

      <section className="filing-panel">
        <h2>Year catalog</h2>
        <ul className="readiness-list">
          {dash.catalog.slice(0, 8).map((y) => (
            <li
              key={y.taxYear}
              className={`readiness-item status-${y.status === 'production' ? 'complete' : 'attention'}`}
            >
              <strong>
                TY{y.taxYear} · {y.status}
              </strong>
              <span>
                {y.formsVersion} / {y.bracketsVersion} / {y.creditsVersion}
                {y.unavailableReason ? ` — ${y.unavailableReason}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="filing-panel">
        <h2>Rule packs</h2>
        <ul className="readiness-list">
          {viewPacks.map((p) => (
            <li key={p.id} className={`readiness-item status-${p.status === 'active' || p.status === 'approved' ? 'complete' : 'attention'}`}>
              <strong>
                {p.id} · {p.status} · effective {p.effectiveDate}
              </strong>
              <span>
                {p.standardDeductionNote} Regression: {p.regressionPassed ? 'passed' : 'pending'}. {p.historyNote}
              </span>
              {p.status === 'draft' && p.regressionPassed && (
                <button className="btn btn-secondary" type="button" onClick={() => approve(p.id)}>
                  Admin approve
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="filing-panel">
        <h2>Controls</h2>
        <ul>
          {dash.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      {msg && <p className="callout">{msg}</p>}
    </div>
  )
}
