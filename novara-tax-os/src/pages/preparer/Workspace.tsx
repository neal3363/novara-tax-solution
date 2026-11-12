import { useState } from 'react'
import type { FormEvent } from 'react'
import { actions, useAppStore } from '../../store/useAppStore'
import { AiPanel } from '../../components/AiPanel'
import { formatMoney } from '../../data/fees'
import type { ReturnType } from '../../data/types'
import '../shared.css'

export function Workspace() {
  const { returns, documents } = useAppStore()
  const active = returns.find((r) => r.state === 'Preparer Review') ?? returns[0]
  const [bizName, setBizName] = useState('')
  const [bizType, setBizType] = useState<ReturnType>('1120-S')

  function createBiz(e: FormEvent) {
    e.preventDefault()
    if (!bizName.trim()) return
    actions.createBusinessReturn(bizName.trim(), bizType)
    setBizName('')
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Return workspace</p>
          <h1>{active?.clientName ?? 'Workspace'}</h1>
        </div>
        {active && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => actions.advanceReturn(active.id, 'Client Review')}
          >
            Send to client review
          </button>
        )}
      </header>

      <div className="grid-2">
        <section className="list-panel panel rise">
          <h2>Source documents & diagnostics</h2>
          {active && (
            <>
              <div className="row-item">
                <div>
                  <strong>
                    {active.returnType} · {active.state}
                  </strong>
                  <span className="row-meta">Readiness {active.readiness}% · Engine adapter mock</span>
                </div>
                <span className="badge">{active.isBusiness ? 'Business AI' : 'Personal'}</span>
              </div>
              <div style={{ margin: '0.75rem 0' }}>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${active.readiness}%` }} />
                </div>
              </div>
            </>
          )}
          {documents.slice(0, 4).map((d) => (
            <div className="row-item" key={d.id}>
              <div>
                <strong>{d.name}</strong>
                <span className="row-meta">
                  {d.type} · conf {Math.round(d.confidence * 100) || 0}%
                </span>
              </div>
              <span className={`badge ${d.status === 'needs_review' ? 'badge-warn' : 'badge-ok'}`}>{d.status}</span>
            </div>
          ))}
          <div className="row-item">
            <div>
              <strong>AI Review Notes</strong>
              <span className="row-meta">1099-NEC confidence below threshold · confirm dependent care answer</span>
            </div>
            <span className="badge badge-warn">2 flags</span>
          </div>
          <div className="row-item">
            <div>
              <strong>Fee lock</strong>
              <span className="row-meta">Immutable snapshot on engagement</span>
            </div>
            <strong>{active?.feeSnapshot.map((f) => formatMoney(f.amount)).join(', ')}</strong>
          </div>
        </section>
        <AiPanel compact />
      </div>

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Create business return (Addendum F)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Charges exactly {formatMoney(239.98)} ($89.99 + $149.99 business AI). Never collect the base twice.
        </p>
        <form onSubmit={createBiz} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
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
  )
}
