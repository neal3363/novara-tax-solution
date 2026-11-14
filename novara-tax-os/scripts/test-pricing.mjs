import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-pricing-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  PRICING,
  TC_PERSONAL_FEE,
  TC_BUSINESS_FEE,
  TP_REGISTRATION_FEE,
  TP_PERSONAL_FEE,
  TP_SELF_EMPLOYED_FEE,
  TP_BUSINESS_FEE,
  OFFICE_SUBSCRIPTION_PERSONAL,
  OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
  OFFICE_SUBSCRIPTION_BUSINESS,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  OFFICE_PERSONAL_FEE,
  OFFICE_BUSINESS_FEE,
  returnSoftwareFee,
  novaraSoftwareFeeForReturn,
  officePlanAllowsReturn,
  dedupeFeeLines,
  estimateNovaraAnnualCharges,
  assertUnlimitedProfessionalAccess,
  assertApprovedTpOfficePricing,
  clientQuotaForTier,
  TIER_REGISTRATION_CARDS,
  OFFICE_TIERS,
} from '../src/data/fees.ts'
import { quoteCharge } from '../src/engine/payments/phase10/quotes.ts'
import { buildPreSignFeeBreakdown } from '../src/engine/feeLedger.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Official price table ===')
assert(TC_PERSONAL_FEE === 300, 'TC personal 300')
assert(TC_BUSINESS_FEE === 399, 'TC business 399')
assert(TP_REGISTRATION_FEE === 0, 'TP no annual subscription')
assert(TP_PERSONAL_FEE === 89, 'TP personal 89 per return')
assert(TP_SELF_EMPLOYED_FEE === 119, 'TP SE 119 per return')
assert(TP_BUSINESS_FEE === 249, 'TP business entity 249 per return')
assert(OFFICE_SUBSCRIPTION_PERSONAL === 899, 'Office Personal 899/yr')
assert(OFFICE_SUBSCRIPTION_SELF_EMPLOYED === 1199, 'Office SE 1199/yr')
assert(OFFICE_SUBSCRIPTION_BUSINESS === 1499, 'Office Business 1499/yr')
assert(OFFICE_SUBSCRIPTION_FLOOR === 899 && OFFICE_SUBSCRIPTION_HIGH === 1499, 'Office range')
assert(OFFICE_PERSONAL_FEE === 0 && OFFICE_BUSINESS_FEE === 0, 'Office covered returns $0')
assert(PRICING.TC.registration === 0, 'TC registration 0')
assert(PRICING.TP.billingModel === 'pay_per_return', 'TP pay per return')
assert(PRICING.TP.canManagePreparers === false, 'TP cannot manage preparers')
assert(PRICING.Office.canManagePreparers === true, 'Office can manage preparers')
assert(PRICING.preserveExistingBillingAgreements === true, 'preserve existing agreements')
assert(assertApprovedTpOfficePricing().ok, 'assertApprovedTpOfficePricing')

console.log('=== Checkout helpers ===')
assert(returnSoftwareFee('TC', false).amount === 300, 'TC personal checkout')
assert(returnSoftwareFee('TC', true).amount === 399, 'TC business checkout')
assert(returnSoftwareFee('TP', false).amount === 89, 'TP personal checkout')
assert(returnSoftwareFee('TP', true).amount === 249, 'TP business entity checkout')
assert(returnSoftwareFee('Office', false).amount === 0, 'Office personal included')
assert(returnSoftwareFee('Office', true).amount === 0, 'Office business included when eligible')

const se = novaraSoftwareFeeForReturn({ tier: 'TP', kind: 'self_employed' })
assert(se.amount === 119 && se.eligible, 'TP SE standalone 119')

const officeSeBlocked = novaraSoftwareFeeForReturn({
  tier: 'Office', kind: 'self_employed', officePlanId: 'office-personal',
})
assert(!officeSeBlocked.eligible, 'Office Personal plan blocks Schedule C')

const officeSeOk = novaraSoftwareFeeForReturn({
  tier: 'Office', kind: 'self_employed', officePlanId: 'office-self-employed',
})
assert(officeSeOk.eligible && officeSeOk.amount === 0, 'Office SE plan covers Sch C at $0')

const officeBizOk = novaraSoftwareFeeForReturn({
  tier: 'Office', kind: 'business_entity', officePlanId: 'office-business',
})
assert(officeBizOk.eligible && officeBizOk.amount === 0, 'Office Business covers entity at $0')

