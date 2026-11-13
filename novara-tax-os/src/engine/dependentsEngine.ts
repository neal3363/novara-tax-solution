/**
 * Dependent discovery, per-dependent interview facts, eligibility, and document checklist.
 * Never invent dependents from refund estimates or incomplete uploads.
 */

export type TinStatus = 'missing' | 'provided' | 'verified'
export type DepDocStatus = 'needed' | 'uploaded' | 'verified' | 'not_required' | 'recommended'

export type DependentRelationship =
  | 'son'
  | 'daughter'
  | 'stepson'
  | 'stepdaughter'
  | 'foster_child'
  | 'grandchild'
  | 'sibling'
  | 'niece_nephew'
  | 'parent'
  | 'other_relative'
  | 'unrelated'
  | 'child'
  | 'relative'

export interface DependentRecord {
  id: string
  fullLegalName: string
  /** YYYY-MM-DD when known */
  dateOfBirth: string
  /** Age on Dec 31 of tax year */
  age: number
  /** Last 4 of SSN/ITIN only — never render a full TIN on ordinary screens */
  tinLast4: string
  tinStatus: TinStatus
  relationship: DependentRelationship | ''
  monthsLivedWith: number | null
  isStudent: boolean | null
  isDisabled: boolean | null
  providedOwnSupport: boolean | null
  anotherMayClaim: boolean | null
  sharedCustody: boolean | null
  isCustodialParent: boolean | null
  interviewComplete: boolean
  /** Computed eligibility flags */
  qualifyingChild: boolean
  qualifyingRelative: boolean
  ctcEligible: boolean
  odcEligible: boolean
  eitcQualifyingChild: boolean
  cdccQualifyingPerson: boolean
  hohQualifyingPerson: boolean
}

export interface DependentDocRequirement {
  id: string
  dependentId: string
  dependentName: string
  name: string
  reason: string
  status: DepDocStatus
  requiredForFiling: boolean
  alternative?: string
}

export interface DependentDiscoveryState {
  /** Explicit answer to “any potential dependents?” */
  askedPotential: boolean
  hasPotentialDependents: boolean | null
  /** Explicit count answered (null = not asked) */
  countAnswered: boolean
  declaredCount: number | null
  discoveryComplete: boolean
  interviewComplete: boolean
}

const CHILD_RELATIONS: DependentRelationship[] = [
  'son',
  'daughter',
  'stepson',
  'stepdaughter',
  'foster_child',
  'grandchild',
  'sibling',
  'niece_nephew',
  'child',
]

export function maskTinLast4(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 4) return ''
  return digits.slice(-4)
}

/** Never return a full SSN — display helpers only. */
export function displayTin(dep: DependentRecord): string {
  if (dep.tinStatus === 'missing' || !dep.tinLast4) return 'Not provided'
  return `***-**-${dep.tinLast4}`
}

export function ageOnDec31(dob: string, taxYear: number): number {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return -1
  const [y, m, d] = dob.split('-').map(Number)
  let age = taxYear - y
  // birthday after Dec 31 of tax year can't happen; use Dec 31 as test date
  if (m > 12 || (m === 12 && d > 31)) return age
  // if birthday is after Dec 31 N/A; if born Jan 1 next year not in range
  // Standard: age at end of tax year
  const birthdayThisYear = new Date(taxYear, m - 1, d)
  const yearEnd = new Date(taxYear, 11, 31)
  if (birthdayThisYear > yearEnd) age -= 1
  // Actually if DOB month/day is after Dec 31 impossible; age = taxYear - birthYear if birthday <= Dec 31
  // Correct: if birthday has not occurred by Dec 31... it always has for calendar year end except leap edge
  return Math.max(0, taxYear - y - (m === 1 && d === 1 ? 0 : 0))
}

export function computeAgeFromDob(dob: string, taxYear: number): number {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return -1
  const [y, m, d] = dob.split('-').map(Number)
  // Age as of Dec 31 of tax year
  let age = taxYear - y
  // If birthday is after Dec 31 of tax year — impossible. If born late in year, still that age by Dec 31
  // Subtract 1 only if Dec 31 is before birthday in that year — never for Dec 31 end.
  const bornMonthDay = m * 100 + d
  if (1231 < bornMonthDay) age -= 1 // unreachable for valid dates
  return Math.max(0, age)
}

