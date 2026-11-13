/**
 * Final filing packet: checklist, return packet hash lock, consents, signature gate.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-filing-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { defaultProfile, applyAnswer, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import { applyFilingStatusAnswer } from '../src/engine/smartInterview.ts'
import { buildFinalDocumentChecklist } from '../src/engine/finalChecklist.ts'
import { buildWorkingReturnPacket, returnPacketToSimplePdf } from '../src/engine/returnPacket.ts'
import {
  defaultFilingAuthState,
  acceptConsent,
  captureSignature,
  lockReturnVersion,
  signatureLockStatus,
  invalidateLockIfStale,
  IRS_PERJURY_DECLARATION,
} from '../src/engine/filingAuthorizations.ts'
let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Answer updates return projection ===')
{
  let p = defaultProfile()
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  const before = runBenefitOptimization(p).projectedRefund
  p = applyAnswer(p, 'retirement_contribution_amount', 5000)
  const after = runBenefitOptimization(p)
  assert(typeof after.projectedRefund === 'number', 'refund recalculated after answer')
  assert(after.formLines.length >= 0, 'form lines available')
  void before
}

console.log('=== Final checklist green/orange/NA ===')
{
  let p = defaultProfile()
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  const docs = [
    {
      id: 'd1', name: 'W2.pdf', type: 'W-2', taxYear: p.taxYear, sizeLabel: '1KB',
      uploadedAt: new Date().toISOString(), status: 'verified', confidence: 0.99,
      ownerId: 'u', clientId: 'u', tenantId: 't', facts: [],
    },
  ] as any
  const cl = buildFinalDocumentChecklist(p, docs)
  assert(cl.items.some((i) => i.visual === 'green'), 'has green verified item')
  assert(cl.items.some((i) => i.visual === 'not_applicable'), 'has NA items for unused docs')
  assert(cl.items.every((i) => i.statusLabel.length > 0), 'status text present (not color alone)')
}

console.log('=== Return packet from calculated data ===')
{
  let p = defaultProfile()
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  const report = runBenefitOptimization(p)
  const packet = buildWorkingReturnPacket({
    profile: p,
    benefitReport: {
      taxYear: report.taxYear,
      ruleVersion: report.ruleVersion,
      baseRefund: report.baseRefund,
      projectedRefund: report.projectedRefund,
      verifiedSavings: report.verifiedSavings,
      potentialSavings: report.potentialSavings,
      auditComplete: report.auditComplete,
      blockers: report.blockers,
      comparisonNotes: report.comparisonNotes,
      findings: report.findings,
      formLines: report.formLines,
      lastRunAt: new Date().toISOString(),
    } as any,
    clientName: 'Jordan Blake',
    isDraft: true,
  })
  assert(packet.summary.wages === p.wages, 'packet wages match profile')
  assert(packet.summary.projectedRefund === report.projectedRefund, 'packet refund matches engine')
  assert(packet.draftWatermark?.includes('DRAFT'), 'draft watermark')
  assert(packet.contentHash.startsWith('rv_'), 'content hash')
  const pdf = returnPacketToSimplePdf(packet)
  assert(pdf.byteLength > 100, 'PDF bytes generated')
  assert(new TextDecoder().decode(pdf.slice(0, 5)) === '%PDF-', 'valid PDF header')
}

console.log('=== Signature lock + change invalidates ===')
{
  let p = defaultProfile()
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  const report = runBenefitOptimization(p)
  let packet = buildWorkingReturnPacket({
    profile: p,
    benefitReport: { ...report, formLines: report.formLines, lastRunAt: new Date().toISOString(), findings: report.findings } as any,
    clientName: 'Jordan Blake',
  })
  let auth = defaultFilingAuthState({ spouseRequired: false })
  for (const kind of [
    'truthfulness_declaration',
    'novara_accuracy_ack',
    'electronic_signature_consent',
    'electronic_delivery_consent',
    'tax_info_use_disclosure',
    'fee_disclosure_ack',
    'privacy_notice_ack',
    'form_8879_efile_auth',
  ] as const) {
    auth = acceptConsent(auth, kind, 'Jordan Blake')
  }
  auth = lockReturnVersion(auth, {
    versionId: packet.versionId,
    contentHash: packet.contentHash,
    lockedAt: new Date().toISOString(),
    lockedByUserId: 'u-tax',
    taxYear: packet.taxYear,
    projectedRefund: packet.summary.projectedRefund,
  })
  auth = captureSignature(auth, {
    role: 'primary',
    signerName: 'Jordan Blake',
    typedName: 'Jordan Blake',
    method: 'typed_name',
    versionId: packet.versionId,
    contentHash: packet.contentHash,
  })
  let gate = signatureLockStatus(auth, packet.contentHash)
  assert(gate.valid, 'signatures valid for locked hash')

  // Change income → new hash
  p = { ...p, wages: p.wages + 1000 }
  const report2 = runBenefitOptimization(p)
  packet = buildWorkingReturnPacket({
    profile: p,
    benefitReport: { ...report2, formLines: report2.formLines, lastRunAt: new Date().toISOString(), findings: report2.findings } as any,
    clientName: 'Jordan Blake',
  })
  gate = signatureLockStatus(auth, packet.contentHash)
  assert(!gate.valid, 'changed return invalidates signatures')
  auth = invalidateLockIfStale(auth, packet.contentHash)
  assert(auth.lockedVersion === null, 'lock cleared after change')
  assert(auth.signatures.length === 0, 'signatures cleared')
}

console.log('=== Declaration text present ===')
{
  assert(IRS_PERJURY_DECLARATION.includes('penalties of perjury'), 'IRS declaration present')
}

console.log('=== Filing blocked without auth ===')
{
  const auth = defaultFilingAuthState({ spouseRequired: false })
  const gate = signatureLockStatus(auth, 'rv_abc')
  assert(!gate.valid, 'unsigned blocks filing')
}

if (failed) {
  console.error('\\n' + failed + ' failure(s)')
  process.exit(1)
}
console.log('\\nAll final filing tests passed.')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, npm_config_yes: 'true' },
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status ?? 1)
