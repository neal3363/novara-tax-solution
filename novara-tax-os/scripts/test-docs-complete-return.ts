/**
 * Audit: complete document set finishes the return with no required questions.
 * Soft optional credits may remain but must not block auditComplete / nextInterviewTurn.
 */
import { syncProfileFromDocuments, satisfyDocBackedAnswers } from '../src/engine/smartInterview'
import { applyHouseholdToProfile, type HouseholdIntakeState } from '../src/engine/documentIntakeEngine'
import { nextInterviewQuestions, runBenefitOptimization } from '../src/engine/benefitOptimizer'
import { buildInterviewProgress, nextInterviewTurn } from '../src/engine/questionProgress'

const empty = {
  taxYear: 2025,
  filingStatus: 'unknown' as const,
  wages: 0,
  withholding: 0,
  selfEmploymentIncome: 0,
  dependents: [],
  childcarePaid: 0,
  employerDependentCare: 0,
  tuitionPaid: 0,
  studentLoanInterest: 0,
  retirementContributions: 0,
  mortgageInterest: 0,
  propertyTax: 0,
  charitableGifts: 0,
  medicalExpenses: 0,
  businessMileage: 0,
  seHealthPremiums: 0,
  energyImprovements: 0,
  hsaContributions: 0,
  educatorExpenses: 0,
  isEducator: false,
  careProvider: '',
  answers: {},
  unresolvedKeys: [],
}

const docs = [
  {
    id: 'id1',
    name: 'ID_Jordan_Lee.pdf',
    type: 'ID' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'a', label: 'Full name', value: 'Jordan Lee', confidence: 0.96, verified: true, sourcePage: 1 },
      { id: 'b', label: 'Date of birth', value: '03/14/1988', confidence: 0.94, verified: true, sourcePage: 1 },
      { id: 'c', label: 'Tax ID (SSN/ITIN)', value: '***-**-9021', confidence: 0.95, verified: true, sourcePage: 1 },
      { id: 'd', label: 'Address', value: '1842 Harbor Ave, Austin, TX', confidence: 0.9, verified: true, sourcePage: 1 },
    ],
  },
  {
    id: 'id2',
    name: 'ssn_Emma_Lee.pdf',
    type: 'ID' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'e', label: 'Document kind', value: 'Social Security card', confidence: 0.97, verified: true, sourcePage: 1 },
      { id: 'f', label: 'Full name', value: 'Emma Lee', confidence: 0.96, verified: true, sourcePage: 1 },
      { id: 'g', label: 'Date of birth', value: '06/02/2016', confidence: 0.94, verified: true, sourcePage: 1 },
      { id: 'h', label: 'Tax ID (SSN/ITIN)', value: '***-**-4412', confidence: 0.96, verified: true, sourcePage: 1 },
    ],
  },
  {
    id: 'w2',
    name: 'W2_Jordan_Lee.pdf',
    type: 'W-2' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'i', label: 'Employee name', value: 'Jordan Lee', confidence: 0.95, verified: true, sourcePage: 1 },
      { id: 'j', label: 'Employee SSN (last 4)', value: '9021', confidence: 0.9, verified: true, sourcePage: 1 },
      { id: 'k', label: 'Wages (Box 1)', value: '$48200', confidence: 0.95, verified: true, sourcePage: 1 },
      { id: 'l', label: 'Federal withheld', value: '$4200', confidence: 0.9, verified: true, sourcePage: 1 },
    ],
  },
  {
    id: 'nec',
    name: '1099_Jordan.pdf',
    type: '1099-NEC' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'm', label: 'Nonemployee compensation', value: '$3200', confidence: 0.95, verified: true, sourcePage: 1 },
    ],
  },
  {
    id: 'm1098',
    name: '1098_mortgage.pdf',
    type: '1098' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'n', label: 'Mortgage interest', value: '$8500', confidence: 0.95, verified: true, sourcePage: 1 },
      { id: 'o', label: 'Property taxes paid by lender', value: '$4200', confidence: 0.9, verified: true, sourcePage: 1 },
    ],
  },
  {
    id: 't',
    name: '1098T.pdf',
    type: '1098-T' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'p', label: 'Qualified tuition (Box 1)', value: '$6400', confidence: 0.95, verified: true, sourcePage: 1 },
    ],
  },
  {
    id: 'e1098',
    name: '1098E.pdf',
    type: '1098-E' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'q', label: 'Student loan interest', value: '$780', confidence: 0.95, verified: true, sourcePage: 1 },
    ],
  },
  {
    id: 'care',
    name: 'childcare.pdf',
    type: 'Childcare' as const,
    status: 'extracted' as const,
    facts: [
      { id: 'r', label: 'Care provider', value: 'Sunshine Daycare', confidence: 0.95, verified: true, sourcePage: 1 },
      { id: 's', label: 'Childcare paid', value: '$4800', confidence: 0.95, verified: true, sourcePage: 1 },
    ],
  },
]

let profile = satisfyDocBackedAnswers(syncProfileFromDocuments(empty as any, docs as any))

const intake: HouseholdIntakeState = {
  phase: 'interview',
  primaryPersonId: 'id1',
  candidates: [
    {
      id: 'id1',
      fullLegalName: 'Jordan Lee',
      dateOfBirth: '1988-03-14',
      tinLast4: '9021',
      relationToPrimary: 'self',
      mayQualifyDependent: false,
      onReturn: true,
      sourceDocIds: ['id1'],
    },
    {
      id: 'id2',
      fullLegalName: 'Emma Lee',
      dateOfBirth: '2016-06-02',
      tinLast4: '4412',
      relationToPrimary: 'daughter',
      mayQualifyDependent: true,
      onReturn: true,
      sourceDocIds: ['id2'],
    },
  ],
  missingHouseholdAsked: true,
  missingHouseholdAnswer: 'no',
  filingRecommendation: null,
}

profile = satisfyDocBackedAnswers(applyHouseholdToProfile(profile, intake, 2025))
const report = runBenefitOptimization(profile)
const hard = report.findings.filter((f) => f.status === 'needs_info' && !f.optionalDiscovery)
const turn = nextInterviewTurn(profile)
const queued = nextInterviewQuestions(profile, report)
const progress = buildInterviewProgress(profile)
const unanswered = progress.questions.filter((q) => q.status === 'unanswered')

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL', msg)
    process.exit(1)
  }
  console.log('OK', msg)
}

assert(report.dependentInfoComplete, 'dependent interview complete from docs')
assert(hard.length === 0, `no hard needs_info (got ${hard.map((f) => f.ruleId).join(',')})`)
assert(report.blockers.length === 0, `no blockers (got ${report.blockers.join('; ')})`)
assert(report.auditComplete, 'auditComplete when docs finish the return')
assert(turn === null, `no required interview turn (got ${turn?.mapsTo})`)
assert(queued.length === 0, `no doc-covered questions queued (got ${queued.map((q) => q.mapsTo).join(',')})`)
assert(
  unanswered.length === 0,
  `progress has no unanswered doc-covered questions (got ${unanswered.map((q) => q.mapsTo).join(',')})`,
)
assert(report.verifiedSavings > 0, 'credits applied from documents')
console.log('All docs-complete return checks passed.')