export function emptyDependent(index: number, _taxYear = 2025): DependentRecord {
  return {
    id: `dep-${index + 1}`,
    fullLegalName: '',
    dateOfBirth: '',
    age: -1,
    tinLast4: '',
    tinStatus: 'missing',
    relationship: '',
    monthsLivedWith: null,
    isStudent: null,
    isDisabled: null,
    providedOwnSupport: null,
    anotherMayClaim: null,
    sharedCustody: null,
    isCustodialParent: null,
    interviewComplete: false,
    qualifyingChild: false,
    qualifyingRelative: false,
    ctcEligible: false,
    odcEligible: false,
    eitcQualifyingChild: false,
    cdccQualifyingPerson: false,
    hohQualifyingPerson: false,
  }
}

export function evaluateDependent(dep: DependentRecord, taxYear: number): DependentRecord {
  const age = dep.dateOfBirth ? computeAgeFromDob(dep.dateOfBirth, taxYear) : dep.age
  const rel = dep.relationship
  const childRel = rel ? CHILD_RELATIONS.includes(rel as DependentRelationship) : false
  const months = dep.monthsLivedWith ?? 0
  const livedHalf = months > 6
  const anotherClaims = dep.anotherMayClaim === true
  const ownSupport = dep.providedOwnSupport === true
  const custodialOk = dep.sharedCustody !== true || dep.isCustodialParent === true

  // Qualifying child (simplified IRC §152(c) for demo)
  const under19 = age >= 0 && age < 19
  const studentUnder24 = age >= 0 && age < 24 && dep.isStudent === true
  const anyAgeDisabled = dep.isDisabled === true
  const ageOk = under19 || studentUnder24 || anyAgeDisabled
  const qualifyingChild =
    childRel &&
    ageOk &&
    livedHalf &&
    !ownSupport &&
    !anotherClaims &&
    custodialOk &&
    !!dep.fullLegalName &&
    age >= 0

  // Qualifying relative (simplified)
  const qualifyingRelative =
    !qualifyingChild &&
    !!rel &&
    !anotherClaims &&
    dep.providedOwnSupport === false &&
    months >= 0 &&
    !!dep.fullLegalName &&
    age >= 0

  const tinOk = dep.tinStatus === 'provided' || dep.tinStatus === 'verified'
  const ctcEligible = qualifyingChild && age < 17 && tinOk
  const odcEligible = (qualifyingChild && age >= 17 && tinOk) || (qualifyingRelative && tinOk)
  const eitcQualifyingChild = qualifyingChild && tinOk
  const cdccQualifyingPerson = (qualifyingChild && age < 13) || (dep.isDisabled === true && (qualifyingChild || qualifyingRelative))
  const hohQualifyingPerson = qualifyingChild || qualifyingRelative

  const needsStudent = age >= 17 && age < 24
  const needsDisabledProbe =
    age >= 19 ||
    rel === 'other_relative' ||
    rel === 'unrelated' ||
    rel === 'parent' ||
    rel === 'relative'
  const needsCustody = childRel
  const tinPath = true // tin handled via tinStatus
  const interviewComplete =
    !!dep.fullLegalName &&
    !!dep.dateOfBirth &&
    !!dep.relationship &&
    dep.monthsLivedWith !== null &&
    dep.anotherMayClaim !== null &&
    dep.providedOwnSupport !== null &&
    dep.tinStatus !== 'missing' &&
    tinPath &&
    (!needsStudent || dep.isStudent !== null) &&
    (!needsDisabledProbe || dep.isDisabled !== null) &&
    (!needsCustody || dep.sharedCustody !== null) &&
    (dep.sharedCustody !== true || dep.isCustodialParent !== null)

  return {
    ...dep,
    age,
    qualifyingChild,
    qualifyingRelative,
    ctcEligible,
    odcEligible,
    eitcQualifyingChild,
    cdccQualifyingPerson,
    hohQualifyingPerson,
    interviewComplete,
  }
}

