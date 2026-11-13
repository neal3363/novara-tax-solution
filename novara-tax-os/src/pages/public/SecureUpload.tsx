import { useMemo, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { actions, useAppStore } from '../../store/useAppStore'
import { validateUploadInvite } from '../../engine/secureUploadInvite'
import '../shared.css'

/**
 * Guest document upload via expiring invite token.
 * Does not grant access to existing tax records.
 */
export function SecureUpload() {
  const { token = '' } = useParams()
  const { uploadInvites } = useAppStore()
  const invite = useMemo(() => uploadInvites.find((i) => i.token === token), [uploadInvites, token])
  const [verified, setVerified] = useState(false)
  const [lastName, setLastName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const validity = invite
    ? validateUploadInvite(invite, { tenantId: invite.tenantId, clientId: invite.clientId })
    : { ok: false as const, error: 'Invitation not found. Ask your preparer for a new link.' }

  function verifyIdentity(e: FormEvent) {
    e.preventDefault()
    if (!invite) return
    const expected = invite.clientName.trim().split(/\s+/).pop()?.toLowerCase() ?? ''
    if (!lastName.trim() || lastName.trim().toLowerCase() !== expected) {
      setMsg('Identity check failed. Enter the last name on file with your preparer.')
      return
    }
    setVerified(true)
    setMsg(null)
  }

  function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!invite || !verified) return
    const input = e.currentTarget.elements.namedItem('files') as HTMLInputElement
    if (!input.files?.length) return
    const result = actions.redeemUploadInvite(token, input.files)
    if (!result.ok) {
      setMsg(result.error)
      return
    }
    setDone(true)
    setMsg('Documents received. Your preparer has been notified. This link does not open your full tax return.')
  }

  return (
    <div className="page container" style={{ maxWidth: 560, margin: '2rem auto' }}>
      <p className="eyebrow">NOVARA · Secure document upload</p>
      <h1>Upload tax documents</h1>
      {!invite || !validity.ok ? (
        <p className="callout warn">{!validity.ok ? validity.error : 'Invalid invitation.'}</p>
      ) : done ? (
        <p className="callout">{msg}</p>
      ) : (
        <>
          <p className="muted">
            Invitation for <strong>{invite.clientName}</strong>. Expires{' '}
            {new Date(invite.expiresAt).toLocaleString()}. This page never shows prior returns, SSNs, or refund
            amounts.
          </p>
          {!verified ? (
            <form className="panel" onSubmit={verifyIdentity}>
              <div className="field">
                <label htmlFor="ln">Confirm your last name</label>
                <input id="ln" required value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
              </div>
              <button className="btn btn-primary" type="submit">
                Continue
              </button>
            </form>
          ) : (
            <form className="panel" onSubmit={onUpload}>
              <div className="field">
                <label htmlFor="files">Select files (PDF, images)</label>
                <input id="files" name="files" type="file" multiple required accept=".pdf,.png,.jpg,.jpeg,.webp" />
              </div>
              <button className="btn btn-primary" type="submit">
                Upload securely
              </button>
            </form>
          )}
          {msg && <p className="muted">{msg}</p>}
        </>
      )}
      <p style={{ marginTop: '1.5rem' }}>
        <Link to="/">Back to NOVARA</Link>
      </p>
    </div>
  )
}
