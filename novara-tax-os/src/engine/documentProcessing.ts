import type { DocType, DocumentRecord, ExtractedFact } from '../data/types'

export type UploadIssue = {
  kind: 'duplicate' | 'conflict' | 'missing'
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  docIds: string[]
}

const MONEY = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function classifyDocumentName(name: string): DocType {
  const n = name.toLowerCase()
  if (n.includes('w-2') || n.includes('w2')) return 'W-2'
  if (n.includes('1099-int') || n.includes('1099int') || (n.includes('1099') && n.includes('int'))) return '1099-INT'
  if (n.includes('1099-nec') || n.includes('1099nec') || n.includes('nec')) return '1099-NEC'
  if (n.includes('1099')) return '1099-NEC'
  if (n.includes('1098-t') || n.includes('1098t') || n.includes('tuition')) return '1098-T'
  if (n.includes('1098-e') || n.includes('1098e') || n.includes('student loan')) return '1098-E'
  if (n.includes('1098') || n.includes('mortgage')) return '1098'
  if (n.includes('childcare') || n.includes('daycare') || n.includes('dependent care')) return 'Childcare'
  if (n.includes('property tax') || n.includes('prop-tax')) return 'Property Tax'
  if (n.includes('pl') || n.includes('p&l') || n.includes('profit')) return 'P&L'
  if (n.includes('trial')) return 'Trial Balance'
  if (n.includes('bank')) return 'Bank Statement'
  if (
    n.includes('ssn') ||
    n.includes('social') ||
    n.includes('id') ||
    n.includes('license') ||
    n.includes('passport') ||
    n.includes('dependent') ||
    n.includes('birth') ||
    n.includes('itin')
  )
    return 'ID'
  if (n.includes('1040') || n.includes('prior')) return 'Prior Return'
  return 'Other'
}

function fact(id: string, label: string, value: string, confidence: number, page = 1): ExtractedFact {
  return { id, label, value, sourcePage: page, confidence, verified: false }
}

function nameFromFile(fileName: string, fallback: string): string {
  const base = fileName.replace(/\.[^.]+$/, '')
  const m = base.match(
    /(?:id|license|passport|ssn|social|birth|cert|dependent|spouse|child|w2|w-2)[_\-\s]+(.+)/i,
  )
  if (m) {
    const cleaned = m[1]
      .replace(/[_\-.]+/g, ' ')
      .replace(/\b(ssn|id|license|passport|birth|cert|card|w2|doc)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned.length > 2) {
      return cleaned
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }
  }
  return fallback
}

/** Deterministic demo extraction from document type — values stay consistent for the same type. */
export function extractFactsForType(
  type: DocType,
  fileName: string,
  confidence: number,
  uid: (prefix: string) => string,
  ownerName: string,
): ExtractedFact[] {
  const personName = nameFromFile(fileName, ownerName)
  switch (type) {
    case 'W-2':
      return [
        fact(uid('f'), 'Employee name', personName, confidence),
        fact(uid('f'), 'Employer name', 'Acme Logistics LLC', confidence),
        fact(uid('f'), 'Wages (Box 1)', '$64,200.00', confidence),
        fact(uid('f'), 'Federal withheld', '$7,110.00', confidence - 0.02),
        fact(uid('f'), 'EIN (last 4)', '••••3210', confidence - 0.05),
      ]
    case '1099-NEC':
      return [
        fact(uid('f'), 'Payer', 'Harbor Studio Payments', confidence),
        fact(uid('f'), 'Nonemployee compensation', '$3,800.00', confidence),
      ]
    case '1099-INT':
      return [fact(uid('f'), 'Interest income', '$412.00', confidence)]
    case '1098':
      return [
        fact(uid('f'), 'Lender', 'First Harbor Mortgage', confidence),
        fact(uid('f'), 'Mortgage interest', '$8,500.00', confidence),
        fact(uid('f'), 'Property taxes paid by lender', '$4,200.00', confidence - 0.03),
      ]
    case '1098-T':
      return [
        fact(uid('f'), 'Institution', 'State University', confidence),
        fact(uid('f'), 'Qualified tuition (Box 1)', '$6,400.00', confidence),
      ]
    case '1098-E':
      return [fact(uid('f'), 'Student loan interest', '$780.00', confidence)]
    case 'Childcare':
      return [
        fact(uid('f'), 'Care provider', 'Sunshine Daycare', confidence),
        fact(uid('f'), 'Childcare paid', '$4,800.00', confidence),
        fact(uid('f'), 'Provider EIN (last 4)', '••••5541', confidence - 0.04),
      ]
    case 'Property Tax':
      return [fact(uid('f'), 'Property taxes', '$5,100.00', confidence)]
    case 'ID': {
      const isChild =
        /child|birth|dependent|emma|liam|sophia|noah/i.test(fileName) ||
        /child|birth|dependent/i.test(personName)
      const isSpouse = /spouse|mary|partner/i.test(fileName)
      const dob = isChild ? '06/02/2016' : isSpouse ? '11/08/1990' : '03/14/1988'
      // TIN stored as masked fact only — full value never placed on ordinary screens
      const last4 = isChild ? '4412' : isSpouse ? '7781' : '9021'
      return [
        fact(uid('f'), 'Full name', personName, 0.96),
        fact(uid('f'), 'Date of birth', dob, 0.94),
        fact(uid('f'), 'Tax ID (SSN/ITIN)', `***-**-${last4}`, 0.93),
        fact(uid('f'), 'Address', '1842 Harbor Ave, Austin, TX', isChild ? 0.88 : 0.91),
      ]
    }
    default:
      return [fact(uid('f'), 'Detected label', fileName.replace(/\.[^.]+$/, ''), confidence)]
  }
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]/g, '')
}

