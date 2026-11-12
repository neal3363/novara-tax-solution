import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { AiPanel } from '../../components/AiPanel'
import { formatMoney } from '../../data/fees'
import type { ReturnType } from '../../data/types'
import '../shared.css'
import './Workspace.css'

export function Workspace() {
  const { returns, documents, entryPlan, preEntryNotes, binderTab, activeReturnId } = useAppStore()
  const active = returns.find((r) => r.id === activeReturnId) ?? returns.find((r) => r.state === 'Preparer Review') ?? returns[0]
  const [bizName, setBizName] = useState('')
  const [bizType, setBizType] = useState<ReturnType>('1120-S')
  const [selectedFact, setSelectedFact] = useState<string | null>(null)

  function createBiz(e: FormEvent) {
    e.preventDefault()
    if (!bizName.trim()) return
    actions.createBusinessReturn(bizName.trim(), bizType)
    setBizName('')
  }

  const selectedLine = entryPlan.find((l) => l.id === selectedFact) ?? entryPlan[0]
  const sourceDoc = documents.find((d) => d.id === selectedLine?.sourceDocId)

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Client binder</p>
          <h1>{active?.clientName ?? 'Workspace'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/app/preparer/entry-plan">
            Open entry plan
          </Link>
          {active && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => actions.advanceReturn(active.id, 'Client Review')}
            >
              Send to client review
            </button>
          )}
        </div>
      </header>

      <div className="binder-tabs">
        {([
          ['docs', 'Docs'],
          ['forms', 'Forms'],
          ['notes', 'Notes'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`step-pill ${binderTab === id ? 'active' : ''}`}
            onClick={() => actions.setBinderTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="binder-grid rise">
        <section className="list-panel panel">
          {binderTab === 'docs' && (
            <>
              <h2>Files</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Source documents — classified by type and tax year.
              </p>
              {documents.map((d) => (
                <div className="row-item" key={d.id}>
                  <div>
                    <strong>{d.name}</strong>
                    <span className="row-meta">
                      {d.type} · TY{d.taxYear} · {Math.round(d.confidence * 100) || 0}%
                    </span>
                  </div>
                  <span className={`badge ${d.status === 'needs_review' ? 'badge-warn' : 'badge-ok'}`}>{d.status}</span>
                </div>
              ))}
            </>
          )}

          {binderTab === 'forms' && (
            <>
              <h2>Extracted forms / fields</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Click a line to see source provenance (Filed-style).
              </p>
              {entryPlan.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  className={`binder-fact ${selectedLine?.id === line.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFact(line.id)}
                >
                  <strong>{line.field}</strong>
                  <span>
                    {line.status === 'corrected' ? line.correctedValue : line.proposedValue} · {line.sourceDocName}
                  </span>
                </button>
              ))}
            </>
          )}

          {binderTab === 'notes' && (
            <>
              <h2>Observations</h2>
              {preEntryNotes.map((n) => (
                <div className="row-item" key={n.id}>
                  <div>
                    <strong>{n.title}</strong>
                    <span className="row-meta">{n.detail}</span>
                  </div>
                  <span className={`badge ${n.severity === 'high' || n.severity === 'critical' ? 'badge-danger' : 'badge-warn'}`}>
                    {n.severity}
                  </span>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="list-panel panel source-panel">
          <h2>Source behind the figure</h2>
          {selectedLine ? (
            <>
              <div className="row-item">
                <div>
                  <strong>{selectedLine.proposedValue}</strong>
                  <span className="row-meta">
                    {selectedLine.field} ← {selectedLine.sourceBox}
                  </span>
                </div>
              </div>
              <div className="source-card">
                <p className="eyebrow">{sourceDoc?.type ?? selectedLine.form}</p>
                <h3>{selectedLine.sourceDocName}</h3>
                <p>
                  Page {selectedLine.sourcePage} · {selectedLine.sourceBox}
                </p>
                <p className="muted">
                  Confidence {Math.round(selectedLine.confidence * 100)}%. If a figure doesn’t tie, it stays flagged
                  beside the source until a preparer resolves it.
                </p>
              </div>
              {active && (
                <div className="row-item">
                  <div>
                    <strong>Fee lock</strong>
                    <span className="row-meta">Immutable snapshot on engagement</span>
                  </div>
                  <strong>{active.feeSnapshot.map((f) => formatMoney(f.amount)).join(', ')}</strong>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Select a form field to inspect provenance.</p>
          )}
        </section>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <AiPanel compact />
        <section className="list-panel panel">
          <h2>Create business return</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Charges exactly {formatMoney(239.98)} ($89.99 + $149.99 business AI). Never collect the base twice.
          </p>
          <form onSubmit={createBiz} style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="field">
              <label htmlFor="biz">Client / entity name</label>
              <input id="biz" value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Harbor Craft LLC" />
            </div>
            <div className="field">
              <label htmlFor="type">Return type</label>
              <select id="type" value={bizType} onChange={(e) => setBizType(e.target.value as ReturnType)}>
                <option value="1065">1065 Partnership</option>
                <option value="1120-S">1120-S S Corporation</option>
                <option value="1120">1120 C Corporation</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">
              Create with business AI surcharge
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
