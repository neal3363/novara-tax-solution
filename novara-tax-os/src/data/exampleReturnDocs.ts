/**
 * Front-page example: every document that typically finishes a household return,
 * what savings each form unlocks, and how NOVARA asks only what’s left after seeing them.
 */

export interface ExampleReturnDoc {
  form: string
  unlocks: string
  /** Demo savings hint shown on the landing example (not a guaranteed refund). */
  moneyHint: string
}

/** Full example set — upload these to maximize a typical family return. */
export const EXAMPLE_RETURN_DOCS: ExampleReturnDoc[] = [
  {
    form: 'Driver’s license / photo ID',
    unlocks: 'Name, address, date of birth — filing state from your address',
    moneyHint: 'Sets your state credit rules',
  },
  {
    form: 'Social Security card (you + each dependent)',
    unlocks: 'Identity for CTC, EITC, and dependent credits',
    moneyHint: 'Up to $2,000 CTC per child',
  },
  {
    form: 'Form W-2 (each job)',
    unlocks: 'Wages, withholding, earned-income credits',
    moneyHint: 'EITC + withholding refund',
  },
  {
    form: 'Form 1099-NEC / 1099s (side work)',
    unlocks: 'Self-employment income + QBI deduction',
    moneyHint: 'Up to 20% QBI',
  },
  {
    form: 'Form 1098 (mortgage)',
    unlocks: 'Mortgage interest & property tax paid by lender',
    moneyHint: 'Itemized / home deductions',
  },
  {
    form: 'Form 1098-T (tuition)',
    unlocks: 'American Opportunity / lifetime learning credits',
    moneyHint: 'Up to $2,500 AOTC',
  },
  {
    form: 'Form 1098-E (student loan interest)',
    unlocks: 'Student loan interest deduction',
    moneyHint: 'Up to $2,500 interest',
  },
  {
    form: 'Childcare payment / provider statement',
    unlocks: 'Child and Dependent Care Credit',
    moneyHint: 'Up to $2,100 CDCC',
  },
  {
    form: 'Form 1095-A (Marketplace) — only if you had it',
    unlocks: 'Premium Tax Credit reconciliation',
    moneyHint: 'Health credit / avoid surprise',
  },
  {
    form: 'Charity / medical receipts — only if not on other forms',
    unlocks: 'Optional itemized deductions beyond what docs already prove',
    moneyHint: 'Extra savings if it beats standard',
  },
]

export const EXAMPLE_FLOW_POINTS = [
  'Upload every document you have at once — NOVARA sorts ID, income, and credit forms automatically.',
  'Once the system sees those forms, it already knows most answers. It only asks what’s still missing or needs something else beyond the form.',
  'Each form generates money on the return: wages/withholding from W-2s, QBI from 1099s, education from 1098-T, childcare from care statements, and more.',
  'State laws differ. Some states add EITC or other credits on top of federal; Texas and Florida have no state income tax. NOVARA applies your state’s rules from your address.',
]
