import {
  buildInterviewProgress,
  type ProgressQuestion,
  type QuestionCategory,
} from '../../engine/questionProgress'
import type { TaxpayerProfile } from '../../engine/benefitOptimizer'
import { personalIdentityProgress } from '../../engine/naturalLanguageFacts'
import './QuestionnaireTabs.css'

export type QuestionnaireSectionId =
  | 'personal'
  | 'filing'
  | 'dependents'
  | 'income'
  | 'business'
  | 'deductions'
  | 'credits'
  | 'review'

export const QUESTIONNAIRE_SECTIONS: {
  id: QuestionnaireSectionId
  label: string
  categories?: QuestionCategory[]
  mapsToIncludes?: string[]
}[] = [
  { id: 'personal', label: 'Personal', mapsToIncludes: ['full_name', 'ssn', 'address', 'phone', 'email'] },
  { id: 'filing', label: 'Filing Status', categories: ['filing_status'] },
  { id: 'dependents', label: 'Spouse & Dependents', categories: ['dependents'] },
  {
    id: 'income',
    label: 'Income',
    mapsToIncludes: ['had_w2', 'had_1099', 'wages', 'interest', 'dividends', 'unemployment', 'other_income', 'has_earned'],
  },
  {
    id: 'business',
    label: 'Business',
    mapsToIncludes: [
      'self_employed',
      'business_',
      'schedule_c',
      'qbi',
      'business_miles',
      'business_vehicle',
      'total_miles',
      'mileage',
      'depreciation',
      'home_office',
      'equipment',
      'se_health',
      'actual_expense',
    ],
  },
  {
    id: 'deductions',
    label: 'Deductions',
    mapsToIncludes: [
      'owns_home',
      'mortgage',
      'charitable',
      'medical',
      'retirement',
      'student_loan',
      'high_medical',
    ],
  },
  {
    id: 'credits',
    label: 'Credits',
    mapsToIncludes: ['childcare', 'education', 'tuition', 'eitc', 'child_tax', 'marketplace', 'had_marketplace'],
  },
  { id: 'review', label: 'Review' },
]

function questionInSection(q: ProgressQuestion, sectionId: QuestionnaireSectionId): boolean {
  const section = QUESTIONNAIRE_SECTIONS.find((s) => s.id === sectionId)
  if (!section) return false
  if (section.categories?.includes(q.category)) return true
  if (section.mapsToIncludes?.some((p) => q.mapsTo.includes(p) || q.prompt.toLowerCase().includes(p.replace(/_/g, ' ')))) {
    // Avoid double-counting filing/dependent items already covered by category
    if (q.category === 'filing_status' || q.category === 'dependents') return false
    return true
  }
  // Benefit discovery catch-alls by section keywords
  if (q.category === 'benefit_discovery') {
    const key = q.mapsTo
    if (sectionId === 'business') return /self_employ|business|mileage|vehicle|qbi|depreciation|home_office|se_health|equipment|structure|total_miles|actual_expense/.test(key)
    if (sectionId === 'deductions')
      return /home|mortgage|charit|medical|retirement|student_loan|donation/.test(key)
    if (sectionId === 'credits')
      return /childcare|education|tuition|marketplace|credit|eitc|child/.test(key)
    if (sectionId === 'income') return /wage|interest|dividend|income/.test(key)
  }
  return false
}

export function sectionStats(profile: TaxpayerProfile, sectionId: QuestionnaireSectionId) {
  const progress = buildInterviewProgress(profile)
  if (sectionId === 'review') {
    return {
      answered: progress.answeredCount,
      total: progress.applicableTotal,
      unanswered: progress.unansweredCount,
      items: progress.questions,
    }
  }
  if (sectionId === 'personal') {
    const identity = personalIdentityProgress(profile).map(
      (row): ProgressQuestion => ({
        id: `personal:${row.mapsTo}`,
        mapsTo: row.mapsTo,
        prompt: row.prompt,
        category: 'benefit_discovery',
        categoryLabel: 'Personal information',
        status: row.status,
        statusLabel: row.status === 'answered' ? 'Answered' : 'Still needed',
      }),
    )
    const filingOpener = progress.questions.filter((q) => q.category === 'filing_status').slice(0, 1)
    const items = [...identity, ...filingOpener]
    return {
      answered: items.filter((i) => i.status === 'answered').length,
      total: items.length,
      unanswered: items.filter((i) => i.status === 'unanswered').length,
      items,
    }
  }
  if (sectionId === 'income') {
    // Income often comes from uploads; still surface related interview probes
    const items = progress.questions.filter((q) => questionInSection(q, 'income'))
    return {
      answered: items.filter((i) => i.status === 'answered').length,
      total: items.length,
      unanswered: items.filter((i) => i.status === 'unanswered').length,
      items,
    }
  }
  const items = progress.questions.filter((q) => questionInSection(q, sectionId))
  return {
    answered: items.filter((i) => i.status === 'answered').length,
    total: items.length,
    unanswered: items.filter((i) => i.status === 'unanswered').length,
    items,
  }
}

export function QuestionnaireTabs(props: {
  profile: TaxpayerProfile
  active: QuestionnaireSectionId
  onSelect: (id: QuestionnaireSectionId) => void
}) {
  return (
    <nav className="qtabs" aria-label="Tax questionnaire sections">
      {QUESTIONNAIRE_SECTIONS.map((s) => {
        const stats = sectionStats(props.profile, s.id)
        const done = stats.total > 0 && stats.unanswered === 0
        const hasWork = stats.unanswered > 0
        return (
          <button
            key={s.id}
            type="button"
            className={`qtab ${props.active === s.id ? 'active' : ''} ${done ? 'done' : ''} ${hasWork ? 'needs' : ''}`}
            aria-current={props.active === s.id ? 'page' : undefined}
            onClick={() => props.onSelect(s.id)}
          >
            <span className="qtab-label">{s.label}</span>
            {s.id !== 'review' && stats.total > 0 && (
              <span className="qtab-count">
                {stats.answered}/{stats.total}
              </span>
            )}
            {s.id === 'review' && <span className="qtab-count">{stats.answered}/{stats.total}</span>}
          </button>
        )
      })}
    </nav>
  )
}
