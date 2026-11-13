/**
 * Unified interview question progress — status colors, counts, next unanswered.
 * GREEN = answered · ORANGE = unanswered · also awaiting verification / not applicable.
 * Continue must jump to the next applicable unanswered question — never restart.
 */

import { answerPresent } from './benefitAnswers'
import type { TaxpayerProfile } from './benefitOptimizer'
import { nextInterviewQuestions, runBenefitOptimization } from './benefitOptimizer'
import {
  nextBenefitSpecificQuestion,
  listSupportedBenefitQuestionnaires,
} from './benefitQuestionnaires'
import { nextDependentQuestion } from './dependentsEngine'
import { nextBenefitDiscoveryTurn, nextFilingStatusTurn } from './smartInterview'

export type QuestionStatus = 'answered' | 'unanswered' | 'awaiting_verification' | 'not_applicable'

export type QuestionCategory =
  | 'filing_status'
  | 'dependents'
  | 'benefit_discovery'
  | 'benefit_specific'

export interface ProgressQuestion {
  id: string
  mapsTo: string
  prompt: string
  category: QuestionCategory
  categoryLabel: string
  status: QuestionStatus
  statusLabel: string
  benefitRuleId?: string
}

export interface InterviewProgress {
  taxYear: number
  questions: ProgressQuestion[]
  applicableTotal: number
  answeredCount: number
  unansweredCount: number
  awaitingVerificationCount: number
  percentComplete: number
  nextUnanswered: ProgressQuestion | null
  greeting: string
  resumeMapsTo: string | null
}

const FILING_PROMPTS: { mapsTo: string; prompt: string }[] = [
  { mapsTo: 'married_dec31', prompt: 'Were you married on December 31 of the tax year?' },
  { mapsTo: 'married_filing_plan', prompt: 'How are you planning to file?' },
  { mapsTo: 'potential_dependents', prompt: 'Do you have any children or other people who may qualify as your dependents?' },
  { mapsTo: 'dependent_count', prompt: 'How many children or other potential dependents do you have?' },
  { mapsTo: 'maintained_home', prompt: 'Did you pay more than half the cost of maintaining your home?' },
]

function statusMeta(status: QuestionStatus): { status: QuestionStatus; statusLabel: string } {
  switch (status) {
    case 'answered':
      return { status, statusLabel: 'Answered' }
    case 'unanswered':
      return { status, statusLabel: 'Unanswered' }
    case 'awaiting_verification':
      return { status, statusLabel: 'Awaiting verification' }
    case 'not_applicable':
      return { status, statusLabel: 'Does not apply' }
  }
}

function isAnswered(profile: TaxpayerProfile, mapsTo: string): boolean {
  return answerPresent(profile, mapsTo) || profile.unresolvedKeys.includes(mapsTo)
}

function filingApplicable(profile: TaxpayerProfile, mapsTo: string): boolean {
  const married =
    profile.answers.married_dec31 === 'Yes' ||
    profile.answers.married_dec31 === 'yes' ||
    profile.answers.married_dec31 === 'My spouse passed away'
  const hasPotential =
    profile.answers.potential_dependents === 'yes' ||
    profile.answers.potential_dependents === 'Yes' ||
    profile.answers.has_qualifying_person === 'Yes' ||
    profile.answers.has_qualifying_person === 'yes'

  if (mapsTo === 'married_filing_plan') return married || isAnswered(profile, 'married_dec31') && married
  if (mapsTo === 'dependent_count') return hasPotential || (!isAnswered(profile, 'potential_dependents') && false)
  if (mapsTo === 'maintained_home') return hasPotential
  return true
}

/** Build the live next turn used by Prepare / Assistant / Continue. */
export function nextInterviewTurn(profile: TaxpayerProfile) {
  const filingTurn = nextFilingStatusTurn(profile)
  if (filingTurn) return { ...filingTurn, category: 'filing_status' as const }

  const depQ = nextDependentQuestion(profile.answers, profile.dependents)
  if (depQ) {
    return {
      id: depQ.id,
      phase: 'dependents' as const,
      category: 'dependents' as const,
      prompt: depQ.prompt,
      kind: (depQ.kind === 'date' ? 'text' : depQ.kind) as 'yesno' | 'choice' | 'number' | 'text',
      choices: depQ.choices,
      mapsTo: depQ.mapsTo,
      aiLead: 'We need exact dependent facts before any dependent credit can change a verified refund.',
    }
  }

  const benefitTurn = nextBenefitDiscoveryTurn(profile)
  if (benefitTurn) return { ...benefitTurn, category: 'benefit_discovery' as const }
  return null
}

