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

/**
 * Classify an uploaded filename into a tax document type for vault routing.
 * Prefer exact form tokens (W-2, 1099, DL, SS card) over loose substring matches.
 */
export function classifyDocumentName(name: string): DocType {
  const base = name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/%20/g, ' ')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Income forms (normalize underscores so “W2_Acme” and “1099-NEC_x” still match)
  if (/\bw[\s\-]?2\b/.test(base)) return 'W-2'
  if (/1099[\s\-]?int\b|1099int\b|\bint(?:erest)?\b.*1099|1099.*\bint(?:erest)?\b/.test(base)) return '1099-INT'
  if (/1099[\s\-]?(?:nec|misc)\b|1099(?:nec|misc)\b|non[\s\-]?employee/.test(base)) return '1099-NEC'
  if (/1099/.test(base)) return '1099-NEC'
  if (/1098[\s\-]?t\b|1098t\b|\btuition\b|\bcollege\b|\buniversity\b/.test(base)) return '1098-T'
  if (/1098[\s\-]?e\b|1098e\b|student[\s\-]?loan/.test(base)) return '1098-E'
  if (/1098|\bmortgage\b/.test(base)) return '1098'

  // Credits / deductions support
  if (/child[\s\-]?care|day[\s\-]?care|dependent[\s\-]?care|babysit/.test(base)) return 'Childcare'
  if (/property[\s\-]?tax|prop[\s\-]?tax/.test(base)) return 'Property Tax'

  // Business books — avoid matching “simple”, “apply”, etc. via bare “pl”
  if (/\bp\s*&\s*l\b|profit[\s\-]?and[\s\-]?loss|profit[\s\-]?loss|\bpl\b/.test(base)) {
    return 'P&L'
  }
  if (/trial[\s\-]?balance/.test(base)) return 'Trial Balance'
  if (/\bbank\b/.test(base) && /(statement|checking|savings|deposit)/.test(base)) return 'Bank Statement'
  if (/\bbank\b|bank[\s\-]?statement/.test(base) && !/1099/.test(base)) return 'Bank Statement'

  // Identity: driver’s license / DL / photo ID
  if (
    /\bdl\b/.test(base) ||
    /driver'?s?[\s\-]?licen[cs]e|driving[\s\-]?licen[cs]e/.test(base) ||
    /\blicen[cs]e\b/.test(base) ||
    /passport|photo[\s\-]?id|state[\s\-]?id/.test(base)
  ) {
    return 'ID'
  }

  // Identity: Social Security / ITIN card
  if (
    /\bssn\b/.test(base) ||
    /social[\s\-]?security|\bss\s*card\b|sscard|itin[\s\-]?card|\bitin\b/.test(base)
  ) {
    return 'ID'
  }

  // Other household ID / relationship docs (word-boundary “id”, not “valid” / “middle”)
  if (/\bid\b/.test(base) || /birth[\s\-]?cert|dependent|spouse/.test(base)) {
    return 'ID'
  }

  if (/1040|prior[\s\-]?year|prior[\s\-]?return|amended[\s\-]?return/.test(base)) return 'Prior Return'
  return 'Other'
}

/** Human vault destination for a classified document type. */
export function routingPlaceForDocType(type: DocType): {
  vaultCategory: NonNullable<DocumentRecord['vaultCategory']>
  questionnaireSection: 'personal' | 'income' | 'deductions' | 'credits' | 'business' | 'review'
  placeLabel: string
} {
  switch (type) {
    case 'ID':
      return {
        vaultCategory: 'primary_taxpayer',
        questionnaireSection: 'personal',
        placeLabel: 'Personal ID vault',
      }
    case 'W-2':
    case '1099-NEC':
    case '1099-INT':
      return {
        vaultCategory: 'income',
        questionnaireSection: 'income',
        placeLabel: 'Income documents',
      }
    case '1098':
    case '1098-T':
    case '1098-E':
    case 'Childcare':
    case 'Property Tax':
      return {
        vaultCategory: 'credits_deductions',
        questionnaireSection: type === 'Childcare' || type === '1098-T' ? 'credits' : 'deductions',
        placeLabel: 'Credits & deductions',
      }
    case 'P&L':
    case 'Trial Balance':
      return {
        vaultCategory: 'business',
        questionnaireSection: 'business',
        placeLabel: 'Business records',
      }
    case 'Prior Return':
      return {
        vaultCategory: 'filing_authorizations',
        questionnaireSection: 'review',
        placeLabel: 'Prior returns',
      }
    case 'Bank Statement':
      return {
        vaultCategory: 'other',
        questionnaireSection: 'income',
        placeLabel: 'Supporting statements',
      }
    default:
      return {
        vaultCategory: 'other',
        questionnaireSection: 'review',
        placeLabel: 'Needs review',
      }
  }
}

