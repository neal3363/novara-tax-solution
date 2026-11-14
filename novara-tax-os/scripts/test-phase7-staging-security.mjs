/**
 * Phase 7 staging security integration tests — synthetic data only.
 * STOP before production enforcement / MFA mandate.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-phase7-security-test')
mkdirSync(tmp, { recursive: true })
const durableTmp = mkdtempSync(join(tmpdir(), 'novara-p7-'))

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'
import {
  getPhase6Flags,
  setPhase6FlagsForTests,
  resetPhase6Flags,
  assertNotEnforcingOnExistingUsers,
  createSession,
  getSession,
  syntheticPrincipal,
  authorize,
  appendAudit,
  verifyAuditChain,
  resetSessionStoreForTests,
  resetMfaStoreForTests,
  resetAuditLogForTests,
  resetKmsForTests,
  resetVaultForTests,
  PHASE6_SECURITY_VERSION,
} from '../src/engine/security/phase6/index.ts'
import {
  bootstrapStagingSecurity,
  teardownStagingSecurity,
  resetStagingForTests,
  stagingReadiness,
  getPhase7Flags,
  phase7SecuritySummary,
  stagingBeginEnrollment,
  stagingConfirmEnrollment,
  stagingStartChallenge,
  stagingVerifyChallenge,
  stagingRecoverWithCode,
  stagingSatisfySessionMfa,
  stagingAdminResetMfa,
  stagingGenerateTotp,
  stagingMfaStatus,
  serverAuthorize,
  stagingRevokeSession,
  stagingVaultUpload,
  stagingIssueDownloadToken,
  stagingDownload,
  stagingSecureDelete,
  stagingVaultSelfTest,
  durableAppendAudit,
  durableVerifyAuditChain,
  durableLoadVaultBlob,
  durableLoadSession,
  __tamperDurableAuditForTests,
  simulateMalwareOutage,
  recoverMalwareService,
  getMalwareServiceMode,
  getLastQuarantineId,
  stagingKmsRoundTripVerify,
  connectStagingKms,
  PHASE7_SECURITY_VERSION,
} from '../src/engine/security/phase7/index.ts'
import * as SessionApi from '../api/security/session.ts'
import * as MfaApi from '../api/security/mfa.ts'
import * as AuthzApi from '../api/security/authorize.ts'
import * as VaultApi from '../api/security/vault.ts'
import * as AuditApi from '../api/security/audit.ts'
import * as StatusApi from '../api/security/status.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const DURABLE = ${JSON.stringify(durableTmp)}

function resetAll() {
  resetStagingForTests(DURABLE)
}

resetAll()

console.log('=== Protected surfaces unchanged ===')
assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC pricing $300/$399 intact')
const opt = runBenefitOptimization(defaultProfile())
assert(Boolean(opt), 'Refund Maximizer still runs')
assert(getPhase7Flags().productionEnforcement === false, 'productionEnforcement false')
assert(getPhase7Flags().mfaMandatoryForExistingUsers === false, 'MFA mandate false')
assert(getPhase6Flags().productionAuthPath === false, 'productionAuthPath OFF')
assertNotEnforcingOnExistingUsers()

console.log('=== Bootstrap staging services ===')
const boot = bootstrapStagingSecurity({ durableRoot: DURABLE })
assert(boot.staging === true, 'staging bootstrap')
assert(boot.kms.provider === 'staging-cloud-kms-adapter', 'staging KMS connected')
assert(boot.malware.connected === true, 'malware service connected')
assert(boot.encryption.stagingKmsVerified === true, 'staging KMS round-trip')
assert(boot.encryption.productionClaim === false, 'no production encryption claim')
assert(stagingKmsRoundTripVerify().verified, 'kms verify again')
assert(stagingVaultSelfTest().encryptionVerified === true, 'vault self-test verified')

console.log('=== Sessions + server authZ isolation ===')
const tcA = syntheticPrincipal({
  id: 'syn-tc-a', email: 'a@synthetic.test', role: 'taxpayer', accountType: 'tc',
  tenantId: 'ten-a', mfaEnrolled: false,
})
const tcB = syntheticPrincipal({
  id: 'syn-tc-b', email: 'b@synthetic.test', role: 'taxpayer', accountType: 'tc',
  tenantId: 'ten-b', mfaEnrolled: false,
})
const officeOwner = syntheticPrincipal({
  id: 'syn-office', email: 'owner@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-office', officeId: 'off-1', officeManager: true, mfaEnrolled: false,
})
const prepOther = syntheticPrincipal({
  id: 'syn-prep', email: 'prep@synthetic.test', role: 'preparer', accountType: 'office_preparer',
  tenantId: 'ten-office', officeId: 'off-2', officeManager: false, mfaEnrolled: false,
})

const sessA = createSession({ principal: tcA, fingerprintSalt: 'p7', mfaSatisfied: true })
const sessB = createSession({ principal: tcB, fingerprintSalt: 'p7', mfaSatisfied: true })
const sessOff = createSession({ principal: officeOwner, fingerprintSalt: 'p7', mfaSatisfied: true })
const sessPrep = createSession({ principal: prepOther, fingerprintSalt: 'p7', mfaSatisfied: true })

assert(serverAuthorize({
  sessionId: sessA.sessionId, action: 'client.read', resourceTenantId: 'ten-a', resourceOwnerId: 'syn-tc-a',
}).allowed, 'TC own access allowed')
assert(!serverAuthorize({
  sessionId: sessA.sessionId, action: 'client.read', resourceTenantId: 'ten-b', resourceOwnerId: 'syn-tc-b',
}).allowed, 'cross-tenant denied')
assert(!serverAuthorize({
  sessionId: sessPrep.sessionId, action: 'client.read', resourceTenantId: 'ten-office',
  resourceOwnerId: 'client-x', resourceOfficeId: 'off-1',
}).allowed, 'cross-office preparer denied')
assert(serverAuthorize({
  sessionId: sessOff.sessionId, action: 'office.manage_staff', resourceTenantId: 'ten-office',
  resourceOfficeId: 'off-1',
}).allowed, 'office manager staff allowed')

console.log('=== Unauthorized API / session revoke & expiry ===')
let unauthThrown = false
try { serverAuthorize({ sessionId: 'no-such', action: 'client.read', resourceTenantId: 'ten-a' }) }
catch { unauthThrown = true }
assert(unauthThrown, 'unauthorized session throws')

const revoked = stagingRevokeSession(sessB.sessionId, 'syn-tc-b')
assert(revoked?.status === 'revoked', 'session revoked')
let afterRevoke = false
try { serverAuthorize({ sessionId: sessB.sessionId, action: 'client.read', resourceTenantId: 'ten-b', resourceOwnerId: 'syn-tc-b' }) }
catch { afterRevoke = true }
assert(afterRevoke, 'revoked session requireActive throws')

console.log('=== MFA workflows (not mandatory) ===')
const enroll = stagingBeginEnrollment('syn-tp-mfa')
assert(enroll.mandatoryForExistingUsers === false, 'enroll reports mandate off')
const code = stagingGenerateTotp(enroll.secretBase32)
assert(stagingConfirmEnrollment('syn-tp-mfa', code), 'enroll confirm')
assert(stagingMfaStatus('syn-tp-mfa').enrolled, 'enrolled')
const ch = stagingStartChallenge('syn-tp-mfa')
const bad = stagingVerifyChallenge(ch.challengeId, '000000')
assert(!bad, 'bad TOTP rejected')
const ch2 = stagingStartChallenge('syn-tp-mfa')
const goodCode = stagingGenerateTotp(enroll.secretBase32)
assert(stagingVerifyChallenge(ch2.challengeId, goodCode), 'TOTP verify')
const mfaUser = syntheticPrincipal({
  id: 'syn-tp-mfa', email: 'mfa@synthetic.test', role: 'preparer', accountType: 'independent_tp',
  tenantId: 'ten-tp', mfaEnrolled: true,
})
const sm = createSession({ principal: mfaUser, fingerprintSalt: 'mfa', mfaSatisfied: false })
setPhase6FlagsForTests({ productionAuthPath: true })
assert(!authorize({
  session: sm, principal: mfaUser, action: 'document.read',
  resourceTenantId: 'ten-tp', resourceOwnerId: 'c1',
}).allowed, 'MFA bypass blocked when prod path + enrolled')
setPhase6FlagsForTests({ productionAuthPath: false })
const rec = enroll.recoveryCodes[0]
assert(stagingRecoverWithCode('syn-tp-mfa', rec), 'recovery code works')
stagingSatisfySessionMfa(sm.sessionId)
assert(getSession(sm.sessionId)?.mfaSatisfied === true, 'session reauth after MFA')

const adminReset = stagingAdminResetMfa({
  session: sessOff, admin: officeOwner, targetPrincipalId: 'syn-tp-mfa',
})
assert(adminReset.mandatoryStillOff === true, 'admin reset keeps mandate off')
assert(!stagingMfaStatus('syn-tp-mfa').enrolled, 'admin reset cleared enrollment')

// Lockout protection: many failures
const lockEnroll = stagingBeginEnrollment('syn-lock')
stagingConfirmEnrollment('syn-lock', stagingGenerateTotp(lockEnroll.secretBase32))
for (let i = 0; i < 8; i++) {
  try {
    const c = stagingStartChallenge('syn-lock')
    stagingVerifyChallenge(c.challengeId, '111111')
  } catch { /* locked mid-loop */ }
}
const lockState = stagingMfaStatus('syn-lock').lockout
assert(Boolean(lockState && ((lockState as { count?: number }).count! >= 3 || lockState.lockedUntil)), 'login attempt protection / lockout')