export function buildInterviewProgress(profile: TaxpayerProfile): InterviewProgress {
  const questions: ProgressQuestion[] = []
  const seen = new Set<string>()

  const push = (q: Omit<ProgressQuestion, 'statusLabel'> & { status: QuestionStatus }) => {
    if (seen.has(q.mapsTo)) return
    seen.add(q.mapsTo)
    questions.push({ ...q, ...statusMeta(q.status) })
  }

  // Filing status — only applicable items
  for (const f of FILING_PROMPTS) {
    const applicable = (() => {
      if (f.mapsTo === 'married_dec31') return true
      if (f.mapsTo === 'married_filing_plan') {
        if (!isAnswered(profile, 'married_dec31')) return false
        const married =
          profile.answers.married_dec31 === 'Yes' ||
          profile.answers.married_dec31 === 'yes' ||
          profile.answers.married_dec31 === 'My spouse passed away'
        return married
      }
      if (f.mapsTo === 'potential_dependents') return isAnswered(profile, 'married_dec31')
      if (f.mapsTo === 'dependent_count') {
        const yes =
          profile.answers.potential_dependents === 'yes' || profile.answers.potential_dependents === 'Yes'
        return yes
      }
      if (f.mapsTo === 'maintained_home') {
        const yes =
          profile.answers.potential_dependents === 'yes' || profile.answers.potential_dependents === 'Yes'
        return yes
      }
      return filingApplicable(profile, f.mapsTo)
    })()

    if (!applicable) {
      // Skip entirely from totals when not applicable (do not count)
      continue
    }
    push({
      id: `filing:${f.mapsTo}`,
      mapsTo: f.mapsTo,
      prompt: f.prompt,
      category: 'filing_status',
      categoryLabel: 'Filing status',
      status: isAnswered(profile, f.mapsTo) ? 'answered' : 'unanswered',
    })
  }

  // Dependent interview — walk until null collecting asked + next
  {
    let walkAnswers = { ...profile.answers }
    let walkDeps = profile.dependents.map((d) => ({ ...d }))
    const guard = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const q = nextDependentQuestion(walkAnswers, walkDeps)
      if (!q) break
      if (guard.has(q.mapsTo)) break
      guard.add(q.mapsTo)
      const answered = isAnswered({ ...profile, answers: walkAnswers }, q.mapsTo) ||
        // structural answers already on dependent object for name/dob etc.
        (q.mapsTo.endsWith('_name') && Boolean(walkDeps[q.dependentIndex ?? 0]?.fullLegalName)) ||
        (q.mapsTo.endsWith('_dob') && Boolean(walkDeps[q.dependentIndex ?? 0]?.dateOfBirth))
      push({
        id: `dep:${q.mapsTo}`,
        mapsTo: q.mapsTo,
        prompt: q.prompt,
        category: 'dependents',
        categoryLabel: 'Dependents',
        status: answered ? 'answered' : 'unanswered',
      })
      // Simulate answering unanswered so we can list subsequent applicable questions
      if (!answered) {
        // Keep as unanswered in list; stop simulating further until answered
        break
      }
      // Advance walker with existing answer
      const val = walkAnswers[q.mapsTo]
      if (val !== undefined) {
        // already have it
      }
    }
    // Also surface currently next unanswered if not already listed
    const liveDep = nextDependentQuestion(profile.answers, profile.dependents)
    if (liveDep && !seen.has(liveDep.mapsTo)) {
      push({
        id: `dep:${liveDep.mapsTo}`,
        mapsTo: liveDep.mapsTo,
        prompt: liveDep.prompt,
        category: 'dependents',
        categoryLabel: 'Dependents',
        status: 'unanswered',
      })
    }
  }

  // Benefit discovery — list answered probes + next unanswered from engine
  {
    const report = runBenefitOptimization(profile)
    const qs = nextInterviewQuestions(profile, report)
    // Include known answered discovery keys from profile that match common probes
    const discoveryKeys = [
      'has_dependents',
      'has_child',
      'paid_childcare',
      'childcare_amount',
      'education_expenses',
      'tuition_paid',
      'self_employed',
      'business_vehicle',
      'business_miles',
      'owns_home',
      'retirement_contributions',
      'student_loan_interest_yes',
    ]
    for (const key of discoveryKeys) {
      if (!isAnswered(profile, key)) continue
      if (seen.has(key)) continue
      push({
        id: `disc:${key}`,
        mapsTo: key,
        prompt: `Benefit question: ${key.replace(/_/g, ' ')}`,
        category: 'benefit_discovery',
        categoryLabel: 'Tax benefits',
        status: profile.unresolvedKeys.includes(key) ? 'awaiting_verification' : 'answered',
      })
    }
    for (const q of qs) {
      if (seen.has(q.mapsTo)) continue
      const answered = isAnswered(profile, q.mapsTo)
      push({
        id: `disc:${q.mapsTo}`,
        mapsTo: q.mapsTo,
        prompt: q.prompt,
        category: 'benefit_discovery',
        categoryLabel: 'Tax benefits',
        status: answered ? 'answered' : 'unanswered',
      })
    }
  }

  // Open benefit-specific questionnaires that have started or have remaining questions triggered
  for (const catalog of listSupportedBenefitQuestionnaires()) {
    const next = nextBenefitSpecificQuestion(catalog.ruleId, profile)
    // Only include if questionnaire has any answered keys or a next question
    const started = Object.keys(profile.answers).some((k) => k.startsWith(catalog.ruleId) || next)
    if (!started && !next) continue
    if (next && !seen.has(next.mapsTo)) {
      push({
        id: `ben:${catalog.ruleId}:${next.mapsTo}`,
        mapsTo: next.mapsTo,
        prompt: next.prompt,
        category: 'benefit_specific',
        categoryLabel: catalog.title,
        status: 'unanswered',
        benefitRuleId: catalog.ruleId,
      })
    }
  }

  const applicable = questions.filter((q) => q.status !== 'not_applicable')
  const answeredCount = applicable.filter((q) => q.status === 'answered').length
  const unansweredCount = applicable.filter((q) => q.status === 'unanswered').length
  const awaitingVerificationCount = applicable.filter((q) => q.status === 'awaiting_verification').length
  const applicableTotal = applicable.length
  const percentComplete =
    applicableTotal === 0 ? 100 : Math.round((answeredCount / applicableTotal) * 100)

  const nextUnanswered =
    applicable.find((q) => q.status === 'unanswered') ??
    (() => {
      const turn = nextInterviewTurn(profile)
      if (!turn) return null
      return {
        id: turn.id,
        mapsTo: turn.mapsTo,
        prompt: turn.prompt,
        category: turn.category,
        categoryLabel:
          turn.category === 'filing_status'
            ? 'Filing status'
            : turn.category === 'dependents'
              ? 'Dependents'
              : 'Tax benefits',
        ...statusMeta('unanswered'),
      } satisfies ProgressQuestion
    })()

  const remaining = unansweredCount
  const greeting =
    applicableTotal === 0
      ? 'You’re all set on interview questions for now. Review your estimate whenever you’re ready.'
      : remaining === 0
        ? `You've completed ${answeredCount} of ${applicableTotal} questions. Nothing left unanswered — nice work.`
        : answeredCount === 0
          ? `You have ${applicableTotal} tax questions to answer. Let's start with the first one.`
          : `You've completed ${answeredCount} of ${applicableTotal} questions. You have ${remaining} remaining. Let's finish where you stopped.`

  return {
    taxYear: profile.taxYear,
    questions: applicable,
    applicableTotal,
    answeredCount,
    unansweredCount,
    awaitingVerificationCount,
    percentComplete,
    nextUnanswered,
    greeting,
    resumeMapsTo: nextUnanswered?.mapsTo ?? null,
  }
}

/** Group questions by category for overview UI */
export function groupProgressByCategory(progress: InterviewProgress) {
  const order: QuestionCategory[] = ['filing_status', 'dependents', 'benefit_discovery', 'benefit_specific']
  return order
    .map((cat) => {
      const items = progress.questions.filter((q) => q.category === cat)
      if (items.length === 0) return null
      return {
        category: cat,
        label: items[0].categoryLabel,
        items,
        answered: items.filter((i) => i.status === 'answered').length,
        total: items.length,
      }
    })
    .filter(Boolean) as {
    category: QuestionCategory
    label: string
    items: ProgressQuestion[]
    answered: number
    total: number
  }[]
}
