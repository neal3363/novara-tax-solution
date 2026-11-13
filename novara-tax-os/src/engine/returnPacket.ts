/**
 * Working tax return packet for VIEW / DOWNLOAD / PRINT.
 * Built only from deterministic engine outputs — not a generic sample.
 */

import type { BenefitSnapshot } from '../data/types'
import type { TaxpayerProfile } from './benefitOptimizer'
import { buildCalcAuditTrail, type CalcAuditTrail } from './calcAuditTrail'
import { runBenefitOptimization } from './benefitOptimizer'
import { formatMoney } from '../data/fees'

export interface ReturnFormLine {
  form: string
  field: string
  description: string
  amount: number
  status: string
  citation?: string
}

export interface WorkingReturnPacket {
  taxYear: number
  ruleVersion: string
  clientName: string
  filingStatus: string
  isDraft: boolean
  draftWatermark: string | null
  versionId: string
  contentHash: string
  locked: boolean
  generatedAt: string
  summary: {
    wages: number
    selfEmploymentIncome: number
    withholding: number
    taxableIncomeEstimate: number
    baseRefund: number
    verifiedBenefits: number
    projectedRefund: number
    dependents: number
  }
  dependents: { name: string; relationship: string; age: number }[]
  formLines: ReturnFormLine[]
  schedules: string[]
  trail: CalcAuditTrail
  filingMode: 'original' | 'amended'
}

function hashContent(parts: string[]): string {
  let h = 0x811c9dc5
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `rv_${(h >>> 0).toString(16).padStart(8, '0')}`
}

export function buildWorkingReturnPacket(input: {
  profile: TaxpayerProfile
  benefitReport: BenefitSnapshot | null
  clientName: string
  locked?: boolean
  lockedVersionId?: string
  lockedHash?: string
  filingMode?: 'original' | 'amended'
  isDraft?: boolean
}): WorkingReturnPacket {
  const report = input.benefitReport
  const engine = runBenefitOptimization(input.profile)
  const trail = buildCalcAuditTrail(input.profile, engine)
  const formLines: ReturnFormLine[] = [
    {
      form: 'Form 1040',
      field: 'Line 1a',
      description: 'Wages (from profile / W-2)',
      amount: input.profile.wages,
      status: 'calculated',
    },
    {
      form: 'Form 1040',
      field: 'Line 25a',
      description: 'Federal income tax withheld',
      amount: input.profile.withholding,
      status: 'calculated',
    },
  ]
  if (input.profile.selfEmploymentIncome > 0) {
    formLines.push({
      form: 'Schedule C',
      field: 'Gross receipts',
      description: 'Business / self-employment receipts',
      amount: input.profile.selfEmploymentIncome,
      status: 'calculated',
    })
  }
  ;(report?.formLines ?? engine.formLines).forEach((l) => {
    formLines.push({
      form: l.form,
      field: l.field,
      description: l.name,
      amount: l.amount,
      status: l.status,
      citation: l.citation,
    })
  })

  const schedules = Array.from(new Set(formLines.map((l) => l.form)))
  const projected = report?.projectedRefund ?? engine.projectedRefund
  const contentHash = hashContent([
    String(input.profile.taxYear),
    input.profile.filingStatus,
    String(input.profile.wages),
    String(input.profile.withholding),
    String(input.profile.selfEmploymentIncome),
    String(projected),
    ...formLines.map((l) => `${l.form}:${l.field}:${l.amount}`),
    ...input.profile.dependents.map((d) => `${d.fullLegalName}:${d.age}`),
  ])
  const versionId = input.lockedVersionId ?? `ver-${contentHash.slice(3, 11)}`
  const isDraft = input.isDraft ?? !input.locked

  return {
    taxYear: input.profile.taxYear,
    ruleVersion: report?.ruleVersion ?? engine.ruleVersion,
    clientName: input.clientName,
    filingStatus: input.profile.filingStatus,
    isDraft,
    draftWatermark: isDraft ? 'DRAFT — Not for filing until authorized' : null,
    versionId,
    contentHash,
    locked: Boolean(input.locked),
    generatedAt: new Date().toISOString(),
    summary: {
      wages: input.profile.wages,
      selfEmploymentIncome: input.profile.selfEmploymentIncome,
      withholding: input.profile.withholding,
      taxableIncomeEstimate: Math.max(0, input.profile.wages + input.profile.selfEmploymentIncome - 15000),
      baseRefund: report?.baseRefund ?? engine.baseRefund,
      verifiedBenefits: report?.verifiedSavings ?? engine.verifiedSavings,
      projectedRefund: projected,
      dependents: input.profile.dependents.length,
    },
    dependents: input.profile.dependents.map((d) => ({
      name: d.fullLegalName || 'Dependent',
      relationship: d.relationship || '—',
      age: d.age,
    })),
    formLines,
    schedules,
    trail,
    filingMode: input.filingMode ?? 'original',
  }
}

