import { actions, useAppStore } from '../../store/useAppStore'
import '../shared.css'
import './EntryPlan.css'

export function EntryPlan() {
  const { entryPlan, entryPlanStatus, preEntryNotes, returns, activeReturnId, documents } = useAppStore()
  const active = returns.find((r) => r.id === activeReturnId) ?? returns[0]
  const activeLines = entryPlan.filter((l) => l.status !== 'removed')
  const removed = entryPlan.filter((l) => l.status === 'removed')

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Filed-style AI Tax Prep</p>
          <h1>Data-entry plan</h1>
        </div>
        <div className="entry-actions">
          <button className="btn btn-secondary" type="button" onClick={() => actions.rebuildEntryPlan()}>
            Rebuild from docs
          </button>
          {entryPlanStatus === 'awaiting_approval' && (
            <button className="btn btn-primary" type="button" onClick={() => actions.approveEntryPlan()}>
              Approve plan
            </button>
          )}
          {entryPlanStatus === 'approved' && (
            <button className="btn btn-accent" type="button" onClick={() => actions.runEntry()}>
              Enter approved fields
            </button>
          )}
        </div>
      </header>

      <section className="panel pipeline-banner rise">
        <div>
          <strong>{active?.clientName}</strong>
          <p className="muted">
            {active?.returnType} · TY{active?.taxYear} · NOVARA reads → you approve → NOVARA enters
          </p>
        </div>
        <span
          className={`badge ${
            entryPlanStatus === 'entered'
              ? 'badge-ok'
              : entryPlanStatus === 'entering'
                ? 'badge-warn'
                : 'badge-neutral'
          }`}
        >
          {entryPlanStatus.replace('_', ' ')}
        </span>
      </section>

      <div className="flow-strip rise rise-delay-1">
        {(
          [
            { n: '1', label: 'Reads every document', done: entryPlanStatus !== 'draft' },
            {
              n: '2',
              label: 'You approve the plan',
              done: ['approved', 'entering', 'entered'].includes(entryPlanStatus),
            },
            { n: '3', label: 'Enters every field', done: entryPlanStatus === 'entered' },
          ] as const
        ).map((step) => (
          <div key={step.label} className={`flow-chip ${step.done ? 'done' : ''}`}>
            <span>{step.n}</span>
            <strong>{step.label}</strong>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <section className="list-panel panel rise rise-delay-1">
          <h2>Proposed field mappings</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Every value, the field it goes to, and the document box it came from. Correct or remove before anything is
            written.
          </p>
          {activeLines.map((line) => (
            <div className="entry-line" key={line.id}>
              <div className="entry-line-main">
                <strong>{line.field}</strong>
                <span className="row-meta">
                  {line.form} · {line.sourceDocName} · {line.sourceBox} · p.{line.sourcePage} ·{' '}
                  {Math.round(line.confidence * 100)}%
                </span>
                <div className="proposed-value">
                  {line.status === 'corrected' ? line.correctedValue : line.proposedValue}
                  {line.status === 'corrected' && <span className="badge badge-warn">Corrected</span>}
                  {line.status === 'approved' && <span className="badge badge-ok">Approved</span>}
                </div>
              </div>
              <div className="entry-line-actions">
                {entryPlanStatus === 'awaiting_approval' && (
                  <>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      style={{ padding: '0.45rem 0.75rem' }}
                      onClick={() => {
                        const next = window.prompt('Correct value', line.proposedValue)
                        if (next != null && next.trim()) {
                          actions.updateEntryLine(line.id, {
                            status: 'corrected',
                            correctedValue: next.trim(),
                          })
                        }
                      }}
                    >
                      Correct
                    </button>
                    <button
                      className="btn btn-danger-soft"
                      type="button"
                      style={{ padding: '0.45rem 0.75rem' }}
                      onClick={() => actions.updateEntryLine(line.id, { status: 'removed' })}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {removed.length > 0 && (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              {removed.length} form line{removed.length === 1 ? '' : 's'} removed from plan
            </p>
          )}
          {entryPlanStatus === 'entering' && (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              Entering… then verifying written values against the plan.
            </p>
          )}
          {entryPlanStatus === 'entered' && (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              Entry complete for {activeLines.length} fields across {documents.length} source docs. Tax pro still signs
              off.
            </p>
          )}
        </section>

        <section className="list-panel panel rise rise-delay-2">
          <h2>Pre-Entry Notes</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Issues, missing documents, and items to resolve before sign-off.
          </p>
          {preEntryNotes.map((n) => (
            <div className="row-item" key={n.id}>
              <div>
                <strong>{n.title}</strong>
                <span className="row-meta">{n.detail}</span>
              </div>
              <span
                className={`badge ${
                  n.severity === 'critical' || n.severity === 'high'
                    ? 'badge-danger'
                    : n.severity === 'medium'
                      ? 'badge-warn'
                      : 'badge-neutral'
                }`}
              >
                {n.severity}
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
