import { useState, type FormEvent } from 'react'
import { actions, useAppStore } from '../../store/useAppStore'
import { canSendUploadInvite } from '../../engine/secureUploadInvite'
import '../shared.css'

export function RequestDocuments() {
  const { currentUser, returns, uploadInvites } = useAppStore()
  const allowed = canSendUploadInvite(currentUser).allowed
  const clients = Array.from(new Map(returns.map((r) => [r.clientId, r])).values())
  const [clientId, setClientId] = useState(clients[0]?.clientId ?? '')
  const [channel, setChannel] = useState<'sms' | 'email' | 'link'>('sms')
  const [destination, setDestination] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const client = clients.find((c) => c.clientId === clientId)
    if (!client) return
    const result = actions.createClientUploadInvite({
      clientId: client.clientId,
      clientName: client.clientName,
      channel,
      destination,
    })
    setMsg(result.ok ? result.invite.messagePreview : result.error)
  }

  if (!allowed) {
    return (
      <div className="page container">
        <h1>Request documents</h1>
        <p className="muted">Only TP and Office staff can send secure upload invitations.</p>
      </div>
    )
  }

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Secure upload invitations · sandbox messaging</p>
          <h1>Request documents</h1>
        </div>
      </header>
      <p className="muted">
        Generates an expiring, tenant-scoped link. SMS/email bodies never include SSNs. Live messaging requires an
        authorized provider — this demo records the invite and audit log only.
      </p>

      <form className="panel rise" onSubmit={submit}>
        <div className="field">
          <label htmlFor="client">Client</label>
          <select id="client" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            {clients.map((c) => (
              <option key={c.clientId} value={c.clientId}>
                {c.clientName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="channel">Channel</label>
          <select id="channel" value={channel} onChange={(e) => setChannel(e.target.value as 'sms' | 'email' | 'link')}>
            <option value="sms">Text message (sandbox)</option>
            <option value="email">Email (sandbox)</option>
            <option value="link">Copy link only</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dest">{channel === 'email' ? 'Email' : 'Phone / destination'}</label>
          <input id="dest" required value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">
          Create invitation
        </button>
      </form>

      {msg && (
        <p className="callout" style={{ marginTop: '1rem' }}>
          {msg}
        </p>
      )}

      <section className="list-panel panel" style={{ marginTop: '1rem' }}>
        <h2>Invitations</h2>
        {(uploadInvites ?? []).length === 0 && <p className="muted">No invitations yet.</p>}
        {(uploadInvites ?? []).map((inv) => (
          <div className="row-item" key={inv.id}>
            <div>
              <strong>{inv.clientName}</strong>
              <span className="row-meta">
                {inv.channel} · {inv.destinationMasked} · expires {new Date(inv.expiresAt).toLocaleString()} · token{' '}
                {inv.token.slice(0, 8)}…
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span className="badge">{inv.status}</span>
              {inv.status === 'active' && (
                <>
                  <a className="btn btn-secondary" href={`/upload/${inv.token}`}>
                    Open link
                  </a>
                  <button className="btn btn-secondary" type="button" onClick={() => actions.revokeUploadInvite(inv.id)}>
                    Revoke
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
