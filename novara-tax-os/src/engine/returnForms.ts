import type { BenefitFinding } from './benefitOptimizer'

/** Map applied benefits onto working return form lines (TY2025 demo schedules). */
export function formMappingFor(ruleId: string): { form: string; field: string } {
  switch (ruleId) {
    case 'ctc':
      return { form: 'Form 1040', field: 'Schedule 8812 · Child tax credit' }
    case 'eitc':
      return { form: 'Form 1040', field: 'Line 27 · Earned income credit' }
    case 'cdcc':
      return { form: 'Form 2441', field: 'Line 11 · Credit for child and dependent care expenses' }
    case 'odc':
      return { form: 'Form 1040', field: 'Schedule 8812 · Credit for other dependents' }
    case 'hoh':
      return { form: 'Form 1040', field: 'Filing status · Head of household' }
    case 'aotc':
      return { form: 'Form 8863', field: 'American opportunity credit' }
    case 'llc':
      return { form: 'Form 8863', field: 'Lifetime learning credit' }
    case 'student_loan':
      return { form: 'Form 1040', field: 'Schedule 1 · Student loan interest deduction' }
    case 'savers':
      return { form: 'Form 8880', field: 'Credit for qualified retirement savings' }
    case 'hsa':
      return { form: 'Form 8889', field: 'HSA deduction' }
    case 'mortgage':
      return { form: 'Schedule A', field: 'Home mortgage interest' }
    case 'property_tax':
      return { form: 'Schedule A', field: 'State and local real estate taxes' }
    case 'energy':
      return { form: 'Form 5695', field: 'Residential energy credits' }
    case 'qbi':
      return { form: 'Form 8995', field: 'Qualified business income deduction' }
    case 'se_health':
      return { form: 'Schedule 1', field: 'Self-employed health insurance deduction' }
    case 'mileage':
      return { form: 'Schedule C', field: 'Car and truck expenses' }
    case 'charity':
      return { form: 'Schedule A', field: 'Gifts to charity' }
    case 'medical':
      return { form: 'Schedule A', field: 'Medical and dental expenses' }
    case 'educator':
      return { form: 'Schedule 1', field: 'Educator expenses' }
    case 'ptc':
      return { form: 'Form 8962', field: 'Premium tax credit' }
    case 'state_eitc':
      return { form: 'State return', field: 'State earned income credit' }
    default:
      return { form: 'Form 1040', field: `Benefit · ${ruleId}` }
  }
}

export function buildAppliedFormLines(findings: BenefitFinding[]) {
  return findings
    .filter((f) => f.status === 'applied' || f.status === 'pending_verification')
    .filter((f) => f.affectingRefund > 0)
    .map((f) => {
      const map = formMappingFor(f.ruleId)
      return {
        id: `fl-${f.ruleId}`,
        ruleId: f.ruleId,
        name: f.shortName,
        form: map.form,
        field: map.field,
        amount: f.affectingRefund,
        status: f.status,
        docStatus: f.docStatus,
        citation: f.ruleCitation,
      }
    })
}
