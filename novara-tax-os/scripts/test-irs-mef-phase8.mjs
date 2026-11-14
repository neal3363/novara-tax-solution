/**
 * Phase 8 IRS MeF tests — synthetic data only.
 * STOP before production IRS transmission / live e-file.
 */
process.env.NOVARA_STAGING_SECURITY_API = "1"
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-phase8-mef-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { runBenefitOptimization, defaultProfile } from '../src/engine/benefitOptimizer.ts'
import { cutoverReady } from '../src/engine/irs/cutoverCriteria.ts'
import {
  submitCredential,
  seedVerifiedCredential,
  completeAuthorizedVerification,
} from '../src/engine/credentials.ts'
import {
  defaultFilingAuthState,
  acceptConsent,
  captureSignature,
  lockReturnVersion,
  FORM_8879_VERSION,
} from '../src/engine/filingAuthorizations.ts'
import {
  PHASE8_MEF_VERSION,
  getMefFlags,
  assertNoLiveIrsTransmit,
  resetMefFlags,
  composeReturnXml,
  validateReturnPayload,
  validateComposedXml,
  corruptXmlForTests,
  evaluateProviderReadiness,
  formatCheckOnly,
  evaluate8879Authorization,
  prepareForTransmission,
  transmitPrepared,
  resubmitCorrection,
  resetMefPipelineForTests,
  resetMefLogForTests,
  resetTransmitterForTests,
  setTransmitterMode,
  listMefLog,
  mefPackageSummary,
  interpretRejectCodes,
  parseAcknowledgment,
  buildMockAckXml,
  describeFilingStatus,
  getSubmission,
  type MefSyntheticReturn,
  type MefCredentialBundle,
} from '../src/engine/irs/mef/index.ts'
import {
  createSession,
  syntheticPrincipal,
  resetSessionStoreForTests,
} from '../src/engine/security/phase6/index.ts'
import { serverAuthorize, bootstrapStagingSecurity, resetStagingForTests } from '../src/engine/security/phase7/index.ts'
process.env.NOVARA_STAGING_SECURITY_API = '1'
import * as MefApi from '../../staging-security-api/security/mef.ts'
process.env.NOVARA_STAGING_SECURITY_API = '1'
import * as SessionApi from '../../staging-security-api/security/session.ts'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join as pathJoin } from 'node:path'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const DURABLE = mkdtempSync(pathJoin(tmpdir(), 'novara-p8-'))

function resetAll() {
  resetMefFlags()
  resetMefPipelineForTests()
  resetMefLogForTests()
  resetTransmitterForTests()
  resetSessionStoreForTests()
  resetStagingForTests(DURABLE)
}

function syntheticReturn(over: Partial<MefSyntheticReturn> = {}): MefSyntheticReturn {
  return {
    submissionLocalId: 'syn-ret-1',
    taxYear: 2025,
    returnType: 'Form1040',
    filingStatus: 'single',
    primaryTinMasked: '***-**-4321',
    primaryName: 'Synthetic Taxpayer',
    agi: 55000,
    totalTax: 4200,
    totalPayments: 5000,
    refundOrBalanceDue: 800,
    formsIncluded: ['Form1040'],
    schedulesIncluded: ['ScheduleB'],
    tenantId: 'ten-mef',
    ownerId: 'owner-1',
    officeId: 'off-1',
    ...over,
  }
}

function readyCredentials(): MefCredentialBundle {
  return {
    efin: seedVerifiedCredential('efin', '123456', 2025),
    ptin: seedVerifiedCredential('ptin', 'P12345678', 2025),
    provider: { providerName: 'NOVARA MeF Mock ATS', status: 'associated', associatedAt: new Date().toISOString() },
    transmitter: { etinConfigured: true, certificateConfigured: true },
    irsAtsTestingCompleted: true,
    preparerPath: true,
  }
}

function authorizedFiling(contentHash: string) {
  let state = defaultFilingAuthState({ spouseRequired: false })
  const kinds = [
    'truthfulness_declaration',
    'novara_accuracy_ack',
    'electronic_signature_consent',
    'form_8879_efile_auth',
    'fee_disclosure_ack',
    'privacy_notice_ack',
    'tax_info_use_disclosure',
  ] as const
  for (const k of kinds) state = acceptConsent(state, k, 'Synthetic Taxpayer')
  state = lockReturnVersion(state, {
    versionId: 'v1',
    contentHash,
    lockedAt: new Date().toISOString(),
    lockedByUserId: 'owner-1',
    taxYear: 2025,
    projectedRefund: 800,
  })
  state = captureSignature(state, {
    role: 'primary',
    signerName: 'Synthetic Taxpayer',
    typedName: 'Synthetic Taxpayer',
    method: 'typed_name',
    versionId: 'v1',
    contentHash,
  })
  return state
}

