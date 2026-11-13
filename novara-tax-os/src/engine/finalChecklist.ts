/**
 * Final personalized document checklist for filing.
 * GREEN = received & verified · ORANGE = missing / awaiting · NOT APPLICABLE when not needed.
 */

import type { DocumentRecord } from '../data/types'
import type { TaxpayerProfile } from './benefitOptimizer'
import { buildDocumentChecklist, type DocumentRequirement } from './documentChecklist'

export type FinalDocVisual = 'green' | 'orange' | 'not_applicable'

export interface FinalChecklistItem {
  id: string
  name: string
  reason: string
  visual: FinalDocVisual
  statusLabel: string
  requiredForFiling: boolean
  category: 'required' | 'recommended' | 'not_applicable'
  matchHint?: string
  benefitName?: string
}

export interface FinalDocumentChecklist {
  taxYear: number
  items: FinalChecklistItem[]
  requiredMissing: number
  recommendedMissing: number
  verifiedCount: number
  canFileDocs: boolean
  summary: string
}

function mapStatus(req: DocumentRequirement): FinalChecklistItem {
  if (req.status === 'verified') {
    return {
      id: req.id,
      name: req.name,
      reason: req.reason,
      visual: 'green',
      statusLabel: 'Received and verified',
      requiredForFiling: req.requiredForFiling,
      category: req.requiredForFiling ? 'required' : 'recommended',
      matchHint: req.matchTypes.join(', '),
      benefitName: req.benefitName,
    }
  }
  if (req.status === 'uploaded' || req.status === 'under_review') {
    return {
      id: req.id,
      name: req.name,
      reason: req.reason,
      visual: 'orange',
      statusLabel: req.status === 'under_review' ? 'Awaiting verification' : 'Uploaded — awaiting verification',
      requiredForFiling: req.requiredForFiling,
      category: req.requiredForFiling ? 'required' : 'recommended',
      matchHint: req.matchTypes.join(', '),
      benefitName: req.benefitName,
    }
  }
  return {
    id: req.id,
    name: req.name,
    reason: req.reason,
    visual: 'orange',
    statusLabel: 'Missing',
    requiredForFiling: req.requiredForFiling,
    category: req.requiredForFiling ? 'required' : 'recommended',
    matchHint: req.matchTypes.join(', '),
    benefitName: req.benefitName,
  }
}

/** Optional NA rows for common docs that do not apply — shown for transparency, not required. */
function notApplicableHints(profile: TaxpayerProfile): FinalChecklistItem[] {
  const rows: FinalChecklistItem[] = []
  if (profile.wages <= 0 && profile.answers.has_earned_income !== 'yes') {
    rows.push({
      id: 'na-w2',
      name: 'Form W-2',
      reason: 'No wage income on this return.',
      visual: 'not_applicable',
      statusLabel: 'Not applicable',
      requiredForFiling: false,
      category: 'not_applicable',
    })
  }
  if (profile.selfEmploymentIncome <= 0 && profile.answers.self_employed !== 'yes') {
    rows.push({
      id: 'na-se',
      name: 'Business income / 1099-NEC',
      reason: 'No self-employment income indicated.',
      visual: 'not_applicable',
      statusLabel: 'Not applicable',
      requiredForFiling: false,
      category: 'not_applicable',
    })
  }
  if (profile.dependents.length === 0 && profile.answers.potential_dependents !== 'yes') {
    rows.push({
      id: 'na-dep',
      name: 'Dependent identification records',
      reason: 'No dependents on this return.',
      visual: 'not_applicable',
      statusLabel: 'Not applicable',
      requiredForFiling: false,
      category: 'not_applicable',
    })
  }
  if (!(profile.childcarePaid > 0 || profile.answers.paid_childcare === 'yes')) {
    rows.push({
      id: 'na-childcare',
      name: 'Childcare provider information',
      reason: 'No childcare credit being claimed.',
      visual: 'not_applicable',
      statusLabel: 'Not applicable',
      requiredForFiling: false,
      category: 'not_applicable',
    })
  }
  return rows
}

export function buildFinalDocumentChecklist(
  profile: TaxpayerProfile,
  documents: DocumentRecord[],
): FinalDocumentChecklist {
  const yearDocs = documents.filter((d) => d.taxYear === profile.taxYear)
  const reqs = buildDocumentChecklist(profile, yearDocs)
  const items = [...reqs.map(mapStatus), ...notApplicableHints(profile)]
  const requiredMissing = items.filter(
    (i) => i.category === 'required' && i.visual === 'orange',
  ).length
  const recommendedMissing = items.filter(
    (i) => i.category === 'recommended' && i.visual === 'orange',
  ).length
  const verifiedCount = items.filter((i) => i.visual === 'green').length
  const canFileDocs = requiredMissing === 0

  return {
    taxYear: profile.taxYear,
    items,
    requiredMissing,
    recommendedMissing,
    verifiedCount,
    canFileDocs,
    summary: canFileDocs
      ? `Required documents clear (${verifiedCount} verified). ${recommendedMissing} recommended item(s) still open.`
      : `${requiredMissing} required document(s) missing or awaiting verification before filing.`,
  }
}

/** Plain-text / printable checklist body */
export function checklistToPrintableText(checklist: FinalDocumentChecklist, clientName: string): string {
  const lines = [
    `NOVARA Tax OS — Document checklist`,
    `Taxpayer: ${clientName}`,
    `Tax year: ${checklist.taxYear}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    checklist.summary,
    ``,
    `REQUIRED FOR FILING`,
  ]
  checklist.items
    .filter((i) => i.category === 'required')
    .forEach((i) => lines.push(`[${i.statusLabel}] ${i.name} — ${i.reason}`))
  lines.push(``, `RECOMMENDED (audit support)`)
  checklist.items
    .filter((i) => i.category === 'recommended')
    .forEach((i) => lines.push(`[${i.statusLabel}] ${i.name} — ${i.reason}`))
  lines.push(``, `NOT APPLICABLE`)
  checklist.items
    .filter((i) => i.category === 'not_applicable')
    .forEach((i) => lines.push(`[Not applicable] ${i.name} — ${i.reason}`))
  lines.push(
    ``,
    `This checklist does not include Social Security cards or full TINs.`,
    `Sandbox printable export — use browser Print → Save as PDF for a PDF copy.`,
  )
  return lines.join('\n')
}