console.log('=== Vault encryption, tokens, malware ===')
const up = await stagingVaultUpload({
  sessionId: sessA.sessionId,
  ownerId: 'syn-tc-a',
  filename: 'w2-synthetic.pdf',
  contentType: 'application/pdf',
  bytes: Buffer.from('SYNTHETIC-W2-NO-REAL-SSN'),
})
assert(Boolean(up.docId), 'vault upload')
assert(durableLoadVaultBlob(up.docId)?.ciphertextB64, 'durable encrypted blob persisted')
const tok = stagingIssueDownloadToken({ sessionId: sessA.sessionId, docId: up.docId, ttlSec: 60 })
const dl = stagingDownload({ sessionId: sessA.sessionId, token: tok.token })
assert(dl.bytes.toString() === 'SYNTHETIC-W2-NO-REAL-SSN', 'decrypt download')
assert(dl.encryptionVerified === true, 'encryption verified flag after staging bootstrap')

let misuse = false
try {
  stagingDownload({ sessionId: sessOff.sessionId, token: tok.token })
} catch { misuse = true }
assert(misuse, 'document token misuse blocked')

let mal = false
try {
  await stagingVaultUpload({
    sessionId: sessA.sessionId,
    ownerId: 'syn-tc-a',
    filename: 'bad.virus',
    contentType: 'text/plain',
    bytes: Buffer.from('EICAR-PHASE7-TEST'),
  })
} catch (e) {
  mal = String(e).includes('malware')
}
assert(mal, 'malware upload blocked')
assert(Boolean(getLastQuarantineId()), 'quarantine id recorded')

