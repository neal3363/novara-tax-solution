/**
 * Secure client document-upload invitations (TP / Office).
 * Tokens expire, are scoped to one client/tenant, and never include SSNs in messages.
 * Sandbox mode — no live SMS/email provider until configured.
 */

import type { UserAccount } from '../data/types'
import { canCreateClients, canManageStaff, isIndependentTp, isOfficeOwner, isOfficePreparer } from './accountPermissions'

export interface UploadInvite {
  id: string
  token: string
  tenantId: string
  clientId: string
  clientName: string
  createdByUserId: string
  channel: 'sms' | 'email' | 'link'
  /** Destination hint only — never put SSN in message body */
  destinationMasked: string
  createdAt: string
  expiresAt: string
  usedAt?: string
  revokedAt?: string
  status: 'active' | 'used' | 'expired' | 'revoked'
  messagePreview: string
}

export function canSendUploadInvite(actor: UserAccount | null | undefined) {
  if (!actor) return { allowed: false, reason: 'not_authenticated' as const }
  if (isIndependentTp(actor) || isOfficeOwner(actor) || isOfficePreparer(actor)) {
    if (canCreateClients(actor).allowed || canManageStaff(actor).allowed || isOfficePreparer(actor)) {
      return { allowed: true as const }
    }
  }
  return { allowed: false, reason: 'wrong_account_type' as const }
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function createUploadInvite(input: {
  actor: UserAccount
  clientId: string
  clientName: string
  channel: 'sms' | 'email' | 'link'
  destination: string
  ttlMinutes?: number
}): { ok: true; invite: UploadInvite } | { ok: false; error: string } {
  const gate = canSendUploadInvite(input.actor)
  if (!gate.allowed) return { ok: false, error: 'Only TP or Office staff can send upload invitations.' }

  const dest = input.destination.trim()
  if (!dest) return { ok: false, error: 'Destination phone or email is required.' }
  // Never allow SSN-like payloads in destination/message
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(dest) || /\b\d{9}\b/.test(dest)) {
    return { ok: false, error: 'Do not include Social Security numbers in invitation messages.' }
  }

  const ttl = input.ttlMinutes ?? 60 * 24
  const token = randomToken()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + ttl * 60_000)
  const masked =
    input.channel === 'email'
      ? dest.replace(/(.{2}).+(@.+)/, '$1***$2')
      : dest.replace(/(\d{0,2})\d+(\d{2})/, '$1***$2')

  const invite: UploadInvite = {
    id: `inv-${token.slice(0, 8)}`,
    token,
    tenantId: input.actor.tenantId,
    clientId: input.clientId,
    clientName: input.clientName,
    createdByUserId: input.actor.id,
    channel: input.channel,
    destinationMasked: masked,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    messagePreview: `NOVARA: ${input.clientName.split(' ')[0]}, upload your tax documents securely. Link expires in ${ttl >= 60 ? `${Math.round(ttl / 60)}h` : `${ttl}m`}. (Sandbox — no live SMS/email yet.)`,
  }
  return { ok: true, invite }
}

export function validateUploadInvite(
  invite: UploadInvite | undefined,
  opts: { tenantId: string; clientId: string; now?: Date },
): { ok: true } | { ok: false; error: string } {
  if (!invite) return { ok: false, error: 'Invitation not found.' }
  if (invite.tenantId !== opts.tenantId || invite.clientId !== opts.clientId) {
    return { ok: false, error: 'Invitation does not match this client vault (cross-tenant blocked).' }
  }
  if (invite.status === 'revoked') return { ok: false, error: 'Invitation revoked.' }
  if (invite.status === 'used') return { ok: false, error: 'Invitation already used.' }
  const now = opts.now ?? new Date()
  if (new Date(invite.expiresAt).getTime() < now.getTime() || invite.status === 'expired') {
    return { ok: false, error: 'Invitation expired.' }
  }
  return { ok: true }
}

export function markInviteUsed(invite: UploadInvite): UploadInvite {
  return { ...invite, status: 'used', usedAt: new Date().toISOString() }
}

export function revokeInvite(invite: UploadInvite): UploadInvite {
  return { ...invite, status: 'revoked', revokedAt: new Date().toISOString() }
}
