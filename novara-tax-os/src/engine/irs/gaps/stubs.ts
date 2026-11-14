/**
 * Explicit unsupported stubs — not complete implementations.
 * Calling these returns status markers only; no fake tax results.
 */

export type StubResult = {
  form: string
  supported: false
  message: string
  nextStep: string
}

export function stubForm8962(): StubResult {
  return {
    form: 'Form 8962',
    supported: false,
    message: 'Full Form 8962 not implemented; only simplified PTC estimate exists in federalReturn.',
    nextStep: 'Approve isolated form8962.ts + Pub 974 golden fixtures before implementation.',
  }
}

export function stubForm8995A(): StubResult {
  return {
    form: 'Form 8995-A',
    supported: false,
    message: 'Complex QBI (SSTB / W-2 / UBIA) not implemented; Form 8995 simplified path only.',
    nextStep: 'Approve form8995A.ts after W-2 wage and UBIA inputs exist.',
  }
}

export function stubForm8863(): StubResult {
  return {
    form: 'Form 8863',
    supported: false,
    message: 'Education credits (AOTC/LLC) not implemented.',
    nextStep: 'Approve educationCredits.ts + Form 8863 instruction golden fixtures.',
  }
}

export function stubScheduleB(): StubResult {
  return {
    form: 'Schedule B',
    supported: false,
    message: 'Interest and dividend Schedule B not implemented.',
    nextStep: 'Approve scheduleB.ts after 1099-INT/DIV structured inputs.',
  }
}

export function stubScheduleD(): StubResult {
  return {
    form: 'Schedule D',
    supported: false,
    message: 'Capital gains Schedule D / QD-LTCG worksheet not implemented.',
    nextStep: 'Approve scheduleD.ts with Form 8949 golden fixtures.',
  }
}

export function stubScheduleE(): StubResult {
  return {
    form: 'Schedule E',
    supported: false,
    message: 'Supplemental income Schedule E not implemented.',
    nextStep: 'Approve scheduleE.ts; passive loss rules remain unsupported until specified.',
  }
}

export function stubAmendedRecalc(): StubResult {
  return {
    form: 'Form 1040-X',
    supported: false,
    message: 'Amended recalculation via IRS engine not wired; amendments workflow unchanged.',
    nextStep: 'Approve amendedRecalc.ts after dual-run parity; do not alter amendments UI until then.',
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