function moneyFromFacts(docs: DocumentRecord[], labelIncludes: string): number[] {
  const out: number[] = []
  docs.forEach((d) => {
    d.facts.forEach((f) => {
      if (f.label.toLowerCase().includes(labelIncludes.toLowerCase())) {
        const n = Number(String(f.value).replace(/[^0-9.-]/g, ''))
        if (Number.isFinite(n)) out.push(n)
      }
    })
  })
  return out
}

export function findDuplicateUploads(
  existing: DocumentRecord[],
  incoming: { name: string; type: DocType }[],
): UploadIssue[] {
  const issues: UploadIssue[] = []
  incoming.forEach((inc) => {
    const dup = existing.find(
      (e) =>
        e.taxYear === 2025 &&
        (normalizeName(e.name) === normalizeName(inc.name) ||
          (e.type === inc.type &&
            ['W-2', '1099-NEC', '1098', '1098-T', '1098-E'].includes(inc.type) &&
            normalizeName(e.name).includes(normalizeName(inc.name).slice(0, 8)))),
    )
    if (dup) {
      issues.push({
        kind: 'duplicate',
        severity: 'medium',
        title: `Possible duplicate ${inc.type}`,
        detail: `"${inc.name}" looks like an existing file (${dup.name}). NOVARA will keep both for review and will not double-count verified amounts.`,
        docIds: [dup.id],
      })
    }
  })
  return issues
}

export function detectDocumentConflicts(docs: DocumentRecord[]): UploadIssue[] {
  const issues: UploadIssue[] = []
  const wages = moneyFromFacts(
    docs.filter((d) => d.type === 'W-2'),
    'Wages',
  )
  if (wages.length >= 2) {
    const spread = Math.max(...wages) - Math.min(...wages)
    if (spread > 500) {
      issues.push({
        kind: 'conflict',
        severity: 'high',
        title: 'Conflicting W-2 wages',
        detail: `Multiple W-2 wage amounts differ by ${MONEY(spread)}. Confirm which employer forms belong on this return before filing.`,
        docIds: docs.filter((d) => d.type === 'W-2').map((d) => d.id),
      })
    }
  }

  const tuition = moneyFromFacts(
    docs.filter((d) => d.type === '1098-T'),
    'tuition',
  )
  if (tuition.length >= 2) {
    issues.push({
      kind: 'conflict',
      severity: 'medium',
      title: 'Multiple tuition statements',
      detail: 'More than one 1098-T was found. Education credits cannot double-count the same expenses.',
      docIds: docs.filter((d) => d.type === '1098-T').map((d) => d.id),
    })
  }

  const missingHints: UploadIssue[] = []
  const types = new Set(docs.map((d) => d.type))
  if (types.has('W-2') && !types.has('ID')) {
    missingHints.push({
      kind: 'missing',
      severity: 'low',
      title: 'Identity document not uploaded yet',
      detail: 'A driver’s license or Social Security card helps confirm your name and ID for filing.',
      docIds: [],
    })
  }
  if ((types.has('1098-T') || types.has('Childcare')) && !types.has('ID')) {
    /* already covered */
  }

  return [...issues, ...missingHints]
}

export function plainLanguageExtractionSummary(doc: DocumentRecord): string {
  const bits = doc.facts.slice(0, 3).map((f) => `${f.label} ${f.value}`)
  return `${doc.type}: ${bits.join(' · ') || 'classified for review'}`
}
