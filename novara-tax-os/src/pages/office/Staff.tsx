import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { canManageStaff } from '../../engine/accountPermissions'
import '../shared.css'

export function Staff() {
  const { currentUser, returns } = useAppStore()
  const staff = actions.officeStaffForTenant()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [ptin, setPtin] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [assignReturnId, setAssignReturnId] = useState('')
  const [assignPrepId, setAssignPrepId] = useState('')

  const allowed = canManageStaff(currentUser).allowed
  const tenantReturns = returns.filter((r) => r.tenantId === currentUser?.tenantId)
  const preparers = staff.filter((s) => s.kind === 'preparer' && s.status !== 'removed')

  function invite(e: FormEvent) {
    e.preventDefault()
    const result = actions.inviteOfficePreparer({ name, email, ptin })
    if (!result.ok) {
      setMsg(result.error)
      return
    }
    setMsg(`Invited ${result.staff.name}. PTIN ····${result.staff.ptinDisplay?.slice(-4) ?? ''} pending verification.`)
    setName('')
    setEmail('')
    setPtin('')
  }

  function assign(e: FormEvent) {
    e.preventDefault()
    const ok = actions.assignClientToPreparer(assignReturnId, assignPrepId)
    setMsg(ok ? 'Client assigned to preparer within this office tenant.' : 'Assignment failed — check permissions and tenant.')
  }

  if (!allowed) {
    return (
      <div className="page container">
        <header className="page-header">
          <div>
            <p className="eyebrow">Staff management</p>
            <h1>Not available</h1>
          </div>
        </header>
        <p className="muted">
          Independent TP accounts cannot create, invite, or manage preparers. TP = clients only.{' '}
          <Link to="/app/preparer">Back to inbox</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Office · preparers + clients · {currentUser?.tenantId}</p>
          <h1>Staff</h1>
        </div>
        <span className="badge badge-ok">Office owner</span>
      </header>

      <p className="muted">
        EFINs are firm credentials — never login credentials. Each paid preparer needs an individual login and their own
        PTIN where applicable. Manually entered PTINs stay pending until verified.
      </p>

      {msg && (
        <p className="callout" style={{ marginBottom: '1rem' }}>
          {msg}
        </p>
      )}

      <section className="list-panel panel rise">
        <h2>Roster</h2>
        {staff.map((s) => (
          <div className="row-item" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <span className="row-meta">
                {s.kind === 'owner' ? 'Office owner' : 'Preparer'} · {s.email}
                {s.ptinDisplay ? ` · PTIN ${s.ptinDisplay}` : ''}
                {s.ptinStatus ? ` · ${s.ptinStatus}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span className={`badge ${s.status === 'active' ? 'badge-ok' : s.status === 'invited' ? 'badge-warn' : ''}`}>
                {s.status}
              </span>
              {s.kind === 'preparer' && s.status !== 'removed' && (
                <button className="btn btn-secondary" type="button" onClick={() => actions.removeOfficePreparer(s.id)}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      <form className="panel rise" style={{ marginTop: '1rem' }} onSubmit={invite}>
        <h2>Invite preparer</h2>
        <div className="field">
          <label htmlFor="staffName">Name</label>
          <input id="staffName" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="staffEmail">Email (individual login)</label>
          <input id="staffEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="staffPtin">PTIN (required for paid preparers)</label>
          <input
            id="staffPtin"
            required
            placeholder="P12345678"
            value={ptin}
            onChange={(e) => setPtin(e.target.value.toUpperCase())}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Invite preparer
        </button>
      </form>

      <form className="panel rise" style={{ marginTop: '1rem' }} onSubmit={assign}>
        <h2>Assign client to preparer</h2>
        <div className="field">
          <label htmlFor="assignReturn">Client return</label>
          <select id="assignReturn" required value={assignReturnId} onChange={(e) => setAssignReturnId(e.target.value)}>
            <option value="">Select…</option>
            {tenantReturns.map((r) => (
              <option key={r.id} value={r.id}>
                {r.clientName} · {r.returnType} · {r.state}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="assignPrep">Preparer</label>
          <select id="assignPrep" required value={assignPrepId} onChange={(e) => setAssignPrepId(e.target.value)}>
            <option value="">Select…</option>
            {preparers.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={!preparers.length}>
          Assign
        </button>
      </form>
    </div>
  )
}