resetAll()

console.log('=== Protected surfaces unchanged ===')
assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC pricing intact')
assert(Boolean(runBenefitOptimization(defaultProfile())), 'Refund Maximizer still runs')
assert(cutoverReady() === false, 'IRS calc engine cutover still false')
assert(getMefFlags().liveProductionTransmit === false, 'live IRS transmit OFF')
assert(getMefFlags().activateIrsCalcEngine === false, 'calc engine not activated')
assertNoLiveIrsTransmit()
assert(FORM_8879_VERSION.includes('8879'), 'Form 8879 version present')

console.log('=== XML compose + schema validation ===')
const ret = syntheticReturn()
const xml = composeReturnXml(ret)
assert(xml.synthetic === true, 'XML marked synthetic')
assert(xml.xml.includes('LiveIrsTransmit>false'), 'live transmit false in XML')
const vOk = validateComposedXml(xml, ret)
assert(vOk.ok, 'valid XML passes')
const badPayload = validateReturnPayload(syntheticReturn({ returnType: 'unsupported' as any }))
assert(!badPayload.ok, 'unsupported return type fails')
const unsupported = validateReturnPayload(syntheticReturn({ formsIncluded: ['Form1120'] }))
assert(unsupported.issues.some((i) => i.code === 'MEF-FORM-001'), 'unsupported form blocked')
const badXml = validateComposedXml({ ...xml, xml: corruptXmlForTests(xml.xml) }, ret)
assert(!badXml.ok, 'invalid XML fails validation')
const tinBad = validateReturnPayload(syntheticReturn({ primaryTinMasked: '123456789' }))
assert(tinBad.issues.some((i) => i.code === 'MEF-TIN-001'), 'unmasked TIN forbidden')

console.log('=== EFIN / provider verification ===')
const fmt = formatCheckOnly('123456', 'P12345678')
assert(fmt.efinFormat && fmt.ptinFormat && fmt.verified === false, 'format ok but not verified')
const enteredOnly = submitCredential('efin', '654321', 2025)
assert(enteredOnly.ok && enteredOnly.credential.status === 'pending_verification', 'entered EFIN pending')
const pendingReady = evaluateProviderReadiness({
  efin: enteredOnly.credential,
  ptin: seedVerifiedCredential('ptin', 'P87654321', 2025),
  provider: { providerName: 'X', status: 'associated' },
  transmitter: { etinConfigured: true, certificateConfigured: true },
  irsAtsTestingCompleted: true,
  preparerPath: true,
})
assert(!pendingReady.ready, 'pending EFIN not ready')
assert(pendingReady.efinEntryIsNotIrsAuthorization === true, 'EFIN entry is not IRS authorization')
assert(pendingReady.blockers.some((b) => b.includes('not IRS-verified')), 'blocker cites verification')
const rejectedEfin = completeAuthorizedVerification(enteredOnly.credential, false)
assert(evaluateProviderReadiness({
  efin: rejectedEfin,
  ptin: seedVerifiedCredential('ptin', 'P87654321', 2025),
  provider: { providerName: 'X', status: 'associated' },
  transmitter: { etinConfigured: true, certificateConfigured: true },
  irsAtsTestingCompleted: true,
  preparerPath: true,
}).ready === false, 'rejected EFIN not ready')
assert(evaluateProviderReadiness(readyCredentials()).ready, 'fully verified provider ready')

console.log('=== Form 8879 authorization ===')
const xml2 = composeReturnXml(ret)
const unauth = evaluate8879Authorization({
  filingAuth: defaultFilingAuthState({ spouseRequired: false }),
  returnContentHash: xml2.contentHash,
})
assert(!unauth.authorized, 'missing 8879 blocks auth')
const authState = authorizedFiling(xml2.contentHash)
assert(evaluate8879Authorization({ filingAuth: authState, returnContentHash: xml2.contentHash }).authorized, '8879 authorized')

console.log('=== Prepare + missing authorization transmit block ===')
const prepUnauth = prepareForTransmission({
  ret,
  filingAuth: defaultFilingAuthState({ spouseRequired: false }),
  credentials: readyCredentials(),
  actorId: 'prep-1',
})
assert(prepUnauth.submission.status === 'awaiting_taxpayer_authorization', 'awaiting taxpayer authorization')
assert(!prepUnauth.ready, 'not ready without 8879')

