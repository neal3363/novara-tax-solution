import { Link } from 'react-router-dom'
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { buildDocumentChecklist, documentsStillNeeded } from '../../engine/documentChecklist'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import '../benefits/Benefits.css'

function statusBadge(status: string) {
  if (status === 'verified' || status === 'uploaded') return 'badge-ok'
  if (status === 'under_review' || status === 'needed') return 'badge-warn'
  return 'badge-neutral'
}

export function DocumentsNeeded() {
  const { taxProfile, documents, currentUser } = useAppStore()
  const checklist = buildDocumentChecklist(taxProfile, documents)
  const needed = documentsStillNeeded(checklist)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const vaultPath = currentUser?.role === 'preparer' ? '/app/preparer/clients' : '/app/taxpayer/vault'
  const savingsPath = currentUser?.role === 'preparer' ? '/app/preparer/benefits' : '/app/taxpayer/benefits'

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) actions.uploadFiles(e.dataTransfer.files)
  }

  const byBenefit = new Map<string, typeof checklist>()
  checklist.forEach((item) => {
    const key = item.benefitName
    const list = byBenefit.get(key) ?? []
    list.push(item)
    byBenefit.set(key, list)
  })

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Personalized document checklist</p>
          <h1>Documents still needed</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to={savingsPath}>
            Savings
          </Link>
          <Link className="btn btn-primary" to={vaultPath}>
            Open Vault
          </Link>
        </div>
      </header>

      <p className="muted" style={{ maxWidth: '42rem' }}>
        NOVARA only lists documents relevant to your return. Items already uploaded and matched are marked received. Optional
        receipts can wait — they don’t block an initial calculation.
      </p>

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
        style={{ margin: '1rem 0' }}
      >
        <span className="badge">{needed.length} still needed</span>
        <h2>Upload supporting documents</h2>
        <p>Files are saved to your Vault, matched to this checklist, and used to reevaluate benefits.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
          onChange={(e) => e.target.files && actions.uploadFiles(e.target.files)}
        />
      </div>

      {checklist.length === 0 ? (
        <section className="list-panel panel">
          <p className="muted">No document requirements yet — continue the Savings interview first.</p>
        </section>
      ) : (
        Array.from(byBenefit.entries()).map(([benefit, items]) => (
          <section className="list-panel panel" key={benefit} style={{ marginBottom: '1rem' }}>
            <h2>{benefit}</h2>
            {items.map((item) => (
              <div className="row-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span className="row-meta">{item.reason}</span>
                  {item.alternative && <span className="row-meta">Alternative: {item.alternative}</span>}
                  <span className="row-meta">
                    {item.requiredForFiling ? 'Needed for filing substantiation' : 'Recommended support'}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '0.35rem', justifyItems: 'end' }}>
                  <span className={`badge ${statusBadge(item.status)}`}>{item.status.replace(/_/g, ' ')}</span>
                  {(item.status === 'needed' || item.status === 'under_review') && (
                    <button className="btn btn-secondary" type="button" onClick={() => inputRef.current?.click()}>
                      Upload
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  )
}
