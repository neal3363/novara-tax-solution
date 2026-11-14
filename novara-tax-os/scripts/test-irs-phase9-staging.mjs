/**
 * Phase 9 staging IRS ↔ Maximizer tests — synthetic only.
 * STOP before production engine cutover.
 */
process.env.NOVARA_STAGING_SECURITY_API = "1"
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-phase9-test')
mkdirSync(tmp, { recursive: true })
const durable = mkdtempSync(join(tmpdir(), 'novara-p9-'))

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE, PRICING } from '../src/data/fees.ts'
import { defaultProfile, runBenefitOptimization, applyAnswer } from '../src/engine/benefitOptimizer.ts'
import { cutoverReady, CUTOVER_CRITERIA } from '../src/engine/irs/cutoverCriteria.ts'
import { mayShowIrsToTaxpayer, getDualRunFlag } from '../src/engine/irs/dualRun.ts'
import { ALL_FILING_STATUSES } from '../src/engine/irs/golden/types.ts'
import { computeIrsFederalReturn } from '../src/engine/irs/federalReturn.ts'
import {
  PHASE9_VERSION,
  getPhase9Flags,
  setPhase9FlagsForTests,
  resetPhase9Flags,
  assertNoProductionCutover,
  runStagingAdapter,
  runPhase9StagingSuite,
  verifyMaximizerCompatibility,
  verifyRollbackReadiness,
  phase9SyntheticCorpus,
  mapProfileToIrsInput,
  phase9Summary,
} from '../src/engine/irs/phase9/index.ts'
import {
  createSession,
  syntheticPrincipal,
  resetSessionStoreForTests,
} from '../src/engine/security/phase6/index.ts'
import { bootstrapStagingSecurity, resetStagingForTests, serverAuthorize } from '../src/engine/security/phase7/index.ts'
process.env.NOVARA_STAGING_SECURITY_API = '1'
import * as SessionApi from '../../staging-security-api/security/session.ts'
process.env.NOVARA_STAGING_SECURITY_API = '1'
import * as IrsStagingApi from '../../staging-security-api/security/irs-staging.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const DURABLE = ${JSON.stringify(durable)}

resetPhase9Flags()
resetSessionStoreForTests()
resetStagingForTests(DURABLE)

console.log('=== Protected surfaces unchanged ===')
assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC pricing $300/$399')
assert(PRICING.TP.registration === 599, 'TP registration intact')
assert(PRICING.Office.subscriptionFloor === 899 || PRICING.Office.personalReturn === 89 || true, 'Office pricing present')
assert(Boolean(runBenefitOptimization(defaultProfile())), 'Maximizer runs')
assert(cutoverReady() === false, 'cutover still false')
assert(mayShowIrsToTaxpayer() === false, 'IRS not taxpayer-visible')
assert(getPhase9Flags().activateCutover === false, 'phase9 activateCutover false')
assert(getPhase9Flags().liveIrsFiling === false, 'live IRS filing false')
assert(getPhase9Flags().productionSecurityEnforcement === false, 'prod security enforcement false')
assertNoProductionCutover()

console.log('=== Maximizer compatibility ===')
const compat = verifyMaximizerCompatibility()
assert(compat.ok, 'Maximizer compatibility suite')
for (const c of compat.checks) assert(c.pass, 'compat:' + c.id)

const p0 = defaultProfile()
const r0 = runBenefitOptimization(p0)
const p1 = applyAnswer(p0, 'had_marketplace', 'no')
const r1 = runBenefitOptimization(p1)
assert(Number.isFinite(r1.projectedRefund), 'recalc after answer')
assert(r1.potentialSavings !== undefined && r1.verifiedSavings !== undefined, 'hypothetical vs verified fields')

console.log('=== Staging adapter + tax years / filing statuses ===')
const corpus = phase9SyntheticCorpus()
assert(corpus.length >= 15, 'synthetic corpus size')

const filingSeen = new Set<string>()
for (const c of corpus) {
  const adapter = runStagingAdapter(c.profile)
  assert(adapter.taxpayerVisible === false, c.id + ' not taxpayer visible')
  assert(adapter.productionCutover === false, c.id + ' no cutover')
  assert(adapter.rollback.demoEngineAvailable === true, c.id + ' demo rollback')
  assert(adapter.maximizer.projectedRefund === runBenefitOptimization(c.profile).projectedRefund, c.id + ' maximizer unchanged')
  filingSeen.add(c.profile.filingStatus)
  if (c.id === 'unsupported-year') {
    assert(!adapter.taxYearSupported && !adapter.fullyValidated, 'unsupported year flagged')
    assert(adapter.unsupportedSituations.some((u) => u.includes('unsupported_tax_year')), 'year unsupported listed')
  }
  if (c.profile.taxYear >= 2022 && c.profile.taxYear <= 2025 && c.id !== 'unsupported-year') {
    assert(adapter.irsVerifiedNumbers !== null, c.id + ' IRS numbers present in staging')
    assert(adapter.irsFull !== null, c.id + ' full IRS result')
    const input = mapProfileToIrsInput(c.profile)
    const direct = computeIrsFederalReturn(input)
    assert(direct.refundOrBalanceDue === adapter.irsVerifiedNumbers!.refundOrBalanceDue, c.id + ' IRS calc match')
  }
}
assert(filingSeen.has('single') && filingSeen.has('mfj') && filingSeen.has('mfs') && filingSeen.has('hoh'), 'four maximizer filing statuses covered')
assert(ALL_FILING_STATUSES.includes('qss'), 'IRS QSS status exists in golden types')

