/**
 * Public demonstration helpers — client-safe labels + sensitive-payload gates.
 * Live integration lock verification lives in publicDemoSafety.ts (server/tests).
 */

/** Build-time public demo flag (Vite). Defaults ON for production demo deploys. */
export function isPublicDemoMode(): boolean {
  const env = (import.meta as ImportMeta & { env?: { VITE_NOVARA_PUBLIC_DEMO?: string } }).env
  const raw = String(env?.VITE_NOVARA_PUBLIC_DEMO ?? 'true').toLowerCase()
  return raw !== 'false' && raw !== '0'
}

export const PUBLIC_DEMO_BANNER =
  'PUBLIC DEMO — synthetic examples only. Not a live IRS filing system. Do not enter real SSNs, tax documents, or payment cards.'

export const PUBLIC_DEMO_RESULT_LABEL = 'Simulated result — not an official IRS calculation or filing.'

/** Patterns that indicate real sensitive taxpayer / payment data. */
const SSN_RE = /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/
const PAN_RE = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/
const ITIN_RE = /\b9\d{2}[-\s]?\d{2}[-\s]?\d{4}\b/

export type DemoSubmissionKind =
  | 'document_upload'
  | 'payment'
  | 'banking'
  | 'irs_transmit'
  | 'identity'
  | 'generic'

export interface DemoGateResult {
  allowed: boolean
  code?: string
  reason?: string
  publicDemo: true
  liveIntegrations: false
}

/** Reject sensitive payloads in public demo (client + server shared logic). */
export function rejectSensitiveDemoPayload(
  text: string,
  kind: DemoSubmissionKind = 'generic',
): DemoGateResult {
  const s = String(text ?? '')
  if (SSN_RE.test(s) || ITIN_RE.test(s)) {
    return {
      allowed: false,
      code: 'demo_ssn_blocked',
      reason: 'Real SSN/ITIN patterns are blocked in public demo. Use synthetic examples only.',
      publicDemo: true,
      liveIntegrations: false,
    }
  }
  if (PAN_RE.test(s.replace(/\s/g, ''))) {
    return {
      allowed: false,
      code: 'demo_pan_blocked',
      reason: 'Payment card numbers are blocked in public demo.',
      publicDemo: true,
      liveIntegrations: false,
    }
  }
  if (kind === 'payment' || kind === 'banking' || kind === 'irs_transmit') {
    return {
      allowed: false,
      code: `demo_${kind}_blocked`,
      reason: `${kind} is disabled for the public demonstration.`,
      publicDemo: true,
      liveIntegrations: false,
    }
  }
  if (kind === 'document_upload' && /tax.?return|w-?2|1099|form.?1040/i.test(s) && /\d{9}/.test(s)) {
    return {
      allowed: false,
      code: 'demo_document_blocked',
      reason: 'Uploading real tax documents is blocked in public demo.',
      publicDemo: true,
      liveIntegrations: false,
    }
  }
  return { allowed: true, publicDemo: true, liveIntegrations: false }
}
