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
  TP_BUSINESS_FEE,
  OFFICE_SUBSCRIPTION_FLOOR,
  OFFICE_SUBSCRIPTION_HIGH,
  OFFICE_PERSONAL_FEE,
  OFFICE_BUSINESS_FEE,
  returnSoftwareFee,
  dedupeFeeLines,
  estimateNovaraAnnualCharges,
  assertUnlimitedProfessionalAccess,
  clientQuotaForTier,
  TIER_REGISTRATION_CARDS,
} from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

console.log('=== Official price table ===')
assert(TC_PERSONAL_FEE === 300, 'TC personal 300')
assert(TC_BUSINESS_FEE === 399, 'TC business 399')
assert(TP_REGISTRATION_FEE === 599, 'TP reg 599')
assert(TP_PERSONAL_FEE === 129, 'TP personal 129')
assert(TP_BUSINESS_FEE === 249, 'TP business 249')
assert(OFFICE_SUBSCRIPTION_FLOOR === 899, 'Office 899')
assert(OFFICE_SUBSCRIPTION_HIGH === 1250, 'Office 1250')
assert(OFFICE_PERSONAL_FEE === 89, 'Office personal 89')
assert(OFFICE_BUSINESS_FEE === 249, 'Office business 249')
assert(PRICING.TC.registration === 0, 'TC registration 0')

console.log('=== No legacy fees ===')
assert(TP_PERSONAL_FEE !== 89.99, 'not legacy 89.99 personal')
assert(TP_BUSINESS_FEE !== 239.98, 'not legacy 239.98 business')

console.log('=== Checkout helpers ===')
assert(returnSoftwareFee('TC', false).amount === 300, 'TC personal checkout')
assert(returnSoftwareFee('TC', true).amount === 399, 'TC business checkout')
assert(returnSoftwareFee('TP', false).amount === 129, 'TP personal checkout')
assert(returnSoftwareFee('TP', true).amount === 249, 'TP business checkout')
assert(returnSoftwareFee('Office', false).amount === 89, 'Office personal checkout')
assert(returnSoftwareFee('Office', true).amount === 249, 'Office business checkout')

console.log('=== Dedup ===')
const once = dedupeFeeLines([], { label: 'TP personal', amount: 129, status: 'approved' })
const twice = dedupeFeeLines(once, { label: 'TP personal', amount: 129, status: 'approved' })
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

console.log('=== Office subscription selection ===')
const low = estimateNovaraAnnualCharges({ subscriptionAnnual: 899, individualReturns: 100, businessReturns: 10, schedule: 'Office' })
const high = estimateNovaraAnnualCharges({ subscriptionAnnual: 1250, individualReturns: 100, businessReturns: 10, schedule: 'Office' })
assert(low.total === 899 + 100 * 89 + 10 * 249, '899 plan math ' + low.total)
assert(high.total === 1250 + 100 * 89 + 10 * 249, '1250 plan math ' + high.total)

console.log('=== Scale smoke (client record counts) ===')
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
