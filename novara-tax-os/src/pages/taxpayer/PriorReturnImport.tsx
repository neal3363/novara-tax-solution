import { useState, type FormEvent } from 'react'
import { actions, useAppStore } from '../../store/useAppStore'
import { parsePriorReturnExport, type ImportedReturnDraft } from '../../engine/priorReturnImport'
import { formatMoney } from '../../data/fees'
import '../shared.css'

export function PriorReturnImport() {
  const { currentUser } = useAppStore()
  const [draft, setDraft] = useState<ImportedReturnDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function onFile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setConfirmed(false)
    const input = (e.currentTarget.elements.namedItem('file') as HTMLInputElement) ?? null
    const file = input?.files?.[0]
    if (!file) return
    let text: string | undefined
    if (file.name.toLowerCase().endsWith('.json')) text = await file.text()
    const result = parsePriorReturnExport({
      fileName: file.name,
      textContent: text,
      fallbackTaxpayerName: currentUser?.name ?? 'Taxpayer',
    })
    if (!result.ok) {
      setError(result.error)
      setDraft(null)
      return
    }
    setDraft(result.draft)
  }

  function applyDraft() {
    if (!draft) return
    actions.applyPriorReturnImport(draft)
    setConfirmed(true)
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Prior-return import · sandbox</p>
          <h1>Import from other tax software</h1>
        </div>
      </header>
      <p className="muted">
        Supports generic JSON exports and labeled PDF sandbox mapping for TurboTax, H&R Block, TaxAct, Drake,
        ProSeries, and Lacerte. Proprietary formats need authorized integrations. Confirm before applying — prior-year
        status and dependents are never reused blindly.
      </p>

      <form className="panel" onSubmit={onFile}>
        <div className="field">
          <label htmlFor="file">Export file (PDF or JSON)</label>
          <input id="file" name="file" type="file" accept=".pdf,.json,.txt" required />
        </div>
        <button className="btn btn-primary" type="submit">
          Parse for review
        </button>
      </form>

      {error && <p className="callout warn">{error}</p>}

      {draft && (
        <section className="list-panel panel rise" style={{ marginTop: '1rem' }}>
          <h2>Confirm import — {draft.vendor} · TY{draft.taxYear}</h2>
          <p className="muted">Confidence {Math.round(draft.confidence * 100)}%. Uncertain fields must be verified.</p>
          <div className="row-item">
            <div>
              <strong>Taxpayer</strong>
            </div>
            <span>{draft.taxpayerName}</span>
          </div>
          {draft.spouseName && (
            <div className="row-item">
              <div>
                <strong>Spouse (flagged)</strong>
              </div>
              <span>{draft.spouseName}</span>
            </div>
          )}
          <div className="row-item">
            <div>
              <strong>Filing status (do not auto-apply)</strong>
            </div>
            <span>{draft.filingStatus ?? '—'}</span>
          </div>
          <div className="row-item">
            <div>
              <strong>Dependents listed</strong>
            </div>
            <span>{draft.dependentNames.join(', ') || '—'}</span>
          </div>
          <div className="row-item">
            <div>
              <strong>Wages / withholding</strong>
            </div>
            <span>
              {draft.wages != null ? formatMoney(draft.wages) : '—'} /{' '}
              {draft.withholding != null ? formatMoney(draft.withholding) : '—'}
            </span>
          </div>
          <h3>Warnings</h3>
          {draft.warnings.map((w) => (
            <p key={w} className="muted">
              {w}
            </p>
          ))}
          <p className="muted">Uncertain: {draft.uncertainFields.join('; ')}</p>
          <button className="btn btn-primary" type="button" onClick={applyDraft} disabled={confirmed}>
            {confirmed ? 'Applied as draft facts' : 'Apply selected facts to working return'}
          </button>
        </section>
      )}
    </div>
  )
}