export function getDiscoveryState(
  answers: Record<string, string | number | boolean | undefined>,
  dependents: DependentRecord[],
): DependentDiscoveryState {
  const potential = answers.potential_dependents
  const hasPotentialDependents =
    potential === 'yes' || potential === 'Yes' || potential === true
      ? true
      : potential === 'no' || potential === 'No' || potential === false
        ? false
        : null
  const askedPotential = hasPotentialDependents !== null

  let declaredCount: number | null = null
  const raw = answers.dependent_count
  if (typeof raw === 'number') declaredCount = raw
  else if (typeof raw === 'string' && raw !== '' && raw !== 'unresolved') {
    if (raw === '5+' || raw === 'more') declaredCount = 5
    else {
      const n = Number(raw)
      if (!Number.isNaN(n)) declaredCount = n
    }
  }
  const countAnswered = declaredCount !== null || hasPotentialDependents === false

  if (hasPotentialDependents === false) {
    return {
      askedPotential: true,
      hasPotentialDependents: false,
      countAnswered: true,
      declaredCount: 0,
      discoveryComplete: true,
      interviewComplete: true,
    }
  }

  const discoveryComplete = askedPotential && countAnswered && (declaredCount === 0 || declaredCount !== null)
  const expected = declaredCount ?? 0
  const interviewComplete =
    discoveryComplete &&
    (expected === 0 ||
      (dependents.length >= expected && dependents.slice(0, expected).every((d) => d.interviewComplete)))

  return {
    askedPotential,
    hasPotentialDependents,
    countAnswered,
    declaredCount,
    discoveryComplete: !!discoveryComplete,
    interviewComplete,
  }
}

export function dependentsReadyForVerifiedCredits(
  answers: Record<string, string | number | boolean | undefined>,
  dependents: DependentRecord[],
): boolean {
  const d = getDiscoveryState(answers, dependents)
  return d.discoveryComplete && d.interviewComplete
}

export function countCtcEligible(deps: DependentRecord[]) {
  return deps.filter((d) => d.ctcEligible).length
}

export function countOdcEligible(deps: DependentRecord[]) {
  return deps.filter((d) => d.odcEligible).length
}

export function countEitcQualifyingChildren(deps: DependentRecord[]) {
  return deps.filter((d) => d.eitcQualifyingChild).length
}

export function countCdccPersons(deps: DependentRecord[]) {
  return deps.filter((d) => d.cdccQualifyingPerson).length
}

export function hasHohQualifyingPerson(deps: DependentRecord[]) {
  return deps.some((d) => d.hohQualifyingPerson)
}

export type DependentQuestionKind = 'yesno' | 'choice' | 'number' | 'text' | 'date'

export interface DependentQuestion {
  id: string
  prompt: string
  kind: DependentQuestionKind
  choices?: string[]
  mapsTo: string
  /** Which dependent index (0-based), or -1 for household-level */
  dependentIndex: number
}

