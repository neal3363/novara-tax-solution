import type { DocType, DocumentRecord } from '../data/types'
import type { TaxpayerProfile } from './benefitOptimizer'
import { runBenefitOptimization } from './benefitOptimizer'
import { buildDependentDocumentChecklist } from './dependentsEngine'

export type DocRequirementStatus = 'needed' | 'uploaded' | 'under_review' | 'verified' | 'not_required'

export interface DocumentRequirement {
  id: string
  benefitId?: string
  benefitName: string
  name: string
  reason: string
  status: DocRequirementStatus
  /** Legally / operationally required before e-file vs recommended support */
  requiredForFiling: boolean
  matchTypes: DocType[]
  alternative?: string
}

function hasDoc(docs: DocumentRecord[], types: DocType[]) {
  return docs.some((d) => types.includes(d.type) && (d.status === 'extracted' || d.status === 'verified' || d.status === 'needs_review'))
}

function verifiedDoc(docs: DocumentRecord[], types: DocType[]) {
  return docs.some((d) => types.includes(d.type) && d.status === 'verified')
}

function statusFor(docs: DocumentRecord[], types: DocType[], required: boolean): DocRequirementStatus {
  if (verifiedDoc(docs, types)) return 'verified'
  if (hasDoc(docs, types)) return docs.some((d) => types.includes(d.type) && d.status === 'needs_review') ? 'under_review' : 'uploaded'
  return required ? 'needed' : 'needed'
}

