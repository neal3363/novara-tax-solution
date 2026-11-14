/**
 * Security remediation negative + positive tests (synthetic only).
 * productionEnforcement remains OFF.
 */
process.env.NOVARA_STAGING_SECURITY_API = "1"
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-sec-remediation')
mkdirSync(tmp, { recursive: true })
const durable = mkdtempSync(join(tmpdir(), 'novara-sec-'))

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import {
  resetRemediationForTests,
  assertRemediationStagingOnly,
  getRemediationFlags,
  requestPasswordReset,
  completePasswordReset,
  stagingSetPasswordForTests,
  stagingVerifyPassword,
  checkLoginBruteForce,
  resetRateLimitForTests,
  issueCsrfToken,
  verifyCsrfToken,
  escapeHtml,
  rejectDangerousMarkup,
  redactSensitive,
  assertSafeIdentifier,
  assertNoSqlMeta,
  assertNoPathTraversal,
  simulateBackupAndRestore,
  createShortLivedSession,
  assertSessionInvalidAfterRevoke,
  assertSessionExpires,
  syntheticPrincipal,
  createSession,
  remediationSummary,
} from '../src/engine/remediation/index.ts'
import {
  stagingBeginEnrollment,
  stagingConfirmEnrollment,
  stagingRecoverWithCode,
  stagingAdminResetMfa,
  stagingGenerateTotp,
  stagingMfaStatus,
  resetStagingForTests,
  bootstrapStagingSecurity,
  serverAuthorize,
} from '../src/engine/security/phase7/index.ts'
import { resetSessionStoreForTests, resetMfaStoreForTests } from '../src/engine/security/phase6/index.ts'
process.env.NOVARA_STAGING_SECURITY_API = '1'
import * as PwApi from '../../staging-security-api/security/password-reset.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const DURABLE = ${JSON.stringify(durable)}
resetRemediationForTests()
resetSessionStoreForTests()
resetMfaStoreForTests()
resetStagingForTests(DURABLE)
bootstrapStagingSecurity({ durableRoot: DURABLE })

assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'pricing intact')
assert(getRemediationFlags().productionEnforcement === false, 'productionEnforcement false')
assertRemediationStagingOnly()

console.log('=== Password recovery ===')
stagingSetPasswordForTests('user-1', 'OldPass12345')
assert(stagingVerifyPassword('user-1', 'OldPass12345'), 'old password works')
const unknown = requestPasswordReset({ email: 'nobody@synthetic.test' })
assert(unknown.accepted && !unknown.rawToken, 'anti-enumeration unknown email')
const req = requestPasswordReset({ email: 'u@synthetic.test', principalIdIfKnown: 'user-1' })
assert(Boolean(req.rawToken), 'token issued for known principal')
const badComplete = completePasswordReset({ rawToken: 'bogus', newPassword: 'NewPass12345' })
assert(!badComplete.ok, 'bogus token rejected')
const weak = completePasswordReset({ rawToken: req.rawToken!, newPassword: 'short' })
assert(!weak.ok, 'weak password rejected')
const ok = completePasswordReset({ rawToken: req.rawToken!, newPassword: 'NewPass12345' })
assert(ok.ok && stagingVerifyPassword('user-1', 'NewPass12345'), 'password reset completed')
assert(!stagingVerifyPassword('user-1', 'OldPass12345'), 'old password invalidated')
const reuse = completePasswordReset({ rawToken: req.rawToken!, newPassword: 'AnotherPass99' })
assert(!reuse.ok, 'single-use token')

console.log('=== Brute force / rate limit ===')
resetRateLimitForTests()
let locked = false
for (let i = 0; i < 7; i++) {
  const r = checkLoginBruteForce('attacker@synthetic.test')
  if (r.locked) locked = true
}
assert(locked, 'login brute-force lock engages')

