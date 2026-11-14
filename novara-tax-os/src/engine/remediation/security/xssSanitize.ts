/**
 * XSS / HTML injection defenses for user-controlled strings (staging helpers).
 * Escape for HTML text nodes; strip script/event handlers from untrusted HTML fragments.
 */

import { assertRemediationStagingOnly, getRemediationFlags } from '../config'

const ENTITY: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(input: string): string {
  assertRemediationStagingOnly()
  if (!getRemediationFlags().xssSanitizeEnabled) return String(input ?? '')
  return String(input ?? '').replace(/[&<>"']/g, (c) => ENTITY[c] ?? c)
}

/** Reject obvious script payloads for free-text fields stored in profiles/docs. */
export function rejectDangerousMarkup(input: string): { ok: boolean; reason?: string } {
  assertRemediationStagingOnly()
  const s = String(input ?? '')
  if (/<\s*script\b/i.test(s)) return { ok: false, reason: 'script_tag' }
  if (/\bon\w+\s*=/i.test(s)) return { ok: false, reason: 'event_handler' }
  if (/javascript\s*:/i.test(s)) return { ok: false, reason: 'javascript_uri' }
  if (/<\s*iframe\b/i.test(s)) return { ok: false, reason: 'iframe' }
  return { ok: true }
}

export function redactSensitive(text: string): string {
  return String(text ?? '')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****')
    .replace(/\b\d{9}\b/g, '*********')
    .replace(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/g, '[REDACTED_PAN]')
}