/** Personalized outstanding documents — only items relevant to this return. */
export function buildDocumentChecklist(
  profile: TaxpayerProfile,
  documents: DocumentRecord[],
): DocumentRequirement[] {
  const report = runBenefitOptimization(profile)
  const items: DocumentRequirement[] = []

  const push = (item: Omit<DocumentRequirement, 'status'> & { status?: DocRequirementStatus }) => {
    const status = item.status ?? statusFor(documents, item.matchTypes, item.requiredForFiling)
    // Skip "not required" noise; skip if already verified and not requiredForFiling display needs
    items.push({ ...item, status })
  }

  // Core identity / income
  if (profile.wages > 0 || profile.answers.has_earned_income === 'yes' || profile.answers.had_w2 === 'yes') {
    push({
      id: 'doc-w2',
      benefitName: 'Wages',
      name: 'Form W-2',
      reason: 'Needed for your job wages.',
      requiredForFiling: true,
      matchTypes: ['W-2'],
      alternative: 'Employer wage statement',
    })
  }
  if (
    profile.selfEmploymentIncome > 0 ||
    profile.answers.self_employed === 'yes' ||
    profile.answers.had_1099 === 'yes'
  ) {
    push({
      id: 'doc-1099nec',
      benefitId: 'qbi',
      benefitName: 'Self-employment',
      name: 'Form 1099-NEC / business income records',
      reason: 'Needed for 1099 / self-employment income.',
      requiredForFiling: true,
      matchTypes: ['1099-NEC', 'P&L'],
      alternative: 'Business P&L or bank deposits summary',
    })
  }

  const onReturn = report.findings.filter((f) => f.status === 'applied' || f.status === 'pending_verification')
  const needs = report.findings.filter((f) => f.status === 'needs_info' || f.status === 'pending_verification')
  // Also include benefits the taxpayer affirmed in interview (even if currently $0 vs standard deduction)
  const affirmed = report.findings.filter((f) => {
    if (f.status === 'ineligible' && f.affectingRefund === 0) {
      const a = profile.answers
      if (f.ruleId === 'mortgage' && (a.mortgage_interest_paid === 'yes' || profile.mortgageInterest > 0)) return true
      if (f.ruleId === 'mileage' && (a.business_vehicle === 'yes' || profile.businessMileage > 0)) return true
      if (f.ruleId === 'aotc' && (a.education_expenses === 'yes' || profile.tuitionPaid > 0)) return true
      if (f.ruleId === 'cdcc' && (a.paid_childcare === 'yes' || profile.childcarePaid > 0)) return true
    }
    return false
  })

  const interested = [...onReturn, ...needs, ...affirmed]

  interested.forEach((f) => {
    if (f.ruleId === 'mileage') {
      push({
        id: 'doc-mileage-log',
        benefitId: 'mileage',
        benefitName: 'Business mileage',
        name: 'Mileage log',
        reason: 'Substantiates business miles claimed on Schedule C.',
        requiredForFiling: true,
        matchTypes: ['Other'],
        alternative: 'App export or dated odometer log',
      })
      if (profile.answers.actual_expense_method === 'yes') {
        push({
          id: 'doc-vehicle-exp',
          benefitId: 'mileage',
          benefitName: 'Business mileage',
          name: 'Vehicle expense records',
          reason: 'Needed if using the actual-expense method.',
          requiredForFiling: true,
          matchTypes: ['Other', 'Bank Statement'],
        })
      }
    }
    if (f.ruleId === 'aotc' || f.ruleId === 'llc') {
      push({
        id: 'doc-1098t',
        benefitId: f.ruleId,
        benefitName: f.shortName,
        name: 'Form 1098-T',
        reason: 'Supports qualified education expenses for education credits.',
        requiredForFiling: true,
        matchTypes: ['1098-T'],
        alternative: 'School tuition statement',
      })
    }
    if (f.ruleId === 'student_loan') {
      push({
        id: 'doc-1098e',
        benefitId: 'student_loan',
        benefitName: 'Student loan interest',
        name: 'Form 1098-E',
        reason: 'Supports student loan interest deduction.',
        requiredForFiling: true,
        matchTypes: ['1098-E'],
      })
    }
    if (f.ruleId === 'cdcc') {
      push({
        id: 'doc-childcare-provider',
        benefitId: 'cdcc',
        benefitName: 'Childcare Credit',
        name: 'Childcare provider information',
        reason: 'Name and TIN required for Form 2441.',
        requiredForFiling: true,
        matchTypes: ['Childcare', 'ID'],
        alternative: 'Provider letter with EIN/SSN',
      })
      push({
        id: 'doc-childcare-pay',
        benefitId: 'cdcc',
        benefitName: 'Childcare Credit',
        name: 'Childcare payment records',
        reason: 'Substantiates amounts paid for the care credit.',
        requiredForFiling: true,
        matchTypes: ['Childcare', 'Bank Statement'],
      })
    }
    if (f.ruleId === 'mortgage') {
      push({
        id: 'doc-1098',
        benefitId: 'mortgage',
        benefitName: 'Mortgage interest',
        name: 'Form 1098',
        reason: 'Supports mortgage interest on Schedule A.',
        requiredForFiling: true,
        matchTypes: ['1098'],
      })
    }
    if (f.ruleId === 'property_tax') {
      push({
        id: 'doc-prop-tax',
        benefitId: 'property_tax',
        benefitName: 'Property taxes',
        name: 'Property tax statement',
        reason: 'Supports SALT property tax deduction.',
        requiredForFiling: true,
        matchTypes: ['Property Tax', '1098'],
      })
    }
    if (f.ruleId === 'ctc' || f.ruleId === 'eitc') {
      push({
        id: 'doc-dep-id',
        benefitId: f.ruleId,
        benefitName: f.shortName,
        name: 'Dependent identification',
        reason: 'Supports dependent SSN/ITIN and relationship for credits.',
        requiredForFiling: true,
        matchTypes: ['ID'],
        alternative: 'SSN card or ITIN letter',
      })
    }
    if (f.ruleId === 'charity') {
      push({
        id: 'doc-charity',
        benefitId: 'charity',
        benefitName: 'Charitable giving',
        name: 'Donation receipts',
        reason: 'Substantiates charitable contributions if itemizing.',
        requiredForFiling: true,
        matchTypes: ['Other'],
      })
    }
    if (f.ruleId === 'se_health') {
      push({
        id: 'doc-seh',
        benefitId: 'se_health',
        benefitName: 'SE health insurance',
        name: 'Insurance premium statements',
        reason: 'Supports self-employed health insurance deduction.',
        requiredForFiling: true,
        matchTypes: ['Other'],
      })
    }
    if (f.ruleId === 'ptc') {
      push({
        id: 'doc-1095a',
        benefitId: 'ptc',
        benefitName: 'Premium Tax Credit',
        name: 'Form 1095-A',
        reason: 'Required to reconcile Marketplace premium tax credit.',
        requiredForFiling: true,
        matchTypes: ['Other'],
      })
    }
  })

  // Mark not_required when gate answers show benefit closed
  if (profile.answers.business_vehicle === 'no') {
    items
      .filter((i) => i.benefitId === 'mileage')
      .forEach((i) => {
        i.status = 'not_required'
      })
  }

  const vaultHasId = documents.some((d) => d.type === 'ID' && (d.status === 'extracted' || d.status === 'verified'))
  const vaultHasChildcare = documents.some((d) => d.type === 'Childcare')
  buildDependentDocumentChecklist(
    profile.dependents,
    profile.answers,
    profile.childcarePaid > 0,
    vaultHasId,
    false,
    false,
    vaultHasChildcare,
  ).forEach((d) => {
    push({
      id: d.id,
      benefitId: 'ctc',
      benefitName: d.dependentName,
      name: d.name,
      reason: d.reason,
      requiredForFiling: d.requiredForFiling,
      matchTypes: d.name.toLowerCase().includes('childcare') ? ['Childcare', 'ID'] : ['ID'],
      alternative: d.alternative,
      status:
        d.status === 'recommended'
          ? 'needed'
          : d.status === 'needed' || d.status === 'uploaded' || d.status === 'verified' || d.status === 'not_required'
            ? d.status
            : 'needed',
    })
  })

  // Deduplicate by id
  const byId = new Map<string, DocumentRequirement>()
  items.forEach((i) => {
    const existing = byId.get(i.id)
    if (!existing || existing.status === 'needed') byId.set(i.id, i)
  })

  return Array.from(byId.values()).filter((i) => i.status !== 'not_required')
}

export function documentsStillNeeded(checklist: DocumentRequirement[]) {
  return checklist.filter((i) => i.status === 'needed' || i.status === 'under_review')
}