console.log('=== Happy path mock ATS transmit + ACK ===')
const okRet = syntheticReturn({ submissionLocalId: 'syn-ok-2' })
const okHash = composeReturnXml(okRet).contentHash
const authForPrep = authorizedFiling(okHash)
const prep2 = prepareForTransmission({
  ret: okRet,
  filingAuth: authForPrep,
  credentials: readyCredentials(),
  actorId: 'prep-1',
})
assert(prep2.ready && prep2.submission.status === 'ready_for_transmission', 'ready for transmission')
const tx = transmitPrepared({
  submissionId: prep2.submission.submissionId,
  ret: okRet,
  filingAuth: authForPrep,
  credentials: readyCredentials(),
  actorId: 'prep-1',
  xml: prep2.xml,
})
assert(tx.ok && tx.submission?.status === 'accepted', 'accepted ACK (simulated)')
assert(tx.submission?.simulated === true && tx.submission?.liveIrs === false, 'ACK labeled simulated')
assert(describeFilingStatus(tx.submission!).note.includes('SIMULATED'), 'status note distinguishes simulated')

console.log('=== Duplicate transmission ===')
const dup = transmitPrepared({
  submissionId: prep2.submission.submissionId,
  ret: okRet,
  filingAuth: authForPrep,
  credentials: readyCredentials(),
  actorId: 'prep-1',
  xml: prep2.xml,
})
assert(!dup.ok && dup.error === 'duplicate_transmission', 'duplicate transmission blocked')

console.log('=== Rejection + correction workflow ===')
const rejPrep = prepareForTransmission({
  ret: syntheticReturn({ submissionLocalId: 'syn-rej' }),
  filingAuth: authorizedFiling(composeReturnXml(syntheticReturn({ submissionLocalId: 'syn-rej' })).contentHash),
  credentials: readyCredentials(),
  actorId: 'prep-1',
})
const rejAuth = authorizedFiling(rejPrep.xml.contentHash)
const rejPrep2 = prepareForTransmission({
  ret: syntheticReturn({ submissionLocalId: 'syn-rej' }),
  filingAuth: rejAuth,
  credentials: readyCredentials(),
  actorId: 'prep-1',
})
const rejected = transmitPrepared({
  submissionId: rejPrep2.submission.submissionId,
  ret: syntheticReturn({ submissionLocalId: 'syn-rej' }),
  filingAuth: rejAuth,
  credentials: readyCredentials(),
  actorId: 'prep-1',
  xml: rejPrep2.xml,
  forceRejectCodes: ['F1040-512', 'R0000-502'],
})
assert(rejected.ok && rejected.submission?.status === 'correction_required', 'rejection → correction required')
assert(rejected.submission?.rejectionCodes.includes('F1040-512'), 'rejection codes stored')
const interpreted = interpretRejectCodes(['F1040-512'])
assert(interpreted[0].category === 'identity', 'rejection code interpreted')

const corrRet = syntheticReturn({
  submissionLocalId: 'syn-rej-corr',
  primaryName: 'Synthetic Taxpayer Corrected',
})
const corrAuth = authorizedFiling(composeReturnXml(corrRet).contentHash)
const corr = resubmitCorrection({
  priorSubmissionId: rejPrep2.submission.submissionId,
  ret: corrRet,
  filingAuth: corrAuth,
  credentials: readyCredentials(),
  actorId: 'prep-1',
})
assert(corr.ok, 'correction resubmission ok')
assert(corr.submission?.correctionOfSubmissionId === rejPrep2.submission.submissionId, 'correction linked')

console.log('=== Invalid EFIN credentials block ===')
const pendingEfin = submitCredential('efin', '111111', 2025)
assert(pendingEfin.ok, 'pending efin submit')
const badCredPrep = prepareForTransmission({
  ret: syntheticReturn({ submissionLocalId: 'syn-bad-efin' }),
  filingAuth: authorizedFiling(composeReturnXml(syntheticReturn({ submissionLocalId: 'syn-bad-efin' })).contentHash),
  credentials: {
    efin: pendingEfin.credential,
    ptin: null,
    provider: { providerName: 'X', status: 'pending' },
    transmitter: { etinConfigured: false, certificateConfigured: false },
    irsAtsTestingCompleted: false,
    preparerPath: true,
  },
  actorId: 'prep-1',
})
assert(!badCredPrep.ready, 'invalid/incomplete EFIN credentials not ready')

