/**
 * Document-first household intake:
 * UPLOAD → EXTRACT → IDENTIFY PRIMARY → CONFIRM RELATIONSHIPS →
 * DISCOVER MISSING → FILING STATUS → BENEFITS
 *
 * Never assume relationship or eligibility from name, gender, age, or docs alone.
 * Sensitive TINs are fingerprinted + last-four only (demo; not recoverable encryption) and masked on ordinary screens.
 */

import type { DocType, DocumentRecord } from '../data/types'
import type { DependentRecord, DependentRelationship } from './dependentsEngine'
import { emptyDependent, evaluateDependent, maskTinLast4 } from './dependentsEngine'
import type { TaxpayerProfile } from './benefitOptimizer'
import { credentialFingerprint } from './credentials'

export type IntakePhase =
  | 'upload'
  | 'extract_review'
  | 'identify_primary'
  | 'confirm_relationships'
  | 'discover_missing'
  | 'interview'
  | 'missing_docs'
  | 'review'

export type HouseholdRelationChoice =
  | 'spouse'
  | 'daughter'
  | 'son'
  | 'stepchild'
  | 'parent'
  | 'other_relative'
  | 'unrelated'
  | 'not_on_return'

export type VaultCategory =
  | 'primary_taxpayer'
  | 'spouse'
  | 'dependents'
  | 'income'
  | 'credits_deductions'
  | 'business'
  | 'filing_authorizations'
  | 'other'

export interface ExtractedPerson {
  id: string
  fullLegalName: string
  dateOfBirth?: string
  /** Irreversible TIN fingerprint — never store or render full SSN */
  tinFingerprint?: string
  tinLast4?: string
  address?: string
  sourceDocIds: string[]
  sourceLabels: string[]
  confidence: number
  needsConfirmation: boolean
  /** User-confirmed relationship to primary (null until asked) */
  relationToPrimary: HouseholdRelationChoice | null
  /** May qualify as dependent — asked after relationship, never assumed */
  mayQualifyDependent: boolean | null
  onReturn: boolean
}

export interface DocumentRequestItem {
  id: string
  label: string
  detail: string
  tier: 'required' | 'recommended'
  matches: DocType[] | 'any_id'
  vaultCategory: VaultCategory
}

export interface FilingStatusRecommendation {
  recommended: 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss' | 'unknown'
  alternatives: string[]
  rationale: string
  questionsNeeded: string[]
}

export interface HouseholdIntakeState {
  phase: IntakePhase
  candidates: ExtractedPerson[]
  primaryPersonId: string | null
  missingHouseholdAsked: boolean
  missingHouseholdAnswer: 'yes' | 'no' | null
  filingRecommendation: FilingStatusRecommendation | null
}

export const RELATIONSHIP_CHOICES: { value: HouseholdRelationChoice; label: string }[] = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'son', label: 'Son' },
  { value: 'stepchild', label: 'Stepchild' },
  { value: 'parent', label: 'Parent' },
  { value: 'other_relative', label: 'Other relative' },
  { value: 'unrelated', label: 'Unrelated person' },
  { value: 'not_on_return', label: 'Not part of this tax return' },
]

export const DOCUMENT_REQUESTS: DocumentRequestItem[] = [
  {
    id: 'req-id',
    label: 'Driver’s license or accepted photo ID',
    detail: 'Required to identify the primary taxpayer.',
    tier: 'required',
    matches: 'any_id',
    vaultCategory: 'primary_taxpayer',
  },
  {
    id: 'req-ssn',
    label: 'Social Security card or tax ID documentation',
    detail: 'Required for accurate TIN matching on the return.',
    tier: 'required',
    matches: 'any_id',
    vaultCategory: 'primary_taxpayer',
  },
  {
    id: 'req-w2',
    label: 'W-2 wage statements',
    detail: 'Required when you had wages. Upload each employer’s form.',
    tier: 'required',
    matches: ['W-2'],
    vaultCategory: 'income',
  },
  {
    id: 'req-1099',
    label: '1099 income documents',
    detail: 'Required when you received nonemployee or interest income.',
    tier: 'recommended',
    matches: ['1099-NEC', '1099-INT'],
    vaultCategory: 'income',
  },
  {
    id: 'rec-spouse-id',
    label: 'Spouse identification and tax ID',
    detail: 'Recommended if married — confirm relationship before applying MFJ.',
    tier: 'recommended',
    matches: 'any_id',
    vaultCategory: 'spouse',
  },
  {
    id: 'rec-child-ssn',
    label: 'Children’s Social Security information',
    detail: 'Recommended for each person who may be claimed as a dependent.',
    tier: 'recommended',
    matches: 'any_id',
    vaultCategory: 'dependents',
  },
  {
    id: 'rec-birth',
    label: 'Birth certificates or relationship documentation',
    detail: 'Recommended when relationship or age must be supported for credits.',
    tier: 'recommended',
    matches: 'any_id',
    vaultCategory: 'dependents',
  },
  {
    id: 'rec-other',
    label: 'Other tax documents (1098, childcare, tuition, prior return)',
    detail: 'Upload if you have them — you can continue without optional files.',
    tier: 'recommended',
    matches: ['1098', '1098-T', '1098-E', 'Childcare', 'Property Tax', 'Prior Return', 'Other'],
    vaultCategory: 'credits_deductions',
  },
]

