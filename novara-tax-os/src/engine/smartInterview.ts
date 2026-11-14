import type { DocumentRecord } from '../data/types'
import {
  applyAnswer,
  nextInterviewQuestions,
  runBenefitOptimization,
  type TaxpayerProfile,
} from './benefitOptimizer'

export type InterviewPhase = 'upload' | 'confirm' | 'filing_status' | 'benefits' | 'calculation' | 'review' | 'done'

export interface ConfirmedField {
  id: string
  label: string
  value: string
  source: string
  docId?: string
  factId?: string
  confirmed: boolean
  needsAttention: boolean
}

export interface SmartTurn {
  id: string
  phase: 'filing_status' | 'benefits'
  prompt: string
  kind: 'yesno' | 'choice' | 'number' | 'text' | 'date'
  choices?: string[]
  mapsTo: string
  aiLead: string
}

export interface InterviewChatMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  at: string
}

function parseMoney(value: string): number {
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Pull reusable facts from uploaded docs so we never re-ask for them. */
export function extractConfirmedFields(documents: DocumentRecord[]): ConfirmedField[] {
  const fields: ConfirmedField[] = []
  documents.forEach((d) => {
    d.facts.forEach((f) => {
      fields.push({
        id: `${d.id}:${f.id}`,
        label: f.label,
        value: f.value,
        source: `${d.type} · ${d.name} · p.${f.sourcePage}`,
        docId: d.id,
        factId: f.id,
        confirmed: f.verified,
        needsAttention: !f.verified || f.confidence < 0.9 || d.status === 'needs_review',
      })
    })
  })
  return fields
}

/** Apply extracted document facts into the working tax profile (once). */
export function syncProfileFromDocuments(profile: TaxpayerProfile, documents: DocumentRecord[]): TaxpayerProfile {
  let next = { ...profile, answers: { ...profile.answers } }
  let wages = 0
  let withholding = 0
  let se = 0
  let interest = 0
  let mortgage = 0
  let propertyTax = 0
  let tuition = 0
  let studentLoan = 0
  let childcare = 0
  let hasId = false
  let hasW2 = false
  let has1099 = false

  documents.forEach((d) => {
    if (d.type === 'ID') {
      hasId = true
      // Front-page DL / SS card / photo ID → Personal tab fields (masked TIN only).
      d.facts.forEach((f) => {
        if (/^full name$/i.test(f.label) && typeof f.value === 'string' && f.value.trim() && !next.answers.full_name) {
          next.answers.full_name = f.value.trim()
        }
        if (/date of birth|dob/i.test(f.label) && typeof f.value === 'string' && f.value.trim() && !next.answers.date_of_birth) {
          const raw = f.value.trim()
          const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
          next.answers.date_of_birth = mdy
            ? `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
            : raw
        }
        if (/tax id|ssn|itin/i.test(f.label) && typeof f.value === 'string' && !next.answers.ssn_last4) {
          const last4 = f.value.replace(/\D/g, '').slice(-4)
          if (last4.length === 4) next.answers.ssn_last4 = last4
        }
        if (/^address$/i.test(f.label) && typeof f.value === 'string' && f.value.trim() && !next.answers.address) {
          next.answers.address = f.value.trim()
        }
      })
    }
    if (d.type === 'W-2') {
      hasW2 = true
      d.facts.forEach((f) => {
        // W-2 fills personal + wages so users are almost done after upload.
        if (/employee name/i.test(f.label) && typeof f.value === 'string' && f.value.trim() && !next.answers.full_name) {
          next.answers.full_name = f.value.trim()
        }
        if (/employee ssn|ssn \(last 4\)|tax id/i.test(f.label) && typeof f.value === 'string' && !next.answers.ssn_last4) {
          const last4 = f.value.replace(/\D/g, '').slice(-4)
          if (last4.length === 4) next.answers.ssn_last4 = last4
        }
        if (/wage/i.test(f.label)) wages += parseMoney(f.value)
        if (/withheld|withholding/i.test(f.label)) withholding += parseMoney(f.value)
      })
    }
    if (d.type === '1099-NEC') {
      has1099 = true
      d.facts.forEach((f) => {
        if (/compensation|income/i.test(f.label)) se += parseMoney(f.value)
      })
    }
    if (d.type === '1099-INT') {
      has1099 = true
      d.facts.forEach((f) => {
        if (/interest|income/i.test(f.label)) interest += parseMoney(f.value)
      })
    }
    if (d.type === '1098') {
      d.facts.forEach((f) => {
        if (/mortgage interest/i.test(f.label) || (/mortgage|interest/i.test(f.label) && !/property/i.test(f.label))) {
          mortgage += parseMoney(f.value)
        }
        if (/property tax/i.test(f.label)) propertyTax += parseMoney(f.value)
      })
    }
    if (d.type === '1098-T') {
      d.facts.forEach((f) => {
        if (/tuition/i.test(f.label)) tuition += parseMoney(f.value)
      })
    }
    if (d.type === '1098-E') {
      d.facts.forEach((f) => {
        if (/loan interest|student loan/i.test(f.label)) studentLoan += parseMoney(f.value)
      })
    }
    if (d.type === 'Childcare') {
      d.facts.forEach((f) => {
        if (/childcare|care paid/i.test(f.label)) childcare += parseMoney(f.value)
        if (/provider/i.test(f.label) && !/ein/i.test(f.label)) {
          next.careProvider = f.value
          next.answers.care_provider = 'yes'
        }
      })
    }
    if (d.type === 'Property Tax') {
      d.facts.forEach((f) => {
        if (/property tax/i.test(f.label)) propertyTax += parseMoney(f.value)
      })
    }
  })

  if (wages > 0) next.wages = wages
  if (withholding > 0) next.withholding = withholding
  if (se > 0) {
    next.selfEmploymentIncome = Math.max(next.selfEmploymentIncome, se)
    next.answers.self_employed = 'yes'
  }
  // Bank interest is not self-employment; keep SE from NEC only
  if (interest > 0) next.answers.has_interest_income = 'yes'
  if (mortgage > 0) {
    next.mortgageInterest = mortgage
    next.answers.owns_home = 'yes'
    next.answers.mortgage_interest_paid = 'yes'
  }
  if (propertyTax > 0) {
    next.propertyTax = propertyTax
    next.answers.owns_home = 'yes'
    next.answers.property_taxes = 'yes'
    next.answers.property_tax_amount = propertyTax
  }
  if (tuition > 0) {
    next.tuitionPaid = tuition
    next.answers.education_expenses = 'yes'
    next.answers.tuition_paid = tuition
  }
  if (studentLoan > 0) {
    next.studentLoanInterest = studentLoan
    next.answers.student_loan_interest = 'yes'
    next.answers.loan_interest_paid = studentLoan
  }
  if (childcare > 0) {
    next.childcarePaid = childcare
    next.answers.paid_childcare = 'yes'
    next.answers.childcare_amount = childcare
    next.answers.worked_or_looked = 'yes'
    next.answers.cdcc_docs = 'yes'
    if (!next.answers.has_child) next.answers.has_child = 'yes'
    if (!next.answers.has_dependents) next.answers.has_dependents = 'yes'
  }
  if (tuition > 0) next.answers.aotc_docs = 'yes'
  if (mortgage > 0) next.answers.mortgage_docs = 'yes'
  if (hasW2) {
    next.answers.has_earned_income = 'yes'
    next.answers.had_w2 = 'yes'
  }
  if (has1099) next.answers.had_1099 = 'yes'
  if (hasId) next.answers.id_on_file = 'yes'
  if (has1099 && se > 0) next.answers.schedule_c_signal = 'yes'

  // Do not overwrite filing status from docs alone
  return satisfyDocBackedAnswers(next)
}

/**
 * After docs are on file, fill the short answers credits need so they apply
 * without a long questionnaire first. User can still Edit later.
 */
export function satisfyDocBackedAnswers(profile: TaxpayerProfile): TaxpayerProfile {
  const next = { ...profile, answers: { ...profile.answers } }
  const a = next.answers

  if (next.wages > 0 || next.selfEmploymentIncome > 0) {
    if (!a.has_earned_income_q) a.has_earned_income_q = 'yes'
    if (!a.has_earned_income) a.has_earned_income = 'yes'
  }

  if (next.wages > 0 && !a.had_w2) a.had_w2 = 'yes'
  if ((next.selfEmploymentIncome > 0 || a.has_interest_income === 'yes') && !a.had_1099) a.had_1099 = 'yes'

  if (next.selfEmploymentIncome > 0) {
    if (!a.self_employed) a.self_employed = 'yes'
    if (a.qbi_amount === undefined || a.qbi_amount === '' || a.qbi_amount === 'unresolved') {
      a.qbi_amount = next.selfEmploymentIncome
    }
    // Default non-SSTB so QBI can apply from 1099; Edit if specialized trade.
    if (!a.qbi_sstb) a.qbi_sstb = 'no'
    if (!a.qbi_docs) a.qbi_docs = 'yes'
  }

  if (next.mortgageInterest > 0) {
    if (!a.owns_home) a.owns_home = 'yes'
    if (!a.mortgage_interest_paid) a.mortgage_interest_paid = 'yes'
    if (a.mortgage_interest_amount === undefined || a.mortgage_interest_amount === '') {
      a.mortgage_interest_amount = next.mortgageInterest
    }
  }

  if (next.propertyTax > 0) {
    if (!a.owns_home) a.owns_home = 'yes'
    if (!a.property_taxes) a.property_taxes = 'yes'
    if (a.property_tax_amount === undefined || a.property_tax_amount === '') {
      a.property_tax_amount = next.propertyTax
    }
  }

  if (next.studentLoanInterest > 0) {
    if (!a.student_loan_interest) a.student_loan_interest = 'yes'
    if (a.loan_interest_paid === undefined || a.loan_interest_paid === '') {
      a.loan_interest_paid = next.studentLoanInterest
    }
  }

  if (next.tuitionPaid > 0) {
    if (!a.education_expenses) a.education_expenses = 'yes'
    if (a.tuition_paid === undefined || a.tuition_paid === '') a.tuition_paid = next.tuitionPaid
    // Safe defaults so education credit applies from 1098-T; user can Edit.
    if (!a.aotc_half_time_first4) a.aotc_half_time_first4 = 'yes'
    if (!a.felony_drug) a.felony_drug = 'no'
  }

  if (next.childcarePaid > 0) {
    if (!a.paid_childcare) a.paid_childcare = 'yes'
    if (a.childcare_amount === undefined || a.childcare_amount === '') a.childcare_amount = next.childcarePaid
    if (!a.care_provider) a.care_provider = 'yes'
    if (!a.employer_dependent_care) a.employer_dependent_care = 'no'
    if (!a.has_child) a.has_child = 'yes'
  }

  // EITC investment test: pass when no large interest on file
  if (!a.eitc_investment_ok && (next.wages > 0 || next.selfEmploymentIncome > 0)) {
    a.eitc_investment_ok = a.has_interest_income === 'yes' ? 'yes' : 'yes'
  }

  // Childless / known-child flags for EITC when dependents already settled
  if (
    (a.potential_dependents === 'no' || a.has_dependents === 'no') &&
    !a.has_child &&
    next.dependents.length === 0
  ) {
    a.has_child = 'no'
  }
  if (next.dependents.some((d) => d.age >= 0 && d.age < 17) && !a.has_child) a.has_child = 'yes'

  // CTC residency defaults when per-dep interview already recorded months/support
  const depReady = next.dependents.some(
    (d) => d.monthsLivedWith != null && d.providedOwnSupport != null && d.anotherMayClaim != null,
  )
  if (depReady) {
    const lived = next.dependents.some((d) => (d.monthsLivedWith ?? 0) > 6)
    if (!a.child_lived_with) a.child_lived_with = lived ? 'yes' : 'no'
    if (!a.child_support) {
      a.child_support = next.dependents.every((d) => d.providedOwnSupport === false) ? 'yes' : 'no'
    }
    if (!a.another_claimant) {
      a.another_claimant = next.dependents.some((d) => d.anotherMayClaim === true) ? 'yes' : 'no'
    }
  }

  next.answers = a
  return next
}

export function knownFactsSummary(documents: DocumentRecord[], profile: TaxpayerProfile): string[] {
  const lines: string[] = []
  const fields = extractConfirmedFields(documents)
  if (profile.wages > 0) lines.push(`Wages on file: $${profile.wages.toLocaleString()}`)
  if (profile.withholding > 0) lines.push(`Federal withholding on file: $${profile.withholding.toLocaleString()}`)
  if (profile.selfEmploymentIncome > 0) lines.push(`Self-employment / 1099 income on file: $${profile.selfEmploymentIncome.toLocaleString()}`)
  if (profile.dependents.length) lines.push(`${profile.dependents.length} dependent(s) already recorded`)
  if (profile.filingStatus !== 'unknown') lines.push(`Filing status set to ${profile.filingStatus}`)
  const names = fields.filter((f) => /name|employer|payer/i.test(f.label)).slice(0, 3)
  names.forEach((n) => lines.push(`${n.label}: ${n.value}`))
  return lines
}

function answered(profile: TaxpayerProfile, key: string) {
  const v = profile.answers[key]
  return (v !== undefined && v !== '' && v !== 'unresolved') || profile.unresolvedKeys.includes(key)
}

/** Filing-status interview — only legally necessary questions. */
export function nextFilingStatusTurn(profile: TaxpayerProfile): SmartTurn | null {
  if (!answered(profile, 'married_dec31')) {
    return {
      id: 'married_dec31',
      phase: 'filing_status',
      prompt: 'Married on Dec 31?',
      kind: 'choice',
      choices: ['Yes', 'No', 'My spouse passed away'],
      mapsTo: 'married_dec31',
      aiLead: 'Quick filing question.',
    }
  }

  const married = profile.answers.married_dec31 === 'Yes' || profile.answers.married_dec31 === 'yes'
  const widow = profile.answers.married_dec31 === 'My spouse passed away'

  if ((married || widow) && !answered(profile, 'married_filing_plan')) {
    return {
      id: 'married_filing_plan',
      phase: 'filing_status',
      prompt: married ? 'How will you file?' : 'How should we file for you?',
      kind: 'choice',
      choices: married
        ? ['Married Filing Jointly', 'Married Filing Separately', 'Help me determine which applies']
        : ['Qualifying Surviving Spouse if eligible', 'Help me determine which applies', 'File as Single if QSS does not apply'],
      mapsTo: 'married_filing_plan',
      aiLead: 'Pick the filing option that fits.',
    }
  }

  // Skip if household intake already answered dependents.
  if (
    !answered(profile, 'potential_dependents') &&
    !answered(profile, 'has_qualifying_person') &&
    !answered(profile, 'has_dependents') &&
    profile.dependents.length === 0
  ) {
    return {
      id: 'potential_dependents',
      phase: 'filing_status',
      prompt: 'Any kids or dependents?',
      kind: 'choice',
      choices: ['Yes', 'No'],
      mapsTo: 'potential_dependents',
      aiLead: 'One dependents question — we won’t ask again.',
    }
  }

  if (
    (profile.answers.potential_dependents === 'yes' ||
      profile.answers.potential_dependents === 'Yes' ||
      profile.answers.has_qualifying_person === 'Yes' ||
      profile.answers.has_qualifying_person === 'yes' ||
      profile.answers.has_dependents === 'yes') &&
    !answered(profile, 'dependent_count') &&
    profile.dependents.length === 0
  ) {
    return {
      id: 'dependent_count',
      phase: 'filing_status',
      prompt: 'How many dependents?',
      kind: 'choice',
      choices: ['0', '1', '2', '3', '4', '5+'],
      mapsTo: 'dependent_count',
      aiLead: 'Tap the number.',
    }
  }

  const hasPotential =
    profile.answers.potential_dependents === 'yes' ||
    profile.answers.potential_dependents === 'Yes' ||
    profile.answers.has_qualifying_person === 'Yes' ||
    profile.answers.has_qualifying_person === 'yes' ||
    profile.answers.has_dependents === 'yes' ||
    profile.dependents.length > 0

  if (hasPotential && !answered(profile, 'maintained_home')) {
    return {
      id: 'maintained_home',
      phase: 'filing_status',
      prompt: 'Did you pay most of the home costs?',
      kind: 'choice',
      choices: ['Yes', 'No', 'Not sure'],
      mapsTo: 'maintained_home',
      aiLead: 'Needed for Head of Household.',
    }
  }

  return null
}

export function applyFilingStatusAnswer(profile: TaxpayerProfile, mapsTo: string, value: string): TaxpayerProfile {
  let next = applyAnswer(profile, mapsTo, value)

  if (mapsTo === 'married_dec31') {
    if (value === 'No') next.filingStatus = 'single'
    if (value === 'Yes') next.answers.unmarried_or_considered = 'no'
    if (value === 'My spouse passed away') next.answers.possible_qss = 'yes'
  }

  if (mapsTo === 'married_filing_plan') {
    if (value.includes('Jointly')) next.filingStatus = 'mfj'
    else if (value.includes('Separately')) next.filingStatus = 'mfs'
    else if (value.includes('Qualifying Surviving Spouse')) next.filingStatus = 'hoh' // demo stand-in until QSS fully modeled
    else if (value.includes('Single')) next.filingStatus = 'single'
  }

  if (mapsTo === 'potential_dependents' || mapsTo === 'has_qualifying_person') {
    const yes = value === 'Yes' || value === 'yes'
    next.answers.has_qualifying_person = yes ? 'Yes' : 'No'
    next.answers.potential_dependents = yes ? 'yes' : 'no'
    next.answers.has_dependents = yes ? 'yes' : 'no'
    if (!yes) {
      next.answers.dependent_count = 0
      next.dependents = []
      next.answers.has_child = 'no'
    }
  }

  if (mapsTo === 'maintained_home') {
    const unmarried = next.answers.married_dec31 === 'No' || next.answers.married_dec31 === 'My spouse passed away'
    const hasQP =
      next.answers.has_qualifying_person === 'Yes' ||
      next.answers.has_qualifying_person === 'yes' ||
      next.answers.potential_dependents === 'yes'
    if (unmarried && hasQP && (value === 'Yes' || value === 'yes')) {
      next.filingStatus = 'hoh'
      next.answers.unmarried_or_considered = 'yes'
    }
  }

  return next
}

/** Soft probes we defer when docs already drove credits onto the return. */
const DEFERRED_SOFT_PROBES = new Set([
  'had_w2',
  'had_1099',
  'education_expenses',
  'student_loan_interest',
  'retirement_contributions',
  'owns_home',
  'had_marketplace',
  'charitable_gifts',
  'high_medical',
  'filing_state',
])

export function nextBenefitDiscoveryTurn(profile: TaxpayerProfile): SmartTurn | null {
  const report = runBenefitOptimization(profile)
  const qs = nextInterviewQuestions(profile, report)
  const depsAnswered =
    answered(profile, 'potential_dependents') ||
    answered(profile, 'has_dependents') ||
    answered(profile, 'has_qualifying_person') ||
    profile.dependents.length > 0
  const depTestsDone = profile.dependents.some(
    (d) =>
      (d.monthsLivedWith != null && d.monthsLivedWith >= 0) ||
      d.providedOwnSupport != null ||
      d.anotherMayClaim != null,
  )
  const docsAppliedCredits = report.findings.some(
    (f) =>
      (f.status === 'applied' || f.status === 'pending_verification') &&
      f.affectingRefund > 0,
  )
  // Only HARD blockers — optionalDiscovery credits are “more savings” later, not required.
  const blockingKeys = new Set(
    report.findings
      .filter((f) => f.status === 'needs_info' && !f.optionalDiscovery && f.missingAnswers.length > 0)
      .flatMap((f) => f.missingAnswers),
  )

  // Skip questions already known from documents / household intake
  const filtered = qs.filter((q) => {
    if (q.mapsTo === 'had_w2' && (profile.wages > 0 || profile.answers.had_w2 === 'yes')) return false
    if (q.mapsTo === 'had_1099' && (profile.selfEmploymentIncome > 0 || profile.answers.had_1099 === 'yes')) return false
    if (q.mapsTo === 'self_employed' && profile.selfEmploymentIncome > 0) return false
    if (q.mapsTo === 'owns_home' && (profile.mortgageInterest > 0 || profile.propertyTax > 0)) return false
    if (q.mapsTo === 'education_expenses' && profile.tuitionPaid > 0) return false
    if (q.mapsTo === 'student_loan_interest' && profile.studentLoanInterest > 0) return false
    if (q.mapsTo === 'paid_childcare' && profile.childcarePaid > 0) return false
    if (q.mapsTo === 'has_dependents' && depsAnswered) return false
    if (q.mapsTo === 'has_child') {
      if (profile.answers.has_dependents === 'no' || profile.answers.potential_dependents === 'no') return false
      if (answered(profile, 'has_child')) return false
      if (profile.dependents.some((d) => d.age >= 0 && d.age < 17)) return false
      if (profile.dependents.length > 0 && profile.dependents.every((d) => d.age >= 17)) return false
    }
    if (
      (q.mapsTo === 'child_lived_with' || q.mapsTo === 'child_support' || q.mapsTo === 'another_claimant') &&
      (depTestsDone || answered(profile, q.mapsTo))
    ) {
      return false
    }
    // After docs apply credits, skip soft "fishing" questions — only ask blockers
    if (docsAppliedCredits && DEFERRED_SOFT_PROBES.has(q.mapsTo) && !blockingKeys.has(q.mapsTo)) {
      return false
    }
    return true
  })

  // Prefer a hard blocker; if docs already applied credits, stop the required queue
  // (optional soft probes stay available via Maximize more / Edit).
  const blocker = filtered.find((q) => blockingKeys.has(q.mapsTo))
  const q = blocker ?? (docsAppliedCredits || report.auditComplete ? null : filtered.find((q) => !DEFERRED_SOFT_PROBES.has(q.mapsTo)) ?? null)
  if (!q) return null

  const childCount = profile.dependents.filter((d) => d.age < 17).length
  let aiLead = docsAppliedCredits
    ? 'Your docs finished the return. Only answer if you want extra credits.'
    : 'Upload docs first — credits apply faster.'
  if (q.mapsTo === 'had_w2') aiLead = 'How did you get paid?'
  else if (q.mapsTo === 'had_1099') aiLead = 'Any 1099 income?'
  else if (q.mapsTo === 'paid_childcare' && childCount > 0) {
    aiLead = `You have ${childCount} child${childCount === 1 ? '' : 'ren'}. Paid for childcare?`
  } else if (q.mapsTo === 'childcare_amount') {
    aiLead = 'About how much for childcare?'
  } else if (q.mapsTo === 'care_provider') {
    aiLead = 'Do you have the daycare name and tax ID?'
  } else if (q.mapsTo === 'education_expenses') {
    aiLead = 'Any college tuition?'
  } else if (q.mapsTo === 'self_employed' && profile.selfEmploymentIncome > 0) {
    return nextBenefitDiscoveryTurn(applyAnswer(profile, 'self_employed', 'yes'))
  }

  return {
    id: q.id,
    phase: 'benefits',
    prompt: q.prompt,
    kind: q.kind,
    choices: q.choices ?? (q.kind === 'yesno' ? ['Yes', 'No'] : undefined),
    mapsTo: q.mapsTo,
    aiLead,
  }
}

export function conversationalReply(mapsTo: string, value: string, profile: TaxpayerProfile): string {
  if (mapsTo === 'paid_childcare' && (value === 'Yes' || value === 'yes')) {
    return 'Got it. Approximately how much did you pay, and was it for daycare, after-school care, or another type of care?'
  }
  if (mapsTo === 'childcare_amount') {
    return `Thank you — I’ll evaluate about $${Number(value).toLocaleString()} in childcare for the Child and Dependent Care Credit, coordinating any employer dependent-care benefits. I may still need provider information.`
  }
  if (mapsTo === 'care_provider' && (value === 'Yes' || value === 'yes')) {
    return 'Perfect. I’ll verify eligibility before applying any childcare credit — I won’t claim it until the rules and docs support it.'
  }
  if (mapsTo === 'married_dec31') {
    return 'Thanks. I’ll use that to evaluate Single, MFJ, MFS, Head of Household, and Qualifying Surviving Spouse where applicable.'
  }
  if (mapsTo === 'has_qualifying_person' && (value === 'Yes' || value === 'yes')) {
    return `Noted — ${profile.dependents.length || 2} qualifying individual(s). I’ll only ask follow-ups that affect credits or filing status.`
  }
  if (mapsTo === 'education_expenses' && (value === 'Yes' || value === 'yes')) {
    return 'I’ll compare American Opportunity vs Lifetime Learning before applying either credit — no double counting.'
  }
  return 'Saved. I won’t ask you to re-enter information we already have from your documents or earlier answers.'
}

export function determinePhase(
  prepStep: number,
  profile: TaxpayerProfile,
  documents: DocumentRecord[],
): InterviewPhase {
  if (prepStep >= 5) return 'done'
  if (prepStep >= 4) return 'review'
  if (prepStep >= 3) return 'calculation'
  if (documents.length === 0) return 'upload'
  if (prepStep <= 1) return 'confirm'
  if (nextFilingStatusTurn(profile)) return 'filing_status'
  if (nextBenefitDiscoveryTurn(profile)) return 'benefits'
  return 'calculation'
}
