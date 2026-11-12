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
  kind: 'yesno' | 'choice' | 'number' | 'text'
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
    if (d.type === 'ID') hasId = true
    if (d.type === 'W-2') {
      hasW2 = true
      d.facts.forEach((f) => {
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
  if (hasW2) next.answers.has_earned_income = 'yes'
  if (hasId) next.answers.id_on_file = 'yes'
  if (has1099 && se > 0) next.answers.schedule_c_signal = 'yes'

  // Do not overwrite filing status from docs alone
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
      prompt: 'Were you married on December 31 of the tax year?',
      kind: 'choice',
      choices: ['Yes', 'No', 'My spouse passed away'],
      mapsTo: 'married_dec31',
      aiLead: 'First I need your filing status. I’ll only ask what’s legally required.',
    }
  }

  const married = profile.answers.married_dec31 === 'Yes' || profile.answers.married_dec31 === 'yes'
  const widow = profile.answers.married_dec31 === 'My spouse passed away'

  if ((married || widow) && !answered(profile, 'married_filing_plan')) {
    return {
      id: 'married_filing_plan',
      phase: 'filing_status',
      prompt: married
        ? 'How are you planning to file?'
        : 'As a surviving spouse, how would you like to evaluate filing?',
      kind: 'choice',
      choices: married
        ? ['Married Filing Jointly', 'Married Filing Separately', 'Help me determine which applies']
        : ['Qualifying Surviving Spouse if eligible', 'Help me determine which applies', 'File as Single if QSS does not apply'],
      mapsTo: 'married_filing_plan',
      aiLead: 'Your December 31 marital status affects which filing statuses we can consider.',
    }
  }

  if (!answered(profile, 'potential_dependents') && !answered(profile, 'has_qualifying_person')) {
    return {
      id: 'potential_dependents',
      phase: 'filing_status',
      prompt: 'Do you have any children or other people who may qualify as your dependents?',
      kind: 'choice',
      choices: ['Yes', 'No'],
      mapsTo: 'potential_dependents',
      aiLead:
        !married
          ? 'Dependent credits and Head of Household require knowing exactly who you may claim — we never assume a count from documents or estimates.'
          : 'We’ll collect each potential dependent’s details before calculating Child Tax Credit, EITC, or other dependent benefits.',
    }
  }

  if (
    (profile.answers.potential_dependents === 'yes' ||
      profile.answers.potential_dependents === 'Yes' ||
      profile.answers.has_qualifying_person === 'Yes' ||
      profile.answers.has_qualifying_person === 'yes') &&
    !answered(profile, 'dependent_count')
  ) {
    return {
      id: 'dependent_count',
      phase: 'filing_status',
      prompt: 'How many children or other potential dependents do you have?',
      kind: 'choice',
      choices: ['0', '1', '2', '3', '4', '5+'],
      mapsTo: 'dependent_count',
      aiLead: 'Enter the actual number. Do not skip this — refund amounts cannot be verified without it.',
    }
  }

  const hasPotential =
    profile.answers.potential_dependents === 'yes' ||
    profile.answers.potential_dependents === 'Yes' ||
    profile.answers.has_qualifying_person === 'Yes' ||
    profile.answers.has_qualifying_person === 'yes'

  if (hasPotential && !answered(profile, 'maintained_home')) {
    return {
      id: 'maintained_home',
      phase: 'filing_status',
      prompt: 'Did you pay more than half the cost of maintaining your home?',
      kind: 'choice',
      choices: ['Yes', 'No', 'Not sure'],
      mapsTo: 'maintained_home',
      aiLead: 'Head of Household and some dependent tests require that you maintained the home.',
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

export function nextBenefitDiscoveryTurn(profile: TaxpayerProfile): SmartTurn | null {
  const report = runBenefitOptimization(profile)
  const qs = nextInterviewQuestions(profile, report)
  // Skip questions already known from documents
  const filtered = qs.filter((q) => {
    if (q.mapsTo === 'self_employed' && profile.selfEmploymentIncome > 0) return false
    if (q.mapsTo === 'owns_home' && profile.mortgageInterest > 0) return false
    if (q.mapsTo === 'has_dependents' && profile.dependents.length > 0) return false
    if (q.mapsTo === 'has_child' && profile.dependents.some((d) => d.age < 17)) return false
    return true
  })
  const q = filtered[0]
  if (!q) return null

  const childCount = profile.dependents.filter((d) => d.age < 17).length
  let aiLead = 'I’m checking for tax benefits that may apply to your situation.'
  if (q.mapsTo === 'paid_childcare' && childCount > 0) {
    aiLead = `I see you have ${childCount} child${childCount === 1 ? '' : 'ren'}. Did you pay for childcare while you worked?`
  } else if (q.mapsTo === 'childcare_amount') {
    aiLead = 'Thank you. I’ll check whether those expenses qualify for a tax credit. About how much did you pay?'
  } else if (q.mapsTo === 'care_provider') {
    aiLead = 'I may need provider details before we can apply the Child and Dependent Care Credit.'
  } else if (q.mapsTo === 'education_expenses') {
    aiLead = 'Next I’ll look for education credits — only if someone attended an eligible school.'
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