export function emptyHouseholdIntake(): HouseholdIntakeState {
  return {
    phase: 'upload',
    candidates: [],
    primaryPersonId: null,
    missingHouseholdAsked: false,
    missingHouseholdAnswer: null,
    filingRecommendation: null,
  }
}

export function maskSensitiveFactValue(label: string, value: string): string {
  const l = label.toLowerCase()
  if (l.includes('ssn') || l.includes('itin') || l.includes('tax id') || l.includes('tin')) {
    const last4 = maskTinLast4(value)
    return last4 ? `***-**-${last4}` : '••••'
  }
  return value
}

export function encryptTinIfPresent(raw: string | undefined): { tinFingerprint?: string; tinLast4?: string } {
  if (!raw) return {}
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 4) return {}
  return {
    tinFingerprint: credentialFingerprint(digits),
    tinLast4: digits.slice(-4),
  }
}

/** Classify vault folder for a document */
export function vaultCategoryForDoc(doc: DocumentRecord, intake: HouseholdIntakeState): VaultCategory {
  if (doc.type === 'ID') {
    const nameFact = doc.facts.find((f) => /full name|employee name|^name$/i.test(f.label))
    const person = intake.candidates.find(
      (c) => nameFact && c.fullLegalName.toLowerCase() === nameFact.value.toLowerCase(),
    )
    if (person?.id === intake.primaryPersonId) return 'primary_taxpayer'
    if (person?.relationToPrimary === 'spouse') return 'spouse'
    if (person && person.relationToPrimary && person.relationToPrimary !== 'not_on_return') return 'dependents'
    // Default ID / DL / SS card from the front page → primary taxpayer vault
    return 'primary_taxpayer'
  }
  if (doc.type === 'W-2' || doc.type === '1099-NEC' || doc.type === '1099-INT') return 'income'
  if (['1098', '1098-T', '1098-E', 'Childcare', 'Property Tax'].includes(doc.type)) return 'credits_deductions'
  if (doc.type === 'P&L' || doc.type === 'Trial Balance') return 'business'
  if (doc.type === 'Prior Return') return 'filing_authorizations'
  if (doc.type === 'Bank Statement') return 'other'
  return 'other'
}