/** Next unanswered discovery / per-dependent question. */
export function nextDependentQuestion(
  answers: Record<string, string | number | boolean | undefined>,
  dependents: DependentRecord[],
): DependentQuestion | null {
  const discovery = getDiscoveryState(answers, dependents)

  if (!discovery.askedPotential) {
    return {
      id: 'potential_dependents',
      prompt: 'Do you have any children or other people who may qualify as your dependents?',
      kind: 'yesno',
      mapsTo: 'potential_dependents',
      dependentIndex: -1,
    }
  }

  if (discovery.hasPotentialDependents === false) return null

  if (!discovery.countAnswered) {
    return {
      id: 'dependent_count',
      prompt: 'How many children or other potential dependents do you have?',
      kind: 'choice',
      choices: ['0', '1', '2', '3', '4', '5+'],
      mapsTo: 'dependent_count',
      dependentIndex: -1,
    }
  }

  const count = discovery.declaredCount ?? 0
  if (count === 0) return null

  for (let i = 0; i < count; i++) {
    const dep = dependents[i] ?? emptyDependent(i)
    const label = dep.fullLegalName || `Dependent ${i + 1}`

    if (!dep.fullLegalName) {
      return {
        id: `dep_${i}_name`,
        prompt: `What is the full legal name of dependent ${i + 1}?`,
        kind: 'text',
        mapsTo: `dep_${i}_name`,
        dependentIndex: i,
      }
    }
    if (!dep.dateOfBirth) {
      return {
        id: `dep_${i}_dob`,
        prompt: `What is ${label}'s date of birth? (YYYY-MM-DD)`,
        kind: 'date',
        mapsTo: `dep_${i}_dob`,
        dependentIndex: i,
      }
    }
    // TIN path: never re-ask once chosen — route to last4 or continue
    const tinPath = answers[`dep_${i}_tin_path`]
    if (!tinPath && dep.tinStatus === 'missing') {
      return {
        id: `dep_${i}_tin`,
        prompt: `Do you have ${label}'s Social Security number or ITIN? (Enter last 4 only on the next screen, or confirm you will upload ID.)`,
        kind: 'choice',
        choices: ['I will enter last 4 now', 'I will upload ID documentation', 'Not available yet'],
        mapsTo: `dep_${i}_tin_path`,
        dependentIndex: i,
      }
    }
    if (tinPath === 'I will enter last 4 now' && !dep.tinLast4) {
      return {
        id: `dep_${i}_tin_last4`,
        prompt: `Enter only the last 4 digits of ${label}'s SSN/ITIN (full number is never shown on screen).`,
        kind: 'text',
        mapsTo: `dep_${i}_tin_last4`,
        dependentIndex: i,
      }
    }
    if (!dep.relationship) {
      return {
        id: `dep_${i}_rel`,
        prompt: `What is ${label}'s relationship to you?`,
        kind: 'choice',
        choices: [
          'Son',
          'Daughter',
          'Stepson',
          'Stepdaughter',
          'Foster child',
          'Grandchild',
          'Sibling',
          'Niece/Nephew',
          'Parent',
          'Other relative',
          'Unrelated',
        ],
        mapsTo: `dep_${i}_relationship`,
        dependentIndex: i,
      }
    }
    if (dep.monthsLivedWith === null) {
      return {
        id: `dep_${i}_months`,
        prompt: `How many months did ${label} live with you during the tax year?`,
        kind: 'choice',
        choices: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        mapsTo: `dep_${i}_months`,
        dependentIndex: i,
      }
    }
    if (dep.sharedCustody === null && CHILD_RELATIONS.includes(dep.relationship as DependentRelationship)) {
      return {
        id: `dep_${i}_custody`,
        prompt: `Do you share custody of ${label} with another parent or guardian?`,
        kind: 'yesno',
        mapsTo: `dep_${i}_shared_custody`,
        dependentIndex: i,
      }
    }
    if (dep.sharedCustody === true && dep.isCustodialParent === null) {
      return {
        id: `dep_${i}_custodial`,
        prompt: `Are you the custodial parent (the child lived with you more nights)?`,
        kind: 'yesno',
        mapsTo: `dep_${i}_custodial`,
        dependentIndex: i,
      }
    }
    if (dep.age >= 17 && dep.age < 24 && dep.isStudent === null) {
      return {
        id: `dep_${i}_student`,
        prompt: `Was ${label} a full-time student for at least 5 months of the year?`,
        kind: 'yesno',
        mapsTo: `dep_${i}_student`,
        dependentIndex: i,
      }
    }
    if (dep.isDisabled === null && (dep.age >= 19 || dep.relationship === 'other_relative' || dep.relationship === 'unrelated' || dep.relationship === 'parent')) {
      return {
        id: `dep_${i}_disabled`,
        prompt: `Is ${label} permanently and totally disabled?`,
        kind: 'yesno',
        mapsTo: `dep_${i}_disabled`,
        dependentIndex: i,
      }
    }
    if (dep.providedOwnSupport === null) {
      return {
        id: `dep_${i}_support`,
        prompt: `Did ${label} provide more than half of their own support?`,
        kind: 'yesno',
        mapsTo: `dep_${i}_own_support`,
        dependentIndex: i,
      }
    }
    if (dep.anotherMayClaim === null) {
      return {
        id: `dep_${i}_another`,
        prompt: `Could someone else claim ${label} as a dependent on their tax return?`,
        kind: 'yesno',
        mapsTo: `dep_${i}_another_claim`,
        dependentIndex: i,
      }
    }
  }

  return null
}

const REL_MAP: Record<string, DependentRelationship> = {
  son: 'son',
  daughter: 'daughter',
  stepson: 'stepson',
  stepdaughter: 'stepdaughter',
  'foster child': 'foster_child',
  grandchild: 'grandchild',
  sibling: 'sibling',
  'niece/nephew': 'niece_nephew',
  parent: 'parent',
  'other relative': 'other_relative',
  unrelated: 'unrelated',
  child: 'child',
  relative: 'relative',
}

function ensureSlot(deps: DependentRecord[], index: number): DependentRecord[] {
  const next = [...deps]
  while (next.length <= index) next.push(emptyDependent(next.length))
  return next
}

