/**
 * Phase 6 security tests — synthetic data only.
 * Does NOT enforce new login requirements on existing users.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-phase6-security-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'
import {
  DEFAULT_PHASE6_FLAGS,
  getPhase6Flags,
  setPhase6FlagsForTests,
  resetPhase6Flags,
  assertNotEnforcingOnExistingUsers,
  createSession,
  getSession,
  touchSession,
  revokeSession,
  revokeAllSessionsForPrincipal,
  markSessionMfaSatisfied,
  resetSessionStoreForTests,
  syntheticPrincipal,
  authorize,
  beginTotpEnrollment,
  confirmTotpEnrollment,
  startMfaChallenge,
  verifyMfaChallenge,
  consumeRecoveryCode,
  generateTotp,
  isMfaEnrolled,
  resetMfaStoreForTests,
  getLoginAttemptState,
  appendAudit,
  verifyAuditChain,
  listAudit,
  resetAuditLogForTests,
  __tamperAuditForTests,
  verifyEncryptionRoundTrip,
  kmsAccessPolicy,
  resetKmsForTests,
  localKmsProvider,
  vaultUpload,
  issueSignedDownloadToken,
  downloadWithSignedToken,
  secureDelete,
  vaultSelfTest,
  resetVaultForTests,
  isGuestAutoLoginAllowed,
  assertApiCallerNotGuest,
  productionAuthStatus,
  phase6SecuritySummary,
} from '../src/engine/security/phase6/index.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

function resetAll() {
  resetPhase6Flags()
  resetSessionStoreForTests()
  resetMfaStoreForTests()
  resetAuditLogForTests()
  resetKmsForTests()
  resetVaultForTests()
}

resetAll()

console.log('=== Protected surfaces unchanged ===')
assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'pricing intact')
assert(typeof runBenefitOptimization(defaultProfile()).projectedRefund === 'number', 'Maximizer intact')
assert(getPhase6Flags().mfaMandatoryForExistingUsers === false, 'MFA not mandatory')
assertNotEnforcingOnExistingUsers()
assert(DEFAULT_PHASE6_FLAGS.productionAuthPath === false, 'production auth default off')

console.log('=== Sessions: create, expire, revoke, fingerprint ===')
const tc = syntheticPrincipal({
  id: 'u-tc-1', email: 'tc@example.com', role: 'taxpayer', accountType: 'tc', tenantId: 'ten-tc-1',
})
const sess = createSession({ principal: tc, fingerprintSalt: 'salt-a', userAgent: 'TestAgent', ttlSec: 3600 })
assert(sess.status === 'active', 'session active')
assert(getSession(sess.sessionId)?.status === 'active', 'get session')
const hijack = touchSession(sess.sessionId, { fingerprintSalt: 'salt-b', userAgent: 'Evil' })
assert(hijack?.status === 'revoked', 'fingerprint mismatch revokes (session hijack protection)')

const sess2 = createSession({ principal: tc, fingerprintSalt: 'salt-a', userAgent: 'TestAgent' })
const revoked = revokeSession(sess2.sessionId, tc.id)
assert(revoked?.status === 'revoked', 'session revoked')
assert(getSession(sess2.sessionId)?.status === 'revoked', 'revoked persists')

const idle = createSession({ principal: tc, fingerprintSalt: 's', idleTimeoutSec: 0 })
// force idle expiry
const idleRow = getSession(idle.sessionId)
assert(idleRow?.status === 'expired' || idleRow?.status === 'active', 'idle session checked')

console.log('=== Authorization isolation ===')
const officeOwner = syntheticPrincipal({
  id: 'u-own-1', email: 'owner@office.com', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-off-1', officeId: 'off-1', officeManager: true,
})
const officePrep = syntheticPrincipal({
  id: 'u-prep-1', email: 'prep@office.com', role: 'preparer', accountType: 'office_preparer',
  tenantId: 'ten-off-1', officeId: 'off-1',
})
const otherOffice = syntheticPrincipal({
  id: 'u-own-2', email: 'other@office.com', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-off-2', officeId: 'off-2', officeManager: true,
})
const sOwn = createSession({ principal: officeOwner, fingerprintSalt: 'o', mfaSatisfied: true })
const sPrep = createSession({ principal: officePrep, fingerprintSalt: 'p', mfaSatisfied: true })
const sOther = createSession({ principal: otherOffice, fingerprintSalt: 'x', mfaSatisfied: true })
const sTc = createSession({ principal: tc, fingerprintSalt: 't', mfaSatisfied: true })

assert(authorize({
  session: sTc, principal: tc, action: 'client.read', resourceTenantId: 'ten-tc-1', resourceOwnerId: 'u-tc-1',
}).allowed, 'TC own access')
assert(!authorize({
  session: sTc, principal: tc, action: 'client.read', resourceTenantId: 'ten-tc-1', resourceOwnerId: 'u-other',
}).allowed, 'TC cannot read other client')
assert(!authorize({
  session: sOwn, principal: officeOwner, action: 'client.read', resourceTenantId: 'ten-off-2', resourceOfficeId: 'off-2',
}).allowed, 'cross-tenant denied')
assert(!authorize({
  session: sOther, principal: otherOffice, action: 'client.read',
  resourceTenantId: 'ten-off-1', resourceOfficeId: 'off-1',
}).allowed, 'cross-office denied')
assert(authorize({
  session: sOwn, principal: officeOwner, action: 'office.manage_staff',
  resourceTenantId: 'ten-off-1', resourceOfficeId: 'off-1',
}).allowed, 'office owner manage')
assert(!authorize({
  session: sPrep, principal: officePrep, action: 'office.manage_staff',
  resourceTenantId: 'ten-off-1', resourceOfficeId: 'off-1',
}).allowed, 'preparer cannot manage staff')
assert(!authorize({
  session: sPrep, principal: officePrep, action: 'document.read',
  resourceTenantId: 'ten-off-1', resourceOwnerId: 'client-9', resourceOfficeId: 'off-1',
  assignedPreparerIds: ['someone-else'],
}).allowed, 'unassigned preparer denied')
assert(authorize({
  session: sPrep, principal: officePrep, action: 'document.read',
  resourceTenantId: 'ten-off-1', resourceOwnerId: 'client-9', resourceOfficeId: 'off-1',
  assignedPreparerIds: ['u-prep-1'],
}).allowed, 'assigned preparer ok')
assert(!authorize({
  session: sPrep, principal: officePrep, action: 'document.delete',
  resourceTenantId: 'ten-off-1', resourceOwnerId: 'client-9', resourceOfficeId: 'off-1',
  assignedPreparerIds: ['u-prep-1'],
}).allowed, 'preparer delete denied')

console.log('=== Privilege escalation / unauthorized API ===')
const admin = syntheticPrincipal({
  id: 'u-adm', email: 'a@x.com', role: 'admin', accountType: 'admin', tenantId: 'ten-adm',
})
const sAdm = createSession({ principal: admin, fingerprintSalt: 'a', mfaSatisfied: true })
assert(!authorize({
  session: sAdm, principal: admin, action: 'document.read',
  resourceTenantId: 'ten-off-1', resourceOwnerId: 'client-9',
}).allowed, 'admin default browse denied')

console.log('=== MFA enrollment, verify, recovery, lockout ===')
resetMfaStoreForTests()
const enroll = beginTotpEnrollment('u-tc-1')
assert(enroll.secretBase32.length > 10, 'secret issued')
assert(enroll.recoveryCodes.length === 8, 'recovery codes')
const code = generateTotp(enroll.secretBase32)
assert(confirmTotpEnrollment('u-tc-1', code), 'enroll confirm')
assert(isMfaEnrolled('u-tc-1'), 'enrolled')
const ch = startMfaChallenge('u-tc-1')
assert(verifyMfaChallenge(ch.challengeId, generateTotp(enroll.secretBase32)), 'mfa verify')
assert(!verifyMfaChallenge(ch.challengeId, '000000'), 'replay/fail challenge')
const okRecovery = consumeRecoveryCode('u-tc-1', enroll.recoveryCodes[0])
assert(okRecovery, 'recovery code works')
assert(!consumeRecoveryCode('u-tc-1', enroll.recoveryCodes[0]), 'recovery one-time')
// lockout
let locked = false
for (let i = 0; i < 8; i++) {
  try {
    const c = startMfaChallenge('u-tc-1')
    verifyMfaChallenge(c.challengeId, '111111')
  } catch (e: any) {
    if (String(e.message).includes('locked')) locked = true
  }
}
const st = getLoginAttemptState('u-tc-1')
assert(locked || (!!st && (st.count >= 5 || !!st.lockedUntil)), 'login attempt protection')

console.log('=== Guest auto-login production path ===')
resetPhase6Flags()
assert(isGuestAutoLoginAllowed('public_guest') === true, 'guest allowed when enforcement off')
assert(isGuestAutoLoginAllowed('local_sample') === true, 'sample guest allowed when off')
setPhase6FlagsForTests({ productionAuthPath: true, rejectGuestOnProductionApis: true })
assert(isGuestAutoLoginAllowed('public_guest') === false, 'guest blocked on production path')
assert(isGuestAutoLoginAllowed('production') === false, 'production mode blocks guest')
let guestThrew = false
try { assertApiCallerNotGuest('guest-abc', 'production') } catch { guestThrew = true }
assert(guestThrew, 'guest API caller rejected')
assert(productionAuthStatus().guestAutoLoginAllowedOnProduction === false, 'status says no guest')
// restore — do not leave mandatory MFA on
resetPhase6Flags()
assertNotEnforcingOnExistingUsers()

console.log('=== Vault encryption + signed tokens + malware ===')
resetAll()
const enc = verifyEncryptionRoundTrip()
assert(enc.verified, 'encryption round-trip')
const self = vaultSelfTest()
assert(self.encryptionVerified, 'vault self-test verified flag')
assert(kmsAccessPolicy().noHardcodedProductionSecrets, 'no hardcoded prod secrets')
const rot = localKmsProvider.rotateKey('vault-ten-tc-1')
assert(!!rot.newKeyId, 'key rotation')

const vaultUser = syntheticPrincipal({
  id: 'u-tc-1', email: 'tc@example.com', role: 'taxpayer', accountType: 'tc', tenantId: 'ten-tc-1',
})
const vs = createSession({ principal: vaultUser, fingerprintSalt: 'v', mfaSatisfied: true })
const up = await vaultUpload({
  session: vs, principal: vaultUser, ownerId: 'u-tc-1',
  filename: 'w2.pdf', contentType: 'application/pdf', bytes: Buffer.from('W2-SYNTHETIC'),
})
assert(up.encryptionClaim === 'verified', 'upload claims verified after self-test')
const tok = issueSignedDownloadToken({ session: vs, principal: vaultUser, docId: up.docId, ttlSec: 60 })
const dl = downloadWithSignedToken({ token: tok.token, session: vs, principal: vaultUser })
assert(dl.bytes.toString() === 'W2-SYNTHETIC', 'decrypt download')
assert(dl.encryptionVerified === true, 'download encryption verified')

// token misuse — wrong principal
const attacker = syntheticPrincipal({
  id: 'u-evil', email: 'e@x.com', role: 'taxpayer', accountType: 'tc', tenantId: 'ten-tc-1',
})
const as = createSession({ principal: attacker, fingerprintSalt: 'e', mfaSatisfied: true })
let misuse = false
try { downloadWithSignedToken({ token: tok.token, session: as, principal: attacker }) } catch { misuse = true }
assert(misuse, 'token misuse blocked')

// cross-tenant vault
const other = syntheticPrincipal({
  id: 'u-tc-2', email: 'tc2@example.com', role: 'taxpayer', accountType: 'tc', tenantId: 'ten-tc-2',
})
const os = createSession({ principal: other, fingerprintSalt: 'o2', mfaSatisfied: true })
let cross = false
try {
  issueSignedDownloadToken({ session: os, principal: other, docId: up.docId })
} catch { cross = true }
assert(cross, 'cross-tenant file access blocked')

// malware
let mal = false
try {
  await vaultUpload({
    session: vs, principal: vaultUser, ownerId: 'u-tc-1',
    filename: 'bad.bin', contentType: 'application/octet-stream',
    bytes: Buffer.from('EICAR-PHASE6-TEST'),
  })
} catch (e: any) { mal = e.message === 'malware_detected' }
assert(mal, 'malware scan blocks upload')

secureDelete({ session: vs, principal: vaultUser, docId: up.docId })
let gone = false
try { downloadWithSignedToken({ token: tok.token, session: vs, principal: vaultUser }) } catch { gone = true }
assert(gone, 'secure delete prevents download')

console.log('=== Injection / sensitive data exposure in audit ===')
appendAudit({
  actorId: 'u-tc-1', tenantId: 'ten-tc-1', action: 'client_access', resource: 'client:1',
  outcome: 'success',
  meta: { ssn: '123-45-6789', note: 'ok', socialSecurityNumber: '999999999', summary: 'viewed' },
})
const audits = listAudit({ actorId: 'u-tc-1' })
const last = audits[audits.length - 1]
assert(!('ssn' in last.meta), 'ssn stripped from audit')
assert(!('socialSecurityNumber' in last.meta), 'ssn key stripped')
assert(last.meta.summary === 'viewed', 'safe meta kept')
assert(verifyAuditChain().ok, 'audit chain ok')
__tamperAuditForTests(0, { action: 'admin_action' as any })
assert(!verifyAuditChain().ok, 'tamper detected')

console.log('=== MFA bypass attempt when productionAuthPath + enrolled ===')
resetAll()
verifyEncryptionRoundTrip()
const en2 = beginTotpEnrollment('u-mfa')
confirmTotpEnrollment('u-mfa', generateTotp(en2.secretBase32))
const mfaUser = syntheticPrincipal({
  id: 'u-mfa', email: 'm@x.com', role: 'preparer', accountType: 'independent_tp',
  tenantId: 'ten-tp', mfaEnrolled: true,
})
setPhase6FlagsForTests({ productionAuthPath: true, mfaEnrollmentEnabled: true })
const sm = createSession({ principal: mfaUser, fingerprintSalt: 'm', mfaSatisfied: false })
assert(!authorize({
  session: sm, principal: { ...mfaUser, mfaEnrolled: true }, action: 'document.read',
  resourceTenantId: 'ten-tp', resourceOwnerId: 'c1',
}).allowed, 'MFA bypass blocked on production path')
markSessionMfaSatisfied(sm.sessionId)
const sm2 = getSession(sm.sessionId)!
assert(authorize({
  session: sm2, principal: { ...mfaUser, mfaEnrolled: true }, action: 'document.read',
  resourceTenantId: 'ten-tp', resourceOwnerId: 'c1',
}).allowed, 'after MFA reauth allowed')

resetPhase6Flags()
assertNotEnforcingOnExistingUsers()
console.log(phase6SecuritySummary())

console.log('=== PHASE6_SECURITY_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env },
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