/** One-line sort summary for landing / Prepare after multi-upload. */
export function summarizeUploadRouting(fileNames: string[]): string {
  if (fileNames.length === 0) return 'No documents selected.'
  const groups = new Map<string, string[]>()
  fileNames.forEach((name) => {
    const type = classifyDocumentName(name)
    const { placeLabel } = routingPlaceForDocType(type)
    const key = `${type} → ${placeLabel}`
    const list = groups.get(key) ?? []
    list.push(name)
    groups.set(key, list)
  })
  return Array.from(groups.entries())
    .map(([dest, names]) => `${dest} (${names.length})`)
    .join(' · ')
}

function fact(id: string, label: string, value: string, confidence: number, page = 1): ExtractedFact {
  return { id, label, value, sourcePage: page, confidence, verified: false }
}

function nameFromFile(fileName: string, fallback: string): string {
  const base = fileName.replace(/\.[^.]+$/, '')
  const m = base.match(
    /(?:id|dl|license|licen[cs]e|passport|ssn|ss[\s\-_]?card|social|birth|cert|dependent|spouse|child|w2|w-2|1099)[_\-\s]+(.+)/i,
  )
  if (m) {
    const cleaned = m[1]
      .replace(/[_\-.]+/g, ' ')
      .replace(/\b(ssn|ss|id|dl|license|licen[cs]e|passport|birth|cert|card|w2|1099|doc)\b/gi, '')
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

function identityKindFromFile(fileName: string): 'driver_license' | 'ssn_card' | 'id' {
  const n = fileName.toLowerCase()
  if (
    /(^|[_\-\s])dl([_\-\s.]|$)/.test(n) ||
    /driver'?s?[\s\-_]?licen[cs]e|driving[\s\-_]?licen[cs]e|(^|[_\-\s])licen[cs]e([_\-\s.]|$)/.test(n)
  ) {
    return 'driver_license'
  }
  if (
    /(^|[_\-\s])ssn([_\-\s.]|$)/.test(n) ||
    /social[\s\-_]?security|ss[\s\-_]?card|sscard|itin/.test(n)
  ) {
    return 'ssn_card'
  }
  return 'id'
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
        fact(uid('f'), 'Employee SSN (last 4)', '9021', confidence - 0.02),
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
      const kind = identityKindFromFile(fileName)
      const isChild =
        /child|birth|dependent|emma|liam|sophia|noah/i.test(fileName) ||
        /child|birth|dependent/i.test(personName)
      const isSpouse = /spouse|mary|partner/i.test(fileName)
      const dob = isChild ? '06/02/2016' : isSpouse ? '11/08/1990' : '03/14/1988'
      // TIN stored as masked fact only — full value never placed on ordinary screens
      const last4 = isChild ? '4412' : isSpouse ? '7781' : '9021'
      const docLabel =
        kind === 'driver_license'
          ? 'Driver’s license'
          : kind === 'ssn_card'
            ? 'Social Security card'
            : 'Photo ID'
      return [
        fact(uid('f'), 'Document kind', docLabel, 0.97),
        fact(uid('f'), 'Full name', personName, 0.96),
        fact(uid('f'), 'Date of birth', dob, 0.94),
        fact(uid('f'), 'Tax ID (SSN/ITIN)', `***-**-${last4}`, kind === 'ssn_card' ? 0.96 : 0.9),
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