simulateMalwareOutage()
assert(getMalwareServiceMode() === 'unavailable', 'malware outage mode')
let outageBlocked = false
try {
  await stagingVaultUpload({
    sessionId: sessA.sessionId,
    ownerId: 'syn-tc-a',
    filename: 'during-outage.txt',
    contentType: 'text/plain',
    bytes: Buffer.from('clean-during-outage'),
  })
} catch { outageBlocked = true }
assert(outageBlocked, 'fail-closed during scanner outage')
recoverMalwareService()
assert(getMalwareServiceMode() === 'online', 'malware service recovered')
const up2 = await stagingVaultUpload({
  sessionId: sessA.sessionId,
  ownerId: 'syn-tc-a',
  filename: 'after-recovery.txt',
  contentType: 'text/plain',
  bytes: Buffer.from('clean-after-recovery'),
})
assert(Boolean(up2.docId), 'upload after malware recovery')

stagingSecureDelete({ sessionId: sessA.sessionId, docId: up.docId })
let deletedBlocked = false
try {
  stagingIssueDownloadToken({ sessionId: sessA.sessionId, docId: up.docId })
} catch { deletedBlocked = true }
assert(deletedBlocked, 'secure delete blocks download')

console.log('=== Durable audit + tamper ===')
const aud = appendAudit({
  actorId: 'syn-tc-a', tenantId: 'ten-a', action: 'client_access',
  resource: 'client:syn-tc-a', outcome: 'success',
  meta: { ssn: '123-45-6789', note: 'safe' },
})
assert(!('ssn' in aud.meta), 'SSN stripped from audit')
durableAppendAudit(aud)
assert(verifyAuditChain().ok, 'memory audit chain ok')
assert(durableVerifyAuditChain().ok, 'durable audit chain ok')
__tamperDurableAuditForTests()
assert(!durableVerifyAuditChain().ok, 'durable tamper detected')

console.log('=== HTTP security API handlers ===')
resetAll()
await StatusApi.POST(new Request('http://local/api/security/status', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'bootstrap', durableRoot: DURABLE }),
}))
const statusRes = await StatusApi.GET()
const statusBody = await statusRes.json()
assert(statusRes.status === 200, 'status GET')
assert(statusBody.productionEnforcement === false, 'status production OFF')
assert(statusBody.mfaMandatoryForExistingUsers === false, 'status MFA mandate OFF')