export function returnPacketToPrintableHtml(packet: WorkingReturnPacket): string {
  const money = (n: number) => formatMoney(n)
  const rows = packet.formLines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.form)}</td><td>${escapeHtml(l.field)}</td><td>${escapeHtml(l.description)}</td><td style="text-align:right">${money(l.amount)}</td><td>${escapeHtml(l.status)}</td></tr>`,
    )
    .join('')
  const deps = packet.dependents
    .map((d) => `<li>${escapeHtml(d.name)} · ${escapeHtml(d.relationship)} · age ${d.age}</li>`)
    .join('')
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>NOVARA Return TY${packet.taxYear}</title>
<style>
body{font-family:Georgia,serif;margin:24px;color:#122} h1{font-size:1.4rem}
.watermark{color:#b36b12;font-weight:700;border:2px solid #e8a54b;padding:8px;margin:12px 0}
table{border-collapse:collapse;width:100%;font-size:12px} td,th{border:1px solid #ccc;padding:6px;text-align:left}
.meta{font-size:12px;color:#456} @media print{.no-print{display:none}}
</style></head><body>
${packet.draftWatermark ? `<p class="watermark">${escapeHtml(packet.draftWatermark)}</p>` : ''}
<h1>NOVARA working tax return — TY${packet.taxYear}</h1>
<p class="meta">${escapeHtml(packet.clientName)} · Filing status: ${escapeHtml(packet.filingStatus)} · Mode: ${packet.filingMode}<br/>
Version ${escapeHtml(packet.versionId)} · Hash ${escapeHtml(packet.contentHash)} · Rules ${escapeHtml(packet.ruleVersion)}<br/>
Generated ${escapeHtml(packet.generatedAt)}${packet.locked ? ' · LOCKED for signature' : ''}</p>
<h2>Summary</h2>
<ul>
<li>Wages: ${money(packet.summary.wages)}</li>
<li>Self-employment: ${money(packet.summary.selfEmploymentIncome)}</li>
<li>Withholding: ${money(packet.summary.withholding)}</li>
<li>Estimated taxable income: ${money(packet.summary.taxableIncomeEstimate)}</li>
<li>Base refund estimate: ${money(packet.summary.baseRefund)}</li>
<li>Verified benefits applied: ${money(packet.summary.verifiedBenefits)}</li>
<li><strong>Projected refund / balance: ${money(packet.summary.projectedRefund)}</strong></li>
</ul>
<h2>Dependents</h2>
${deps ? `<ul>${deps}</ul>` : '<p>None</p>'}
<h2>Forms &amp; schedules</h2>
<p>${escapeHtml(packet.schedules.join(', ') || 'Form 1040')}</p>
<table><thead><tr><th>Form</th><th>Line</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="meta">Calculated by NOVARA deterministic engine — not invented by the AI assistant. Sandbox demo forms; not a substitute for IRS e-file provider output until connected.</p>
<button class="no-print" onclick="window.print()">Print</button>
</body></html>`
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Minimal PDF (text-only) for DOWNLOAD PDF — real IRS PDF forms require authorized form engines. */
export function returnPacketToSimplePdf(packet: WorkingReturnPacket): Uint8Array {
  const lines = [
    `NOVARA Tax OS — Working return TY${packet.taxYear}`,
    packet.draftWatermark ?? 'AUTHORIZED COPY (sandbox)',
    `Taxpayer: ${packet.clientName}`,
    `Filing status: ${packet.filingStatus}`,
    `Version: ${packet.versionId}  Hash: ${packet.contentHash}`,
    `Projected refund/balance: ${packet.summary.projectedRefund}`,
    `Wages: ${packet.summary.wages}  Withholding: ${packet.summary.withholding}`,
    `SE income: ${packet.summary.selfEmploymentIncome}`,
    `Schedules: ${packet.schedules.join(', ')}`,
    ...packet.formLines.map((l) => `${l.form} ${l.field}: ${l.description} = ${l.amount}`),
    `Generated ${packet.generatedAt}`,
    'Sandbox PDF — not an official IRS form image.',
  ]
  return buildMinimalPdf(lines)
}

function buildMinimalPdf(textLines: string[]): Uint8Array {
  const escaped = textLines.map((l) => l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'))
  const content: string[] = ['BT /F1 10 Tf 40 750 Td 14 TL']
  escaped.forEach((l, i) => {
    if (i === 0) content.push(`(${l}) Tj`)
    else content.push(`T* (${l}) Tj`)
  })
  content.push('ET')
  const stream = content.join('\n')
  const objects: string[] = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
  )
  objects.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`)
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj')
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  objects.forEach((obj) => {
    offsets.push(pdf.length)
    pdf += obj + '\n'
  })
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return new TextEncoder().encode(pdf)
}
