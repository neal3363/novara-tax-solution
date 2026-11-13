/**
 * Automated client notifications — no SSNs or sensitive tax details in message bodies.
 * Sandbox templates until an authorized messaging provider is configured.
 */

export type NotificationKind =
  | 'missing_documents'
  | 'unanswered_questions'
  | 'ready_for_review'
  | 'signature_request'
  | 'submitted'
  | 'irs_accepted'
  | 'irs_rejected'
  | 'corrections_required'
  | 'upload_invite'

export interface ClientNotification {
  id: string
  kind: NotificationKind
  tenantId: string
  clientId: string
  channel: 'sms' | 'email' | 'in_app'
  subject: string
  body: string
  createdAt: string
  status: 'queued' | 'sent_sandbox' | 'suppressed'
  relatedReturnId?: string
}

const TEMPLATES: Record<NotificationKind, { subject: string; body: (name: string) => string }> = {
  missing_documents: {
    subject: 'NOVARA — documents still needed',
    body: (name) =>
      `Hi ${name}, NOVARA still needs documents to finish your return. Open your secure link to upload. No tax ID numbers are sent by text.`,
  },
  unanswered_questions: {
    subject: 'NOVARA — a few questions remain',
    body: (name) => `Hi ${name}, a few short questions are left so we can finish your tax return. Sign in to answer them.`,
  },
  ready_for_review: {
    subject: 'NOVARA — your return is ready to review',
    body: (name) => `Hi ${name}, your return is ready for review. Sign in to check the summary before you approve.`,
  },
  signature_request: {
    subject: 'NOVARA — signature needed',
    body: (name) => `Hi ${name}, please review and sign so we can submit your return. Do not reply with personal tax numbers.`,
  },
  submitted: {
    subject: 'NOVARA — return submitted',
    body: (name) => `Hi ${name}, your return was submitted through the e-file provider. We’ll notify you when a response arrives.`,
  },
  irs_accepted: {
    subject: 'NOVARA — return accepted',
    body: (name) => `Hi ${name}, the IRS accepted your return (provider confirmation). Sign in for details — amounts are not sent by text.`,
  },
  irs_rejected: {
    subject: 'NOVARA — return needs correction',
    body: (name) =>
      `Hi ${name}, the e-file provider reported a rejection. Sign in to see the provider rejection code and correction steps.`,
  },
  corrections_required: {
    subject: 'NOVARA — corrections needed',
    body: (name) => `Hi ${name}, your preparer needs a few corrections before filing. Sign in to see what’s needed.`,
  },
  upload_invite: {
    subject: 'NOVARA — secure document upload',
    body: (name) => `Hi ${name}, use your secure NOVARA link to upload tax documents. The link expires. Never send SSNs by text.`,
  },
}

export function buildClientNotification(input: {
  id: string
  kind: NotificationKind
  tenantId: string
  clientId: string
  clientFirstName: string
  channel?: 'sms' | 'email' | 'in_app'
  relatedReturnId?: string
  customBody?: string
}): ClientNotification {
  const tpl = TEMPLATES[input.kind]
  const first = input.clientFirstName.split(' ')[0] || 'there'
  return {
    id: input.id,
    kind: input.kind,
    tenantId: input.tenantId,
    clientId: input.clientId,
    channel: input.channel ?? 'in_app',
    subject: tpl.subject,
    body: input.customBody ?? tpl.body(first),
    createdAt: new Date().toISOString(),
    status: 'sent_sandbox',
    relatedReturnId: input.relatedReturnId,
  }
}

/** Soft rate limit: suppress duplicate kind+client within window */
export function shouldSuppressDuplicate(
  existing: ClientNotification[],
  kind: NotificationKind,
  clientId: string,
  windowMs = 1000 * 60 * 60 * 12,
): boolean {
  const cutoff = Date.now() - windowMs
  return existing.some(
    (n) => n.clientId === clientId && n.kind === kind && new Date(n.createdAt).getTime() > cutoff,
  )
}