export function applyDependentAnswer(
  answers: Record<string, string | number | boolean | undefined>,
  dependents: DependentRecord[],
  mapsTo: string,
  value: string | number | boolean,
  taxYear = 2025,
): { answers: Record<string, string | number | boolean | undefined>; dependents: DependentRecord[] } {
  const nextAnswers = { ...answers, [mapsTo]: value }
  let nextDeps = [...dependents]

  if (mapsTo === 'potential_dependents') {
    const yes = value === 'yes' || value === 'Yes' || value === true
    nextAnswers.has_dependents = yes ? 'yes' : 'no'
    nextAnswers.has_child = yes ? nextAnswers.has_child : 'no'
    if (!yes) {
      nextAnswers.dependent_count = 0
      nextDeps = []
    }
    return { answers: nextAnswers, dependents: nextDeps.map((d) => evaluateDependent(d, taxYear)) }
  }

  if (mapsTo === 'dependent_count') {
    let n = 0
    if (value === '5+' || value === 'more') n = 5
    else n = typeof value === 'number' ? value : Number(value) || 0
    nextAnswers.dependent_count = n
    nextAnswers.has_dependents = n > 0 ? 'yes' : 'no'
    nextAnswers.potential_dependents = n > 0 ? 'yes' : 'no'
    nextDeps = Array.from({ length: n }, (_, i) => evaluateDependent(nextDeps[i] ?? emptyDependent(i), taxYear))
    return { answers: nextAnswers, dependents: nextDeps }
  }

  const m = /^dep_(\d+)_(.+)$/.exec(mapsTo)
  if (!m) return { answers: nextAnswers, dependents: nextDeps.map((d) => evaluateDependent(d, taxYear)) }

  const idx = Number(m[1])
  const field = m[2]
  nextDeps = ensureSlot(nextDeps, idx)
  let dep = { ...nextDeps[idx] }

  switch (field) {
    case 'name': {
      const name = String(value).trim()
      // Ignore blank submits so Answer cannot create an empty "saved" dependent name
      if (name) dep.fullLegalName = name
      else delete nextAnswers[mapsTo]
      break
    }
    case 'dob': {
      const raw = String(value).trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        delete nextAnswers[mapsTo]
        break
      }
      dep.dateOfBirth = raw
      dep.age = computeAgeFromDob(raw, taxYear)
      break
    }
    case 'tin_path': {
      const v = String(value)
      if (v.includes('upload')) dep.tinStatus = 'provided' // will verify via vault match
      else if (v.includes('Not available')) dep.tinStatus = 'missing'
      else dep.tinStatus = 'missing' // waiting for last4
      break
    }
    case 'tin_last4': {
      const last4 = maskTinLast4(String(value))
      dep.tinLast4 = last4
      dep.tinStatus = last4.length === 4 ? 'provided' : 'missing'
      break
    }
    case 'relationship': {
      const key = String(value).toLowerCase()
      dep.relationship = REL_MAP[key] ?? 'other_relative'
      break
    }
    case 'months':
      dep.monthsLivedWith = typeof value === 'number' ? value : Number(value) || 0
      break
    case 'shared_custody':
      dep.sharedCustody = value === 'yes' || value === 'Yes' || value === true
      break
    case 'custodial':
      dep.isCustodialParent = value === 'yes' || value === 'Yes' || value === true
      break
    case 'student':
      dep.isStudent = value === 'yes' || value === 'Yes' || value === true
      break
    case 'disabled':
      dep.isDisabled = value === 'yes' || value === 'Yes' || value === true
      break
    case 'own_support':
      dep.providedOwnSupport = value === 'yes' || value === 'Yes' || value === true
      break
    case 'another_claim':
      dep.anotherMayClaim = value === 'yes' || value === 'Yes' || value === true
      break
    default:
      break
  }

  nextDeps[idx] = evaluateDependent(dep, taxYear)
  // Sync legacy flags from evaluated dependents
  const anyChild = nextDeps.some((d) => d.qualifyingChild || d.ctcEligible || (d.age >= 0 && d.age < 17))
  const anyDep = nextDeps.length > 0
  nextAnswers.has_dependents = anyDep ? 'yes' : nextAnswers.has_dependents
  nextAnswers.has_child = anyChild ? 'yes' : nextAnswers.has_child === 'yes' ? 'yes' : 'no'

  return { answers: nextAnswers, dependents: nextDeps }
}

