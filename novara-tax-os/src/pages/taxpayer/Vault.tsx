import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'

const FILTERS = [
  'all',
  'W-2',
  '1099-NEC',
  '1099-INT',
  '1098',
  '1098-T',
  '1098-E',
  'Childcare',
  'Property Tax',
  'ID',
  'Other',
]

export function Vault() {
  const { documents, vaultFilter, currentUser, uploadIssues } = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [linkNote, setLinkNote] = useState<string | null>(null)

  // Store already tenant-scopes documents; taxpayers only see their vault.
  const filtered = documents.filter((d) => vaultFilter === 'all' || d.type === vaultFilter)
  const byCategory = filtered.reduce<Record<string, typeof filtered>>((acc, d) => {
    const cat = d.vaultCategory ?? 'other'
    ;(acc[cat] ??= []).push(d)
    return acc
  }, {})

  function openAuthorized(docId: string) {
    const token = actions.requestDocumentLink(docId)
    if (!token) {
      setLinkNote('Access denied — this file is outside your tenant vault.')
      return
    }
    setLinkNote(`Authorized link issued (expires ${new Date(token.expiresAt).toLocaleTimeString()}). Path is tenant-scoped.`)
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
          <p className="eyebrow">Secure Cloud Tax Vault · tenant {currentUser?.tenantId ?? '—'}</p>
          <h1>Your documents</h1>
        </div>
        <Link className="btn btn-secondary" to="/app/taxpayer/benefits">
          Back to Savings
        </Link>
      </header>

      {linkNote && (
        <p className="muted" style={{ marginBottom: '1rem' }}>
          {linkNote}
        </p>
      )}

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
        style={{ marginBottom: '1rem' }}
      >
        <span className="badge">Upload &amp; done</span>
        <h2>Add W-2s, 1099s, 1098s, tuition, childcare, and more</h2>
        <p>
          NOVARA classifies each file, extracts tax fields, and updates your refund estimate. You only confirm — you
          don’t retype accurate extracted values.
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
        <section className="list-panel panel" style={{ marginBottom: '1rem' }}>
          <h2>Duplicates &amp; conflicts</h2>
          {uploadIssues.slice(0, 6).map((issue) => (
            <div className="row-item" key={`${issue.title}-${issue.kind}`}>
              <div>
                <strong>{issue.title}</strong>
                <span className="row-meta">{issue.detail}</span>
              </div>
              <span className={`badge ${issue.severity === 'high' ? 'badge-warn' : 'badge-neutral'}`}>{issue.kind}</span>
            </div>
          ))}
        </section>
      )}

      <div className="stepper" style={{ marginBottom: '1rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`step-pill ${vaultFilter === f ? 'active' : ''}`}
            onClick={() => actions.setVaultFilter(f)}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <section className="list-panel panel rise">
        <h2>
          {filtered.length} file{filtered.length === 1 ? '' : 's'} · audit-ready vault · TY2025 · tenant{' '}
          {currentUser?.tenantId ?? '—'}
        </h2>
        {filtered.length === 0 && <p className="muted">No documents in this filter yet.</p>}
        {Object.entries(byCategory).map(([cat, docs]) => (
          <div key={cat} style={{ marginBottom: '0.85rem' }}>
            <p className="eyebrow">{cat.replace(/_/g, ' ')}</p>
            {docs.map((d) => (
              <div className="row-item" key={d.id}>
                <div>
                  <strong>{d.name}</strong>
                  <span className="row-meta">
                    {d.type} · {d.sizeLabel} · {new Date(d.uploadedAt).toLocaleString()}
                    {d.storagePath ? ` · ${d.storagePath}` : ''}
                  </span>
                  {d.facts.slice(0, 2).map((f) => (
                    <span className="row-meta" key={f.id}>
                      {f.label}: {f.value}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button className="btn btn-secondary" type="button" onClick={() => openAuthorized(d.id)}>
                    Authorized link
                  </button>
                  <span className={`badge ${d.status === 'needs_review' ? 'badge-warn' : 'badge-ok'}`}>{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