console.log('=== CSRF / XSS / injection ===')
const csrf = issueCsrfToken('sess-1')
assert(verifyCsrfToken('sess-1', csrf.token, csrf.cookieValue), 'csrf valid')
assert(!verifyCsrfToken('sess-1', csrf.token, 'tampered'), 'csrf tamper rejected')
assert(!verifyCsrfToken('other', csrf.token, csrf.cookieValue), 'csrf session bind')
assert(escapeHtml('<script>') === '&lt;script&gt;', 'html escape')
assert(!rejectDangerousMarkup('<script>alert(1)</script>').ok, 'script rejected')
assert(rejectDangerousMarkup('John Smith').ok, 'safe text ok')
assert(redactSensitive('SSN 123-45-6789').includes('***-**-****'), 'ssn redacted')
try { assertNoSqlMeta("1; drop table"); assert(false, 'sql should throw') } catch { assert(true, 'sql meta rejected') }
try { assertNoPathTraversal('../etc/passwd'); assert(false, 'path should throw') } catch { assert(true, 'path traversal rejected') }
assert(assertSafeIdentifier('ten-1') === 'ten-1', 'safe id')

console.log('=== MFA enroll / recover / revoke ===')
const admin = syntheticPrincipal({
  id: 'adm-1', email: 'a@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-sec', officeId: 'off-1', officeManager: true, mfaEnrolled: false,
})
const user = syntheticPrincipal({
  id: 'usr-mfa', email: 'm@synthetic.test', role: 'preparer', accountType: 'office_preparer',
  tenantId: 'ten-sec', officeId: 'off-1', officeManager: false, mfaEnrolled: false,
})
const enroll = stagingBeginEnrollment('usr-mfa')
const code = stagingGenerateTotp(enroll.secretBase32)
assert(stagingConfirmEnrollment('usr-mfa', code), 'mfa enrolled')
assert(stagingMfaStatus('usr-mfa').enrolled === true, 'mfa status enrolled')
const recoveryOk = enroll.recoveryCodes.length > 0 && stagingRecoverWithCode('usr-mfa', enroll.recoveryCodes[0])
assert(recoveryOk, 'mfa recovery code works')
const sessAdmin = createSession({ principal: admin, fingerprintSalt: 'sec', mfaSatisfied: true })
const reset = stagingAdminResetMfa({ session: sessAdmin, admin, targetPrincipalId: 'usr-mfa' })
assert(reset.reset && reset.mandatoryStillOff, 'admin MFA revoke/reset; mandatory still OFF')

console.log('=== Session expiration / invalidation ===')
const sess = createShortLivedSession({
  principal: user, fingerprintSalt: 'sec', mfaSatisfied: true, ttlSec: 1,
})
assert(assertSessionInvalidAfterRevoke(createSession({ principal: user, fingerprintSalt: 'sec2', mfaSatisfied: true }).sessionId), 'revoke invalidates')
const expired = await assertSessionExpires(sess.sessionId, 1200)
assert(expired, 'short-lived session expires')

console.log('=== Backup restore simulation ===')
const bak = simulateBackupAndRestore(DURABLE)
assert(bak.ok && bak.restored && bak.productionReady === false, 'backup/restore simulation')

console.log('=== Authz isolation still holds ===')
const cross = serverAuthorize({ sessionId: sessAdmin.sessionId, action: 'billing.read', resourceTenantId: 'ten-other' })
assert(!cross.allowed, 'cross-tenant still denied')

console.log('=== Password reset API ===')
const status = await PwApi.GET()
assert(status.status === 200, 'password-reset status API')
const reqApi = await PwApi.POST(new Request('http://local/api/security/password-reset', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'request', email: 'x@synthetic.test' }),
}))
assert(reqApi.status === 200 && (await reqApi.json()).accepted === true, 'API request anti-enum')

console.log(remediationSummary())
console.log('=== SECURITY_REMEDIATION_OK failed=' + failed + ' ===')
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
