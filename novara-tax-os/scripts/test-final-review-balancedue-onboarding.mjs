/**
 * AI Final Return Review, balance-due guidance, office onboarding wizard.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-final-review-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { defaultProfile, applyAnswer, runBenefitOptimization } from '../src/engine/benefitOptimizer.ts'
import { applyFilingStatusAnswer } from '../src/engine/smartInterview.ts'
import { runFinalReturnReview } from '../src/engine/finalReturnReview.ts'
import { buildBalanceDueGuidance } from '../src/engine/balanceDuePayments.ts'
import {
  emptyOfficeOnboardingDraft,
  evaluateOfficeOnboarding,
} from '../src/engine/officeOnboarding.ts'
import {
  defaultFilingAuthState,
  acceptConsent,
  captureSignature,
  lockReturnVersion,
} from '../src/engine/filingAuthorizations.ts'
import { buildWorkingReturnPacket } from '../src/engine/returnPacket.ts'
import {
  OFFICE_PERSONAL_FEE,
  OFFICE_BUSINESS_FEE,
  OFFICE_SUBSCRIPTION_PERSONAL,
  OFFICE_SUBSCRIPTION_BUSINESS,
} from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

function baseProfile() {
  let p = defaultProfile()
  p = applyFilingStatusAnswer(p, 'married_dec31', 'No')
  p = applyFilingStatusAnswer(p, 'potential_dependents', 'no')
  return p
}

console.log('=== Final return review blocks without signatures ===')
{
  const p = baseProfile()
  const report = runBenefitOptimization(p)
  const snap = {
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
    refundIncomplete: report.refundIncomplete,
    refundIncompleteReason: report.refundIncompleteReason,
  } as any
  const review = runFinalReturnReview({
    profile: p,
    benefitReport: snap,
    documents: [],
    refundDelivery: null,
    filingAuth: null,
    filingAuthorized: false,
    clientName: 'Alex Taxpayer',
  })
  assert(review.overall === 'blocked', 'unsigned return blocked')
  assert(!review.canEfile, 'cannot efile without auth')
  assert(review.checks.some((c) => c.id === 'authorizations' && c.blocking), 'auth check blocking')
  assert(review.checks.some((c) => c.id === 'income'), 'income check present')
  assert(review.checks.some((c) => c.id === 'refund_or_balance'), 'refund/balance check present')
}

console.log('=== Final return review: delivery required when refund > 0 ===')
{
  const p = baseProfile()
  const report = runBenefitOptimization(p)
  const snap = {
    taxYear: report.taxYear,
    ruleVersion: report.ruleVersion,
    baseRefund: report.baseRefund,
    projectedRefund: Math.max(report.projectedRefund, 500),
    verifiedSavings: report.verifiedSavings,
    potentialSavings: report.potentialSavings,
    auditComplete: true,
    blockers: [] as string[],
    comparisonNotes: [] as string[],
    findings: report.findings,
    formLines: report.formLines,
    lastRunAt: new Date().toISOString(),
    refundIncomplete: false,
  } as any
  const docs = [{
    id: 'd1', name: 'W2.pdf', type: 'W-2', taxYear: p.taxYear, sizeLabel: '1KB',
    uploadedAt: new Date().toISOString(), status: 'verified', confidence: 0.99,
    ownerId: 'u', clientId: 'u', tenantId: 't', facts: [],
  }] as any
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
    auth = acceptConsent(auth, kind, 'Alex Taxpayer')
  }
  const packet = buildWorkingReturnPacket({
    profile: p,
    benefitReport: snap,
    clientName: 'Alex Taxpayer',
    locked: false,
  })
  auth = lockReturnVersion(auth, {
    versionId: packet.versionId,
    contentHash: packet.contentHash,
    lockedAt: new Date().toISOString(),
    lockedByUserId: 'u',
    taxYear: p.taxYear,
    projectedRefund: snap.projectedRefund,
  })
  auth = captureSignature(auth, {
    role: 'primary',
    signerName: 'Alex Taxpayer',
    typedName: 'Alex Taxpayer',
    method: 'typed_name',
    versionId: packet.versionId,
    contentHash: packet.contentHash,
  })
  const noDelivery = runFinalReturnReview({
    profile: p,
    benefitReport: snap,
    documents: docs,
    refundDelivery: null,
    filingAuth: auth,
    filingAuthorized: true,
    clientName: 'Alex Taxpayer',
  })
  assert(!noDelivery.canEfile, 'blocks when refund > 0 and no delivery')
  assert(noDelivery.checks.some((c) => c.id === 'delivery' && c.status === 'fail'), 'delivery fail')

  const withDelivery = runFinalReturnReview({
    profile: p,
    benefitReport: snap,
    documents: docs,
    refundDelivery: {
      method: 'paper_check',
      verifiedRefundAmount: snap.projectedRefund,
      selectedAt: new Date().toISOString(),
      taxpayerAuthorized: true,
    },
    filingAuth: auth,
    filingAuthorized: true,
    clientName: 'Alex Taxpayer',
  })
  assert(withDelivery.checks.some((c) => c.id === 'delivery' && c.status === 'pass'), 'delivery pass with paper check')
}

console.log('=== Balance due guidance ===')
{
  const due = buildBalanceDueGuidance({
    refundOrBalance: -1840,
    taxYear: 2025,
    filingState: 'TX',
  })
  assert(due.isBalanceDue, 'balance due flagged')
  assert(due.balanceDue === 1840, 'absolute balance')
  assert(due.options.some((o) => o.id === 'irs_direct_pay'), 'Direct Pay option')
  assert(due.options.some((o) => o.id === 'eftps'), 'EFTPS option')
  assert(due.options.some((o) => o.id === 'payment_plan'), 'payment plan')
  assert(due.options.some((o) => o.id === 'state_payment'), 'state payment when state set')
  assert(due.disclaimer.toLowerCase().includes('never claims'), 'no fake payment claim')
  assert(!due.explanation.toLowerCase().includes('payment submitted'), 'no submitted claim in explanation')

  const refund = buildBalanceDueGuidance({
    refundOrBalance: 900,
    taxYear: 2025,
  })
  assert(!refund.isBalanceDue, 'refund is not balance due')
  assert(refund.options.length >= 2, 'still shows limited guidance when no balance')
}

console.log('=== Office onboarding readiness ===')
{
  const empty = emptyOfficeOnboardingDraft()
  const now = new Date().toISOString()
  const owner = {
    id: 'owner1',
    name: 'Office Owner',
    email: 'owner@example.com',
    role: 'efin_owner',
    accountType: 'tax_office',
    tenantId: 'office-1',
    credentials: {
      efin: {
        kind: 'efin', value: '123456', status: 'unverified', submittedAt: now,
        method: 'format_only', taxYear: 2025, displayHint: '****56',
      },
      ptin: {
        kind: 'ptin', value: 'P12345678', status: 'verified', submittedAt: now, verifiedAt: now,
        method: 'format_only', taxYear: 2025, displayHint: 'P****5678',
      },
    },
  } as any
  const incomplete = evaluateOfficeOnboarding({ draft: empty, owner, staff: [] })
  assert(incomplete.activationStatus === 'blocked' || incomplete.percentComplete < 100, 'empty draft not fully ready')
  assert(incomplete.steps.length === 6, 'six onboarding steps')
  assert(incomplete.steps.every((s) => s.title.length > 0), 'step titles present')

  const draft = {
    ...empty,
    businessName: 'Demo Tax LLC',
    contactEmail: 'owner@example.com',
    phone: '555-0100',
    addressLine1: '100 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    authorizedRep: 'Office Owner',
    efinInput: '123456',
    // Office-set client preparation charges (not NOVARA platform fees).
    officeServicePersonalFee: 250,
    officeServiceBusinessFee: 450,
    selectedBankProviderId: 'novara-platform-default',
    completedSteps: ['registration', 'efin', 'preparers', 'pricing', 'banking', 'readiness'] as any,
    updatedAt: now,
  }
  const staff = [{
    id: 's1',
    userId: 'prep1',
    name: 'Prep One',
    email: 'prep@example.com',
    kind: 'preparer',
    status: 'active',
    tenantId: 'office-1',
    invitedAt: now,
    ptinDisplay: 'P****5678',
    ptinStatus: 'verified',
  }] as any
  const ready = evaluateOfficeOnboarding({
    draft,
    owner: {
      ...owner,
      credentials: {
        efin: {
          kind: 'efin', value: '123456', status: 'verified', submittedAt: now, verifiedAt: now,
          method: 'format_only', taxYear: 2025, displayHint: '****56',
        },
        ptin: owner.credentials.ptin,
      },
    },
    staff,
  })
  assert(ready.steps.find((s) => s.id === 'registration')?.complete, 'registration complete')
  assert(ready.steps.find((s) => s.id === 'banking')?.complete, 'banking selection complete')
  assert(ready.percentComplete > incomplete.percentComplete, 'progress increases with data')
  assert(ready.summary.length > 0, 'readiness summary')
  assert(OFFICE_SUBSCRIPTION_PERSONAL === 899 && OFFICE_SUBSCRIPTION_BUSINESS === 1499, 'Office annual subscription constants preserved')
  assert(OFFICE_PERSONAL_FEE === 0 && OFFICE_BUSINESS_FEE === 0, 'Office covered returns carry $0 NOVARA per-return fee')
}

if (failed) {
  console.error('\\n' + failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('\\nAll final-review / balance-due / onboarding checks passed')
`,
)

const r = spawnSync(
  'npx',
  ['tsx', join(tmp, 'run.ts')],
  { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } },
)
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
if (r.status !== 0) process.exit(r.status ?? 1)