const officePrep = novaraSoftwareFeeForReturn({
  tier: 'TP', kind: 'personal', officeEmployedPreparer: true, officePlanId: 'office-personal',
})
assert(officePrep.amount === 0 && officePrep.eligible, 'office-employed preparer not charged TP fee')

assert(officePlanAllowsReturn('office-personal', 'personal'), 'personal allows personal')
assert(!officePlanAllowsReturn('office-personal', 'business_entity'), 'personal blocks entity')
assert(officePlanAllowsReturn('office-business', 'business_entity'), 'business allows entity')

console.log('=== Quotes ===')
assert(quoteCharge('tp_personal').amountDollars === 89, 'quote tp personal')
assert(quoteCharge('tp_self_employed').amountDollars === 119, 'quote tp se')
assert(quoteCharge('tp_business').amountDollars === 249, 'quote tp business')
assert(quoteCharge('tp_subscription').amountDollars === 0, 'quote tp sub 0')
assert(quoteCharge('office_subscription_personal').amountDollars === 899, 'quote office personal')
assert(quoteCharge('office_subscription_self_employed').amountDollars === 1199, 'quote office se')
assert(quoteCharge('office_subscription_business').amountDollars === 1499, 'quote office business')
assert(quoteCharge('office_personal').amountDollars === 0, 'quote office covered personal')

console.log('=== Fee ledger office vs TP ===')
const tpLedger = buildPreSignFeeBreakdown({
  accountType: 'independent_tp', taxReturn: { isBusiness: false } as any, taxYear: 2025, seasonYear: 2026,
})
assert(tpLedger.novaraTotal === 89 || tpLedger.lines.some(l => l.amount === 89), 'TP ledger personal 89')

const officeLedger = buildPreSignFeeBreakdown({
  accountType: 'office_preparer', taxReturn: { isBusiness: false } as any, taxYear: 2025, seasonYear: 2026,
  officePlanId: 'office-personal',
})
assert(officeLedger.lines.some(l => l.amount === 0 && l.id === 'novara-software'), 'office preparer $0 software')

console.log('=== Dedup ===')
const once = dedupeFeeLines([], { label: 'TP personal', amount: 89, status: 'approved' })
const twice = dedupeFeeLines(once, { label: 'TP personal', amount: 89, status: 'approved' })
assert(once.length === 1 && twice.length === 1, 'no duplicate software charges')

console.log('=== Unlimited ===')
assert(assertUnlimitedProfessionalAccess('TP'), 'TP unlimited')
assert(assertUnlimitedProfessionalAccess('Office'), 'Office unlimited')
assert(clientQuotaForTier('TP') === null, 'TP quota null')
assert(clientQuotaForTier('Office') === null, 'Office quota null')
assert(PRICING.TP.unlimitedClients && PRICING.TP.unlimitedReturns, 'TP flags')
assert(PRICING.Office.unlimitedClients && PRICING.Office.unlimitedReturns, 'Office flags')

console.log('=== Registration cards ===')
assert(TIER_REGISTRATION_CARDS.length === 3, 'three cards')
assert(TIER_REGISTRATION_CARDS.map(c => c.tier).join() === 'TC,TP,Office', 'tier order')
assert(TIER_REGISTRATION_CARDS[1].registrationAmount === 0, 'TP card no subscription')
assert(OFFICE_TIERS.length === 3, 'three office tiers')

console.log('=== Estimator ===')
const tpEst = estimateNovaraAnnualCharges({
  subscriptionAnnual: 0, individualReturns: 10, selfEmployedReturns: 2, businessReturns: 1, schedule: 'TP',
})
assert(tpEst.total === 10 * 89 + 2 * 119 + 249, 'TP pay-per-return math ' + tpEst.total)
const officeEst = estimateNovaraAnnualCharges({
  subscriptionAnnual: 1199, individualReturns: 100, selfEmployedReturns: 20, businessReturns: 5, schedule: 'Office',
})
assert(officeEst.total === 1199 && officeEst.perReturnTotal === 0, 'Office subscription only ' + officeEst.total)

console.log('=== Scale smoke ===')
for (const n of [100, 1000, 10000]) {
  const clients = Array.from({ length: n }, (_, i) => ({ id: 'c'+i }))
  assert(clients.length === n && clientQuotaForTier('TP') === null, 'TP supports ' + n + ' clients conceptually')
}

if (failed) { console.error(failed + ' failed'); process.exit(1) }
console.log('All pricing tests passed.')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NPM_CONFIG_YES: 'true' },
})
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(r.status ?? 1)