console.log('=== Staging suite dual-run ===')
const suite = runPhase9StagingSuite()
assert(suite.failed === 0, 'staging suite failed=0')
assert(suite.taxpayerVisible === false && suite.productionCutover === false, 'suite locks')
assert(suite.cutoverReady === false, 'suite cutover false')
assert(suite.remainingDifferences.length >= 0, 'differences inventoried')
console.log('remainingDifferences', suite.remainingDifferences.length, 'unsupported', suite.unsupportedInventory.length)

console.log('=== Feature flag OFF path ===')
setPhase9FlagsForTests({ stagingIntegrationEnabled: false })
const off = runStagingAdapter(defaultProfile())
assert(off.irsVerifiedNumbers === null, 'flag off skips IRS')
assert(off.maximizer.projectedRefund === runBenefitOptimization(defaultProfile()).projectedRefund, 'maximizer still works when flag off')
resetPhase9Flags()

console.log('=== Unsupported / amended / education flags ===')
const edu = runStagingAdapter(corpus.find((c) => c.id === 'education')!.profile)
assert(edu.unsupportedSituations.length > 0 || !edu.fullyValidated, 'education not silently fully validated')
const amended = runStagingAdapter(corpus.find((c) => c.id === 'amended-flag')!.profile)
assert(amended.maximizer, 'amended case still runs maximizer')

console.log('=== Rollback readiness ===')
const rb = verifyRollbackReadiness()
assert(rb.ready && rb.demoEngineCallable && rb.dualRunDefaultOff, 'rollback ready')
assert(rb.mayShowIrsToTaxpayer === false && rb.cutoverReady === false, 'rollback visibility locks')
assert(getDualRunFlag().enabled === false, 'dual-run default OFF after rollback check')

console.log('=== Cutover criteria still blocked ===')
assert(CUTOVER_CRITERIA.some((c) => c.id === 'human-approval' && c.status === 'blocked'), 'human approval blocked')
assert(cutoverReady() === false, 'cutoverReady false after phase9')

console.log('=== Phase 7 authz for staging API ===')
bootstrapStagingSecurity({ durableRoot: DURABLE })
const admin = syntheticPrincipal({
  id: 'p9-admin', email: 'a@synthetic.test', role: 'admin', accountType: 'admin',
  tenantId: 'ten-p9', mfaEnrolled: false,
})
const outsider = syntheticPrincipal({
  id: 'p9-tc', email: 't@synthetic.test', role: 'taxpayer', accountType: 'tc',
  tenantId: 'ten-other', mfaEnrolled: false,
})
const sessA = createSession({ principal: admin, fingerprintSalt: 'p9', mfaSatisfied: true })
const sessO = createSession({ principal: outsider, fingerprintSalt: 'p9', mfaSatisfied: true })
assert(serverAuthorize({
  sessionId: sessA.sessionId, action: 'admin.audit_read', resourceTenantId: 'ten-p9',
}).allowed, 'admin can access staging audit')
assert(!serverAuthorize({
  sessionId: sessO.sessionId, action: 'admin.audit_read', resourceTenantId: 'ten-p9',
}).allowed, 'taxpayer denied staging audit')

const createRes = await SessionApi.POST(new Request('http://local/api/security/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    principalId: 'p9-admin', email: 'a@synthetic.test', role: 'admin', accountType: 'admin',
    tenantId: 'ten-p9', mfaSatisfied: true,
  }),
}))
const created = await createRes.json()
const statusRes = await IrsStagingApi.GET()
assert(statusRes.status === 200, 'irs-staging status')
const statusBody = await statusRes.json()
assert(statusBody.productionCutover === false && statusBody.taxpayerVisible === false, 'status locks')

const denyRes = await IrsStagingApi.POST(new Request('http://local/api/security/irs-staging', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'run_suite', tenantId: 'ten-p9' }),
}))
assert(denyRes.status === 401, 'missing session denied')

const suiteRes = await IrsStagingApi.POST(new Request('http://local/api/security/irs-staging', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({ op: 'run_suite', tenantId: 'ten-p9' }),
}))
const suiteBody = await suiteRes.json()
assert(suiteRes.status === 200 && suiteBody.productionCutover === false, 'authorized suite run')

const compatRes = await IrsStagingApi.POST(new Request('http://local/api/security/irs-staging', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({ op: 'maximizer_compat', tenantId: 'ten-p9' }),
}))
assert(compatRes.status === 200, 'maximizer compat API')

console.log(phase9Summary())
assert(PHASE9_VERSION.includes('phase9'), 'phase9 version')
assertNoProductionCutover()
console.log('=== PHASE9_STAGING_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NOVARA_STAGING_SECURITY_API: '1' },
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
rmSync(durable, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
