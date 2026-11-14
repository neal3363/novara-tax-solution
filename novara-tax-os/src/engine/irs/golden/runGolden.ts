import { computeIrsFederalReturn } from '../federalReturn'
import { GOLDEN_FIXTURES } from './fixtures'
import type { GoldenCheckResult, GoldenFixture, GoldenSuiteResult } from './types'

function checkField(
  fixture: GoldenFixture,
  field: string,
  expected: number | undefined,
  actual: number,
  tolerance = fixture.tolerance ?? 0,
): GoldenCheckResult | null {
  if (expected === undefined) return null
  const delta = actual - expected
  return {
    fixtureId: fixture.id,
    field,
    expected,
    actual,
    pass: Math.abs(delta) <= tolerance,
    delta,
  }
}

export function runGoldenFixture(fixture: GoldenFixture): GoldenCheckResult[] {
  const r = computeIrsFederalReturn(fixture.input)
  const e = fixture.expected
  const checks: (GoldenCheckResult | null)[] = [
    checkField(fixture, 'agi', e.agi, r.agi),
    checkField(fixture, 'standardDeduction', e.standardDeduction, r.standardDeduction),
    checkField(fixture, 'taxableIncome', e.taxableIncome, r.taxableIncome),
    checkField(fixture, 'incomeTaxBeforeCredits', e.incomeTaxBeforeCredits, r.incomeTaxBeforeCredits),
    checkField(fixture, 'seTax', e.seTax, r.seTax),
    checkField(fixture, 'ctcNonrefundable', e.ctcNonrefundable, r.ctc),
    checkField(fixture, 'actc', e.actc, r.actc),
    checkField(fixture, 'eitc', e.eitc, r.eitc),
    checkField(fixture, 'cdcc', e.cdcc, r.cdcc),
    checkField(fixture, 'qbiDeduction', e.qbiDeduction, r.qbiDeduction),
    checkField(fixture, 'ptc', e.ptc, r.ptc),
    checkField(fixture, 'excessAptcRepayment', e.excessAptcRepayment, r.excessAptcRepayment),
    checkField(fixture, 'educationNonrefundable', e.educationNonrefundable, r.educationNonrefundable),
    checkField(fixture, 'educationRefundable', e.educationRefundable, r.educationRefundable),
    checkField(fixture, 'amt', e.amt, r.amt),
    checkField(fixture, 'niit', e.niit, r.niit),
    checkField(fixture, 'scheduleBInterestDividends', e.scheduleBInterestDividends, r.scheduleBInterestDividends),
    checkField(fixture, 'scheduleDNet', e.scheduleDNet, r.scheduleDNet),
    checkField(fixture, 'scheduleENet', e.scheduleENet, r.scheduleENet),
    checkField(fixture, 'suspendedPassiveLoss', e.suspendedPassiveLoss, r.suspendedPassiveLoss),
    checkField(fixture, 'unrecaptured1250Applied', e.unrecaptured1250Applied, r.unrecaptured1250Applied),
    checkField(fixture, 'collectibles28Applied', e.collectibles28Applied, r.collectibles28Applied),
    checkField(fixture, 'refundOrBalanceDue', e.refundOrBalanceDue, r.refundOrBalanceDue),
  ]
  return checks.filter((c): c is GoldenCheckResult => c != null)
}

export function runAllGoldenFixtures(fixtures = GOLDEN_FIXTURES): GoldenSuiteResult {
  const results: GoldenCheckResult[] = []
  const fixtureSummaries: GoldenSuiteResult['fixtureSummaries'] = []
  for (const f of fixtures) {
    const checks = runGoldenFixture(f)
    results.push(...checks)
    fixtureSummaries.push({
      id: f.id,
      label: f.label,
      allPass: checks.every((c) => c.pass),
    })
  }
  return {
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
    fixtureSummaries,
  }
}
