/**
 * Phase 4 readiness probes — modules exist in isolation but are NOT production-ready.
 * Calling these does not activate UI or Maximizer wiring.
 */

export type StubResult = {
  form: string
  /** Isolated engine has a calculation path */
  isolatedImplemented: boolean
  supported: boolean
  productionReady: false
  readiness: 'isolated-validated' | 'isolated-partial' | 'unsupported'
  message: string
  nextStep: string
}

export function stubForm8962(): StubResult {
  return {
    form: 'Form 8962',
    isolatedImplemented: true,
    supported: true,
    productionReady: false,
    readiness: 'isolated-validated',
    message: 'Isolated Form 8962 with SLCSP benchmark + APTC repayment; golden-tested. Not production-ready.',
    nextStep: 'Keep dual-run only until cutover approval.',
  }
}

export function stubForm8995A(): StubResult {
  return {
    form: 'Form 8995-A',
    isolatedImplemented: true,
    supported: true,
    productionReady: false,
    readiness: 'isolated-validated',
    message: 'Isolated Form 8995-A wage/UBIA/SSTB paths. Not production-ready.',
    nextStep: 'Keep dual-run only until cutover approval.',
  }
}

export function stubForm8863(): StubResult {
  return {
    form: 'Form 8863',
    isolatedImplemented: true,
    supported: true,
    productionReady: false,
    readiness: 'isolated-validated',
    message: 'Isolated Form 8863 AOTC/LLC. Not production-ready.',
    nextStep: 'Keep dual-run only until cutover approval.',
  }
}

export function stubScheduleB(): StubResult {
  return {
    form: 'Schedule B',
    isolatedImplemented: true,
    supported: true,
    productionReady: false,
    readiness: 'isolated-validated',
    message: 'Isolated Schedule B. Not production-ready.',
    nextStep: 'Keep dual-run only until cutover approval.',
  }
}

export function stubScheduleD(): StubResult {
  return {
    form: 'Schedule D',
    isolatedImplemented: true,
    supported: true,
    productionReady: false,
    readiness: 'isolated-validated',
    message: 'Isolated Schedule D + QD/LTCG worksheet themes. Not production-ready.',
    nextStep: 'Keep dual-run only until cutover approval.',
  }
}

export function stubScheduleE(): StubResult {
  return {
    form: 'Schedule E',
    isolatedImplemented: true,
    supported: true,
    productionReady: false,
    readiness: 'isolated-validated',
    message: 'Isolated Schedule E with Form 8582; PTP/REP edge cases may be unsupported. Not production-ready.',
    nextStep: 'Keep dual-run/shadow only until cutover approval.',
  }
}

export function stubAmendedRecalc(): StubResult {
  return {
    form: 'Form 1040-X',
    isolatedImplemented: true,
    supported: true,
    productionReady: false,
    readiness: 'isolated-validated',
    message: 'Isolated 1040-X recalc via IRS engine; amendments UI unchanged.',
    nextStep: 'Do not wire amendments UI until cutover approval.',
  }
}

export const ALL_STUBS = [
  stubForm8962,
  stubForm8995A,
  stubForm8863,
  stubScheduleB,
  stubScheduleD,
  stubScheduleE,
  stubAmendedRecalc,
] as const
