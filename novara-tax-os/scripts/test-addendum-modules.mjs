/**
 * Remaining addendum modules: engagement consent, correction center, backup, tax-law updates.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-addendum-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  emptyEngagementConsentState,
  missingIntakeFields,
  identifyMissingAuthorizations,
  signEngagementConsent,
  withdrawEngagementConsent,
  engagementConsentDownloadText,
} from '../src/engine/engagementConsent.ts'
import { buildCorrectionCenterReport, explainRejection } from '../src/engine/returnCorrectionCenter.ts'
import { buildContinuityDashboard, runSyntheticRecoveryTest } from '../src/engine/backupRecovery.ts'
import {
  buildTaxLawUpdateDashboard,
  approveTaxRulePack,
  rulesForTaxYear,
} from '../src/engine/taxLawUpdateManager.ts'
import { BENEFIT_RULE_VERSION } from '../src/data/benefitsCatalog.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Engagement / §7216 consents ===')
{
  let s = emptyEngagementConsentState()
  assert(s.records.length >= 5, 'consent package seeded')
  assert(identifyMissingAuthorizations(s).length === s.records.length, 'all pending initially')
  const missing = missingIntakeFields({
    answers: {},
    knownName: 'Alex',
    knownEmail: 'alex@example.com',
  })
  assert(!missing.some((f) => f.id === 'preferred_name'), 'skips known name')
  assert(!missing.some((f) => f.id === 'email'), 'skips known email')
  assert(missing.some((f) => f.id === 'phone'), 'asks missing phone')
  s = signEngagementConsent(s, 'engagement_letter', 'Alex Taxpayer')
  assert(s.records.find((r) => r.kind === 'engagement_letter')?.status === 'signed', 'engagement signed')
  s = signEngagementConsent(s, 'section_7216_use_disclosure', 'Alex Taxpayer')
  assert(s.records.find((r) => r.kind === 'section_7216_use_disclosure')?.status === 'signed', '7216 signed separately')
  s = withdrawEngagementConsent(s, 'section_7216_use_disclosure', 'Changed mind')
  assert(s.records.find((r) => r.kind === 'section_7216_use_disclosure')?.status === 'withdrawn', '7216 withdrawn')
  const text = engagementConsentDownloadText(s, 'Alex Taxpayer')
  assert(text.includes('Audit trail'), 'download includes audit')
  assert(text.includes('engagement-2025-v1'), 'version in download')
}

console.log('=== Correction / amendment center ===')
{
  const codes = explainRejection('R0000-500-01 TIN mismatch')
  assert(codes.some((c) => c.code === 'R0000-500-01'), 'maps known reject code')
  const rejected = {
    id: 'r1', clientName: 'Alex', clientId: 'u', taxYear: 2025, type: '1040',
    state: 'Rejected', readiness: 80, refundOrOwe: 500, tenantId: 't',
    updatedAt: new Date().toISOString(), filingMode: 'original',
  } as any
  const report = buildCorrectionCenterReport({
    taxReturn: rejected,
    verifiedRefund: 500,
    delivery: null,
    bankApp: null,
  })
  assert(report.canEnterCorrection, 'rejected allows correction')
  assert(report.preserveOriginalNote.toLowerCase().includes('never silently overwrite'), 'preserve note')
  assert(report.reauthorizationRequired, 'reauth required')
  assert(report.versions.some((v) => v.preserved), 'preserves filed version')
}

console.log('=== Backup / continuity ===')
{
  const dash = buildContinuityDashboard({ role: 'efin_owner', auditEventCount: 3, documentCount: 2 })
  assert(dash.jobs.every((j) => j.integrityHash.length > 0), 'backup integrity hashes present')
  assert(dash.jobs.every((j) => j.encrypted === false), 'sandbox jobs not claiming KMS encryption')
  assert(!dash.access.canRestoreProduction, 'no production restore')
  const test = runSyntheticRecoveryTest(dash)
  assert(test.ok, 'synthetic recovery ok')
  assert(test.log.includes('no production data modified'), 'non-destructive')
  const denied = buildContinuityDashboard({ role: 'taxpayer', auditEventCount: 0, documentCount: 0 })
  assert(!denied.access.canViewInventory, 'taxpayer cannot view backup inventory')
}

console.log('=== Tax-law update manager ===')
{
  const dash = buildTaxLawUpdateDashboard()
  assert(dash.activeBenefitRuleVersion === BENEFIT_RULE_VERSION, 'pins existing benefit ruleset')
  assert(dash.packs.some((p) => p.jurisdiction === 'federal'), 'federal packs')
  assert(dash.packs.some((p) => p.jurisdiction === 'state'), 'state packs')
  assert(dash.warnings.some((w) => w.toLowerCase().includes('never auto-deploy')), 'no auto-deploy')
  const active = rulesForTaxYear(dash.currentTaxYear, dash.packs)
  assert(active?.taxYear === dash.currentTaxYear, 'year-specific pack')
  const draft = dash.packs.find((p) => p.status === 'draft' && !p.regressionPassed)!
  const blocked = approveTaxRulePack(draft, 'Admin')
  assert(!blocked.ok, 'blocks approval without regression')
}

if (failed) {
  console.error('\\n' + failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('\\nAll addendum module checks passed')
`,
)

const r = spawnSync('npx', ['tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
if (r.status !== 0) process.exit(r.status ?? 1)