export function buildDependentDocumentChecklist(
  dependents: DependentRecord[],
  answers: Record<string, string | number | boolean | undefined>,
  hasChildcare: boolean,
  vaultHasIdDoc: boolean,
  vaultHasResidency: boolean,
  vaultHasStudent: boolean,
  vaultHasChildcare: boolean,
): DependentDocRequirement[] {
  const discovery = getDiscoveryState(answers, dependents)
  if (!discovery.hasPotentialDependents || (discovery.declaredCount ?? 0) === 0) return []

  const items: DependentDocRequirement[] = []
  dependents.forEach((dep, i) => {
    if (!dep.fullLegalName && !dep.dateOfBirth) return
    const name = dep.fullLegalName || `Dependent ${i + 1}`

    let ssnStatus: DepDocStatus = 'needed'
    if (dep.tinStatus === 'verified' || vaultHasIdDoc) ssnStatus = vaultHasIdDoc && dep.tinStatus !== 'verified' ? 'uploaded' : dep.tinStatus === 'verified' ? 'verified' : 'uploaded'
    if (dep.tinStatus === 'provided' && !vaultHasIdDoc) ssnStatus = 'recommended'

    items.push({
      id: `${dep.id}-ssn`,
      dependentId: dep.id,
      dependentName: name,
      name: 'Social Security / ITIN verification',
      reason: 'Required to claim dependent-related credits with a valid TIN.',
      status: dep.tinStatus === 'verified' ? 'verified' : ssnStatus,
      requiredForFiling: true,
      alternative: 'ITIN letter or other IRS-acceptable identification',
    })

    if (dep.monthsLivedWith !== null && dep.monthsLivedWith <= 6 || dep.sharedCustody) {
      items.push({
        id: `${dep.id}-residency`,
        dependentId: dep.id,
        dependentName: name,
        name: 'Residency / custody records',
        reason: 'Supports residency and custodial-parent tests when custody is shared or months are limited.',
        status: vaultHasResidency ? 'uploaded' : 'recommended',
        requiredForFiling: false,
        alternative: 'School or medical records showing address',
      })
    }

    if (dep.isStudent === true || (dep.age >= 17 && dep.age < 24)) {
      items.push({
        id: `${dep.id}-student`,
        dependentId: dep.id,
        dependentName: name,
        name: 'Student verification',
        reason: 'Supports full-time student status for qualifying-child age rules.',
        status: vaultHasStudent ? 'uploaded' : 'recommended',
        requiredForFiling: false,
      })
    }

    if (hasChildcare && dep.cdccQualifyingPerson) {
      items.push({
        id: `${dep.id}-childcare`,
        dependentId: dep.id,
        dependentName: name,
        name: 'Childcare records',
        reason: 'Substantiates care expenses for this qualifying person.',
        status: vaultHasChildcare ? 'uploaded' : 'needed',
        requiredForFiling: true,
      })
    }
  })

  return items
}

/** Migrate legacy {name,age,relationship} stubs into DependentRecord (incomplete until interviewed). */
export function coerceDependents(
  raw: Array<Partial<DependentRecord> & { name?: string; age?: number; relationship?: string }>,
  taxYear: number,
): DependentRecord[] {
  return raw.map((r, i) => {
    const base = emptyDependent(i, taxYear)
    const merged: DependentRecord = {
      ...base,
      id: r.id ?? base.id,
      fullLegalName: r.fullLegalName || r.name || '',
      dateOfBirth: r.dateOfBirth || '',
      age: typeof r.age === 'number' ? r.age : base.age,
      tinLast4: r.tinLast4 || '',
      tinStatus: r.tinStatus || 'missing',
      relationship: (r.relationship as DependentRelationship) || '',
      monthsLivedWith: r.monthsLivedWith ?? null,
      isStudent: r.isStudent ?? null,
      isDisabled: r.isDisabled ?? null,
      providedOwnSupport: r.providedOwnSupport ?? null,
      anotherMayClaim: r.anotherMayClaim ?? null,
      sharedCustody: r.sharedCustody ?? null,
      isCustodialParent: r.isCustodialParent ?? null,
      interviewComplete: false,
      qualifyingChild: false,
      qualifyingRelative: false,
      ctcEligible: false,
      odcEligible: false,
      eitcQualifyingChild: false,
      cdccQualifyingPerson: false,
      hohQualifyingPerson: false,
    }
    return evaluateDependent(merged, taxYear)
  })
}