function titleCaseName(raw: string): string {
  return raw
    .replace(/[_\-.]+/g, ' ')
    .replace(/\b(ssn|id|license|passport|birth|cert|card|w2|w-2|1099|doc|pdf|png|jpg)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function parseNameFromFilename(fileName: string): string | null {
  const base = fileName.replace(/\.[^.]+$/, '')
  // Patterns: ID_Mary_Johnson, ssn-emma-blake, birth_cert_liam, license_jordan
  const m = base.match(
    /(?:id|license|passport|ssn|social|birth|cert|dependent|spouse|child)[_\-\s]+(.+)/i,
  )
  if (m) {
    const name = titleCaseName(m[1])
    if (name.split(' ').length >= 1 && name.length > 2) return name
  }
  return null
}

function personKey(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * Build household candidates from extracted document facts.
 * Does NOT assign relationships — those require explicit taxpayer confirmation.
 */
export function extractPeopleFromDocuments(
  documents: DocumentRecord[],
  fallbackPrimaryName: string,
): ExtractedPerson[] {
  const byKey = new Map<string, ExtractedPerson>()

  function upsert(partial: Omit<ExtractedPerson, 'relationToPrimary' | 'mayQualifyDependent' | 'onReturn'>) {
    const key = personKey(partial.fullLegalName)
    if (!key) return
    const existing = byKey.get(key)
    if (existing) {
      byKey.set(key, {
        ...existing,
        dateOfBirth: existing.dateOfBirth || partial.dateOfBirth,
        tinFingerprint: existing.tinFingerprint || partial.tinFingerprint,
        tinLast4: existing.tinLast4 || partial.tinLast4,
        address: existing.address || partial.address,
        sourceDocIds: Array.from(new Set([...existing.sourceDocIds, ...partial.sourceDocIds])),
        sourceLabels: Array.from(new Set([...existing.sourceLabels, ...partial.sourceLabels])),
        confidence: Math.max(existing.confidence, partial.confidence),
        needsConfirmation: existing.needsConfirmation || partial.needsConfirmation,
      })
    } else {
      byKey.set(key, {
        ...partial,
        relationToPrimary: null,
        mayQualifyDependent: null,
        onReturn: true,
      })
    }
  }

  documents.forEach((doc) => {
    if (doc.status === 'scanning') return
    const nameFact = doc.facts.find((f) => /full name|employee name|name/i.test(f.label))
    const dobFact = doc.facts.find((f) => /birth|dob/i.test(f.label))
    const tinFact = doc.facts.find((f) => /ssn|itin|tax id|tin/i.test(f.label))
    const addrFact = doc.facts.find((f) => /address/i.test(f.label))
    const fromFile = parseNameFromFilename(doc.name)

    const displayName = nameFact?.value || fromFile
    if (!displayName) return

    const tin = encryptTinIfPresent(tinFact?.value)
    const conf = Math.min(
      ...[nameFact?.confidence, dobFact?.confidence, doc.confidence].filter((n): n is number => n != null),
      doc.confidence || 0.9,
    )

    upsert({
      id: `person-${personKey(displayName)}`,
      fullLegalName: displayName,
      dateOfBirth: dobFact?.value?.includes('/')
        ? toIsoDob(dobFact.value)
        : dobFact?.value,
      ...tin,
      address: addrFact?.value,
      sourceDocIds: [doc.id],
      sourceLabels: [doc.type, doc.name],
      confidence: conf,
      needsConfirmation: conf < 0.9 || !nameFact || !!tinFact,
    })
  })

  if (byKey.size === 0 && fallbackPrimaryName) {
    upsert({
      id: `person-${personKey(fallbackPrimaryName)}`,
      fullLegalName: fallbackPrimaryName,
      sourceDocIds: [],
      sourceLabels: ['profile'],
      confidence: 0.5,
      needsConfirmation: true,
    })
  }

  return Array.from(byKey.values()).sort((a, b) => b.confidence - a.confidence)
}

function toIsoDob(us: string): string {
  const m = us.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return us
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

export function nextRelationshipPrompt(intake: HouseholdIntakeState): {
  person: ExtractedPerson
  prompt: string
} | null {
  if (!intake.primaryPersonId) return null
  const pending = intake.candidates.find(
    (c) => c.id !== intake.primaryPersonId && c.relationToPrimary === null && c.onReturn,
  )
  if (!pending) return null
  return {
    person: pending,
    prompt: `Who is ${pending.fullLegalName} to you?`,
  }
}

export function nextDependentQualifyPrompt(intake: HouseholdIntakeState): {
  person: ExtractedPerson
  prompt: string
} | null {
  if (!intake.primaryPersonId) return null
  const pending = intake.candidates.find(
    (c) =>
      c.id !== intake.primaryPersonId &&
      c.onReturn &&
      c.relationToPrimary &&
      c.relationToPrimary !== 'spouse' &&
      c.relationToPrimary !== 'not_on_return' &&
      c.mayQualifyDependent === null,
  )
  if (!pending) return null
  return {
    person: pending,
    prompt: `May ${pending.fullLegalName} qualify as your dependent on this tax return?`,
  }
}

export function relationshipsComplete(intake: HouseholdIntakeState): boolean {
  if (!intake.primaryPersonId) return false
  const others = intake.candidates.filter((c) => c.id !== intake.primaryPersonId && c.onReturn)
  return others.every(
    (c) =>
      c.relationToPrimary !== null &&
      (c.relationToPrimary === 'spouse' ||
        c.relationToPrimary === 'not_on_return' ||
        c.mayQualifyDependent !== null),
  )
}

/** Map confirmed household into dependents array — only after explicit answers */
export function applyHouseholdToProfile(
  profile: TaxpayerProfile,
  intake: HouseholdIntakeState,
  taxYear: number,
): TaxpayerProfile {
  const spouse = intake.candidates.find((c) => c.relationToPrimary === 'spouse' && c.onReturn)
  const depCandidates = intake.candidates.filter(
    (c) =>
      c.id !== intake.primaryPersonId &&
      c.onReturn &&
      c.relationToPrimary &&
      c.relationToPrimary !== 'spouse' &&
      c.relationToPrimary !== 'not_on_return' &&
      c.mayQualifyDependent === true,
  )

  const dependents: DependentRecord[] = depCandidates.map((p, i) => {
    const rel = mapRelation(p.relationToPrimary!)
    let dep = emptyDependent(i, taxYear)
    dep = {
      ...dep,
      id: `dep-intake-${i + 1}`,
      fullLegalName: p.fullLegalName,
      dateOfBirth: p.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(p.dateOfBirth) ? p.dateOfBirth : '',
      tinLast4: p.tinLast4 ?? '',
      tinStatus: p.tinLast4 ? 'provided' : 'missing',
      relationship: rel,
    }
    if (dep.dateOfBirth) {
      const age = Number(taxYear) - Number(dep.dateOfBirth.slice(0, 4))
      dep = { ...dep, age: Number.isFinite(age) ? age : -1 }
    }
    return evaluateDependent(dep, taxYear)
  })

  const answers = { ...profile.answers }
  const hasDeps = dependents.length > 0 || intake.missingHouseholdAnswer === 'yes'
  answers.potential_dependents = hasDeps ? 'yes' : 'no'
  answers.has_dependents = hasDeps ? 'yes' : 'no'
  answers.dependent_count = dependents.length
  // Sync once so benefit discovery does not re-ask "any dependents?"
  if (dependents.some((d) => d.age >= 0 && d.age < 17)) answers.has_child = 'yes'
  else if (dependents.length > 0 && dependents.every((d) => d.age >= 17)) answers.has_child = 'no'
  else if (!hasDeps) answers.has_child = 'no'
  if (spouse) {
    answers.married_dec31 = 'yes'
  }

  return {
    ...profile,
    dependents,
    answers,
    // Filing status still recommended/confirmed via interview — do not auto-set MFJ from docs alone
  }
}

function mapRelation(r: HouseholdRelationChoice): DependentRelationship {
  switch (r) {
    case 'daughter':
      return 'daughter'
    case 'son':
      return 'son'
    case 'stepchild':
      return 'stepson'
    case 'parent':
      return 'parent'
    case 'other_relative':
      return 'other_relative'
    case 'unrelated':
      return 'unrelated'
    default:
      return 'relative'
  }
}

export function recommendFilingStatus(intake: HouseholdIntakeState): FilingStatusRecommendation {
  const spouse = intake.candidates.some((c) => c.relationToPrimary === 'spouse' && c.onReturn)
  const hasDep = intake.candidates.some(
    (c) => c.mayQualifyDependent === true && c.relationToPrimary && c.relationToPrimary !== 'spouse',
  )

  if (spouse) {
    return {
      recommended: 'mfj',
      alternatives: ['mfs'],
      rationale:
        'A spouse was confirmed on this return. Married Filing Jointly is often advantageous, but we will ask whether you lived apart or prefer Married Filing Separately.',
      questionsNeeded: ['married_filing_plan'],
    }
  }
  if (hasDep) {
    return {
      recommended: 'hoh',
      alternatives: ['single'],
      rationale:
        'You confirmed a potential dependent and no spouse on this return. Head of Household may apply if you paid more than half the cost of keeping up a home — we will confirm.',
      questionsNeeded: ['has_qualifying_person', 'maintained_home'],
    }
  }
  return {
    recommended: 'single',
    alternatives: ['hoh'],
    rationale: 'No spouse confirmed and no dependents confirmed yet. Single is the default until household facts change.',
    questionsNeeded: [],
  }
}

export function outstandingDocumentRequests(
  documents: DocumentRecord[],
  intake: HouseholdIntakeState,
): DocumentRequestItem[] {
  const types = new Set(documents.map((d) => d.type))
  const hasId = documents.some((d) => d.type === 'ID')
  return DOCUMENT_REQUESTS.filter((req) => {
    if (req.matches === 'any_id') {
      // Required ID/SSN: satisfied by any ID once present; still show recommended spouse/child until household confirmed
      if (req.id === 'req-id' || req.id === 'req-ssn') return !hasId
      if (req.id === 'rec-spouse-id') {
        const wantsSpouse = intake.candidates.some((c) => c.relationToPrimary === 'spouse')
        return wantsSpouse && !hasId // simplified — recommend extra spouse ID if spouse confirmed
      }
      if (req.id === 'rec-child-ssn' || req.id === 'rec-birth') {
        return intake.candidates.some((c) => c.mayQualifyDependent === true)
      }
      return false
    }
    const matched = req.matches.some((t) => types.has(t))
    if (matched) return false
    // Required W-2 only if wages expected — keep as outstanding when none uploaded
    if (req.tier === 'required' && req.id === 'req-w2') return !types.has('W-2')
    if (req.tier === 'recommended') return !matched
    return !matched
  })
}

export function docsAlreadySatisfied(documents: DocumentRecord[], req: DocumentRequestItem): boolean {
  if (req.matches === 'any_id') return documents.some((d) => d.type === 'ID' && d.status !== 'scanning')
  return documents.some((d) => req.matches.includes(d.type) && (d.status === 'extracted' || d.status === 'verified' || d.status === 'needs_review'))
}