const createRes = await SessionApi.POST(new Request('http://local/api/security/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'user-agent': 'phase7-test' },
  body: JSON.stringify({
    principalId: 'api-tc-1', email: 'api@synthetic.test', role: 'taxpayer', accountType: 'tc',
    tenantId: 'ten-api', mfaSatisfied: true,
  }),
}))
const created = await createRes.json()
assert(createRes.status === 200 && created.sessionId, 'API session create')
assert(created.productionEnforcement === false, 'API session enforcement off')

const guestRes = await SessionApi.POST(new Request('http://local/api/security/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    principalId: 'guest-should-block-when-flagged', email: 'g@x', role: 'taxpayer', accountType: 'tc',
    tenantId: 'ten-g',
  }),
}))
// Guest allowed when productionAuthPath OFF
assert(guestRes.status === 200 || guestRes.status === 403, 'guest path handled')

const authzRes = await AuthzApi.POST(new Request('http://local/api/security/authorize', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({
    action: 'client.read', resourceTenantId: 'ten-api', resourceOwnerId: 'api-tc-1',
  }),
}))
const authzBody = await authzRes.json()
assert(authzRes.status === 200 && authzBody.allowed === true, 'API authorize allow own')

const denyRes = await AuthzApi.POST(new Request('http://local/api/security/authorize', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({
    action: 'client.read', resourceTenantId: 'ten-other', resourceOwnerId: 'other',
  }),
}))
assert(denyRes.status === 403, 'API authorize deny cross-tenant')

const mfaBegin = await MfaApi.POST(new Request('http://local/api/security/mfa', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'enroll_begin', principalId: 'api-tc-1' }),
}))
const mfaBody = await mfaBegin.json()
assert(mfaBegin.status === 200 && mfaBody.mandatoryForExistingUsers === false, 'API MFA enroll')
const totpRes = await MfaApi.POST(new Request('http://local/api/security/mfa', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'totp_test_code', secretBase32: mfaBody.secretBase32 }),
}))
const totpBody = await totpRes.json()
const confirmRes = await MfaApi.POST(new Request('http://local/api/security/mfa', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ op: 'enroll_confirm', principalId: 'api-tc-1', code: totpBody.code }),
}))
assert(confirmRes.status === 200, 'API MFA confirm')

const vaultUp = await VaultApi.POST(new Request('http://local/api/security/vault', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({
    op: 'upload', ownerId: 'api-tc-1', filename: '1099.pdf', contentType: 'application/pdf',
    bytesBase64: Buffer.from('SYNTHETIC-1099').toString('base64'),
  }),
}))
const vaultBody = await vaultUp.json()
assert(vaultUp.status === 200 && vaultBody.docId, 'API vault upload')
assert(vaultBody.productionEncryptionClaim === false, 'API no prod encryption claim')

const tokRes = await VaultApi.POST(new Request('http://local/api/security/vault', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({ op: 'issue_token', docId: vaultBody.docId }),
}))
const tokBody = await tokRes.json()
const dlRes = await VaultApi.POST(new Request('http://local/api/security/vault', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({ op: 'download', token: tokBody.token }),
}))
const dlBody = await dlRes.json()
assert(dlRes.status === 200 && Buffer.from(dlBody.bytesBase64, 'base64').toString() === 'SYNTHETIC-1099', 'API vault download')

const virusRes = await VaultApi.POST(new Request('http://local/api/security/vault', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({
    op: 'upload', ownerId: 'api-tc-1', filename: 'x.virus', contentType: 'text/plain',
    bytesBase64: Buffer.from('EICAR-PHASE7-TEST').toString('base64'),
  }),
}))
assert(virusRes.status === 422, 'API malware blocked')

const auditRes = await AuditApi.GET(new Request('http://local/api/security/audit?op=verify'))
const auditBody = await auditRes.json()
assert(auditRes.status === 200 && auditBody.memory.ok, 'API audit verify')

const ready = stagingReadiness()
assert(ready.readyForStaging === true, 'ready for staging')
assert(ready.readyForProductionEnforcement === false, 'NOT ready for production enforcement')

teardownStagingSecurity()
resetPhase6Flags()
assertNotEnforcingOnExistingUsers()
console.log(phase7SecuritySummary())
console.log('phase6=' + PHASE6_SECURITY_VERSION + ' phase7=' + PHASE7_SECURITY_VERSION)
console.log('=== PHASE7_STAGING_SECURITY_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NOVARA_STAGING_SECURITY_DIR: durableTmp },
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
rmSync(durableTmp, { recursive: true, force: true })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
