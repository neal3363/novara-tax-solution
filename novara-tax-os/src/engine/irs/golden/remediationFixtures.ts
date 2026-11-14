/**
 * Independent golden fixtures for tax remediation (WS2–4).
 * Synthetic only — not filing-ready; production cutover remains OFF.
 */

export const REMEDIATION_GOLDEN_FIXTURES = [
  {
    id: 'hsa-8889-under-limit-2025',
    form: 'Form 8889',
    taxYear: 2025,
    input: { contributions: 4000, annualLimit: 4300 },
    expect: { deductibleContribution: 4000, excessContribution: 0 },
    source: 'IRS Form 8889 / Pub 969 TY2025 self-only limit theme $4,300',
    productionReady: false as const,
  },
  {
    id: 'hsa-8889-excess-2025',
    form: 'Form 8889',
    taxYear: 2025,
    input: { contributions: 6000, annualLimit: 4300 },
    expect: { deductibleContribution: 4300, excessContribution: 1700 },
    source: 'IRS Form 8889 excess contribution theme',
    productionReady: false as const,
  },
  {
    id: 'energy-5695-cap-2025',
    form: 'Form 5695',
    taxYear: 2025,
    input: { qualifiedImprovementSpend: 5000, creditRate: 0.3, annualCap: 1200 },
    expect: { creditBeforeTaxLimit: 1200, fullyMapped: false },
    source: 'IRS Form 5695 IRA energy credit themes (partial product-category mapping)',
    productionReady: false as const,
  },
  {
    id: 'ira-full-deductible-no-workplace-2025',
    form: 'IRA Deduction',
    taxYear: 2025,
    input: {
      contributions: 7000,
      filingStatus: 'single' as const,
      magi: 50000,
      coveredByWorkplacePlan: false,
    },
    expect: { deductible: 7000 },
    source: 'IRS Pub 590-A traditional IRA limit theme $7,000 (under 50)',
    productionReady: false as const,
  },
  {
    id: 'ira-phased-out-workplace-2025',
    form: 'IRA Deduction',
    taxYear: 2025,
    input: {
      contributions: 7000,
      filingStatus: 'single' as const,
      magi: 90000,
      coveredByWorkplacePlan: true,
    },
    expect: { deductible: 0 },
    source: 'IRS Pub 590-A simplified phaseout end for single covered (~$87,000 staging anchor)',
    productionReady: false as const,
  },
  {
    id: 'ca-540nr-nonresident-allocation',
    form: 'CA 540NR worksheet',
    taxYear: 2025,
    input: {
      residency: 'nonresident' as const,
      wagesInState: 25000,
      wagesOutOfState: 75000,
      federalAgi: 100000,
    },
    expect: { californiaSourceIncome: 25000, productionReady: false },
    source: 'CA FTB Form 540NR allocation themes (staging ratio model)',
    productionReady: false as const,
  },
  {
    id: 'ny-it-local-excluded',
    form: 'NY IT-201/203 worksheet',
    taxYear: 2025,
    input: { residency: 'part_year' as const, monthsResident: 6 },
    expect: { localTaxIncluded: false },
    source: 'NY IT instructions — NYC/Yonkers explicitly out of scope',
    productionReady: false as const,
  },
  {
    id: 'dep-macrs5-sec179',
    form: 'Depreciation helper',
    taxYear: 2025,
    input: { costBasis: 10000, section179Election: 2000, recoveryYears: 5 as const, yearInService: 1 },
    expect: { section179: 2000, macrs: 1600, total: 3600 },
    source: 'IRS Pub 946 half-year MACRS 5-year year-1 20%',
    productionReady: false as const,
  },
  {
    id: 'k1-1065-60-40',
    form: 'Form 1065 / Schedule K-1',
    taxYear: 2025,
    input: {
      grossReceipts: 100000,
      ordinaryExpenses: 40000,
      depreciationExpense: 10000,
      partners: [
        { id: 'a', ownershipPercent: 60 },
        { id: 'b', ownershipPercent: 40 },
      ],
    },
    expect: { ordinaryBusinessIncome: 50000, k1a: 30000, k1b: 20000, liveEfile: false },
    source: 'IRS Form 1065 / Schedule K-1 pass-through allocation themes',
    productionReady: false as const,
  },
] as const

export const REMEDIATION_GOLDEN_IDS = REMEDIATION_GOLDEN_FIXTURES.map((f) => f.id)