console.log('=== Transmitter outage ===')
const outPrepRet = syntheticReturn({ submissionLocalId: 'syn-outage' })
const outXml = composeReturnXml(outPrepRet)
const outAuth = authorizedFiling(outXml.contentHash)
const outPrep = prepareForTransmission({
  ret: outPrepRet,
  filingAuth: outAuth,
  credentials: readyCredentials(),
  actorId: 'prep-1',
})
setTransmitterMode('unavailable')
const outage = transmitPrepared({
  submissionId: outPrep.submission.submissionId,
  ret: outPrepRet,
  filingAuth: outAuth,
  credentials: readyCredentials(),
  actorId: 'prep-1',
  xml: outPrep.xml,
})
assert(!outage.ok && outage.error === 'transmitter_unavailable', 'outage blocks transmit')
setTransmitterMode('online')
assert(listMefLog({ action: 'outage' }).length >= 1, 'outage logged securely')

console.log('=== ACK parsing ===')
const ack = parseAcknowledgment({
  submissionId: 'MEF-TEST-ACK',
  status: 'accepted',
  ackSource: 'simulated',
  rawXml: buildMockAckXml({ submissionId: 'MEF-TEST-ACK', status: 'accepted' }),
})
assert(ack.simulated && ack.status === 'accepted', 'ACK parse simulated accepted')
let prodAckBlocked = false
try {
  parseAcknowledgment({ submissionId: 'x', status: 'accepted', ackSource: 'irs_production_blocked' })
} catch { prodAckBlocked = true }
assert(prodAckBlocked, 'production ACK source blocked')

console.log('=== Secure logging (no SSN) ===')
const logs = listMefLog()
assert(logs.length > 0, 'secure logs present')
assert(logs.every((e) => !JSON.stringify(e.meta).includes('123-45-6789')), 'no SSN in logs')

console.log('=== Phase 7 server authz for MeF API ===')
bootstrapStagingSecurity({ durableRoot: DURABLE })
const office = syntheticPrincipal({
  id: 'mef-office', email: 'o@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
  tenantId: 'ten-mef', officeId: 'off-1', officeManager: true, mfaEnrolled: false,
})
const outsider = syntheticPrincipal({
  id: 'mef-out', email: 'x@synthetic.test', role: 'taxpayer', accountType: 'tc',
  tenantId: 'ten-other', mfaEnrolled: false,
})
const sessOffice = createSession({ principal: office, fingerprintSalt: 'mef', mfaSatisfied: true })
const sessOut = createSession({ principal: outsider, fingerprintSalt: 'mef', mfaSatisfied: true })
assert(serverAuthorize({
  sessionId: sessOffice.sessionId, action: 'return.submit',
  resourceTenantId: 'ten-mef', resourceOwnerId: 'owner-1', resourceOfficeId: 'off-1',
}).allowed, 'office authorized for return.submit')
assert(!serverAuthorize({
  sessionId: sessOut.sessionId, action: 'return.submit',
  resourceTenantId: 'ten-mef', resourceOwnerId: 'owner-1',
}).allowed, 'unauthorized submission attempt denied')

const createRes = await SessionApi.POST(new Request('http://local/api/security/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    principalId: 'mef-office', email: 'o@synthetic.test', role: 'efin_owner', accountType: 'office_owner',
    tenantId: 'ten-mef', officeId: 'off-1', officeManager: true, mfaSatisfied: true,
  }),
}))
const created = await createRes.json()
const mefStatus = await MefApi.GET(new Request('http://local/api/security/mef?op=status'))
assert(mefStatus.status === 200, 'MeF status API')
const mefDeny = await MefApi.POST(new Request('http://local/api/security/mef', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({ op: 'prepare', tenantId: 'ten-other', ownerId: 'stranger' }),
}))
assert(mefDeny.status === 403, 'MeF API unauthorized cross-tenant denied')

const mefOk = await MefApi.POST(new Request('http://local/api/security/mef', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-novara-session': created.sessionId },
  body: JSON.stringify({ op: 'prepare', tenantId: 'ten-mef', ownerId: 'owner-1', officeId: 'off-1' }),
}))
assert(mefOk.status === 200, 'MeF API authorized prepare probe')

console.log(mefPackageSummary())
assert(PHASE8_MEF_VERSION.includes('phase8'), 'phase8 version')
assertNoLiveIrsTransmit()
console.log('=== PHASE8_MEF_OK failed=' + failed + ' ===')
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
process.exit(r.status === 0 ? 0 : r.status ?? 1)
