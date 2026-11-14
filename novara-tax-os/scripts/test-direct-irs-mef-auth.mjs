/** Direct IRS MeF authorization pathway + offline ATS scaffolding tests. */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-direct-irs-mef-auth')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  OFFICIAL_IRS_EFILE_LINKS,
  recommendedNovaraProviderRoles,
  ownerEservicesApplicationChecklist,
  identifiersRequiredForNovaraModel,
  evaluateOfficialAtsReadiness,
  assertNotMockAsOfficialAts,
  individualAtsScenarioCatalog,
  scenariosAwaitingOfficialIrsIds,
  ATS_DISCLAIMER,
  buildAllSyntheticAtsPacks,
  getMefFlags,
  assertNoLiveIrsTransmit,
} from '../src/engine/irs/mef/index.ts'
import {
  approvedSoftwareStripePriceCatalog,
  isStripeLiveEnabled,
  resolveStripePriceId,
  REFUND_SETTLEMENT_STRIPE_BAN,
} from '../src/engine/payments/phase10/stripePriceCatalog.ts'
import { PRICING, TC_PERSONAL_FEE, TC_BUSINESS_FEE } from '../src/data/fees.ts'
import { MEF_EXTERNAL_CERTIFICATION_STEPS } from '../src/engine/remediation/mefReadiness.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

assertNoLiveIrsTransmit()
assert(getMefFlags().liveProductionTransmit === false, 'liveProductionTransmit OFF')
assert(TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399, 'TC pricing intact')
assert(PRICING.TP.personalReturn === 89, 'TP personal intact')
assert(PRICING.Office.plans.business.annual === 1499, 'Office business intact')

assert(OFFICIAL_IRS_EFILE_LINKS.length >= 8, 'official IRS links present')
assert(OFFICIAL_IRS_EFILE_LINKS.every(l => l.url.startsWith('https://www.irs.gov')), 'IRS.gov links only')

const roles = recommendedNovaraProviderRoles()
assert(roles.some(r => r.role === 'software_developer' && r.requiredForDirectMef), 'Software Developer required')
assert(roles.some(r => r.role === 'transmitter' && r.requiredForDirectMef), 'Transmitter required')

const checklist = ownerEservicesApplicationChecklist()
assert(checklist.length >= 8, 'owner e-Services checklist')
assert(checklist.every(i => i.blocksLiveTransmit === true), 'checklist blocks live transmit')

const ids = identifiersRequiredForNovaraModel()
assert(ids.some(i => i.identifier.includes('EFIN') && i.required), 'NOVARA EFIN required')
assert(ids.some(i => i.identifier.includes('Office') && !i.required), 'office EFIN not required for corporate MeF')

const emptyAts = evaluateOfficialAtsReadiness({})
assert(!emptyAts.canAttemptOfficialAts, 'empty ATS blocked')
assert(emptyAts.channel === 'mock_internal', 'defaults to mock channel')
assert(!emptyAts.canClaimOfficialAtsComplete, 'never auto-claim ATS complete')

const readyAts = evaluateOfficialAtsReadiness({
  softwareDeveloperTestEtin: 'TEST-ETIN',
  softwareId: 'SW-ID-001',
  efin: '123456',
  atsWindowOpenAttested: true,
  scenarioSetAttested: true,
})
assert(readyAts.canAttemptOfficialAts, 'ATS ready when credentials + attestations present')
assert(readyAts.canClaimOfficialAtsComplete === false, 'still cannot auto-claim complete')

const mockBan = assertNotMockAsOfficialAts({
  ackSimulated: true,
  liveIrs: false,
  claimedOfficialAtsComplete: true,
})
assert(mockBan.ok === false, 'mock ACK cannot prove official ATS')

const scenarios = individualAtsScenarioCatalog()
assert(scenarios.length >= 6, 'ATS scenario catalog populated')
assert(scenariosAwaitingOfficialIrsIds().length === scenarios.length, 'official Pub 1436 IDs pending')
assert(ATS_DISCLAIMER.includes('NOT official IRS ATS'), 'ATS disclaimer')

const packs = buildAllSyntheticAtsPacks()
assert(packs.length === scenarios.length, 'synthetic packs for each scenario')
assert(packs.every(p => p.primaryTinMasked.includes('*')), 'synthetic TINs masked')

const catalog = approvedSoftwareStripePriceCatalog()
assert(catalog.length === 8, '8 Stripe price slots for approved tiers')
assert(catalog.find(s => s.productKey === 'tc_personal')?.amountUsd === 300, 'Stripe maps TC personal 300')
assert(catalog.find(s => s.productKey === 'office_business')?.amountUsd === 1499, 'Stripe maps Office 1499')
assert(isStripeLiveEnabled({}) === false, 'Stripe live disabled by default')
const liveTry = resolveStripePriceId(catalog[0], {})
assert(liveTry.ok === false, 'resolve price blocked when live off')
assert(REFUND_SETTLEMENT_STRIPE_BAN.includes('not use Stripe'), 'Stripe ban for refund settlement')

assert(MEF_EXTERNAL_CERTIFICATION_STEPS.some(s => s.includes('Software Developer')), 'external steps mention Software Developer')
assert(MEF_EXTERNAL_CERTIFICATION_STEPS.some(s => s.includes('mock ACKs')), 'external steps warn mock ≠ ATS')

console.log('=== DIRECT_IRS_MEF_AUTH_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)

// Docs + infra presence
let docFailed = 0
function docAssert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    docFailed++
  } else console.log('OK', m)
}
const docs = [
  'docs/IRS_EFILE_AUTHORIZATION_PATHWAY.md',
  'docs/MEF_DIRECT_INTEGRATION_GAP_MATRIX.md',
  'docs/OWNER_AUTHORIZATION_AND_LAUNCH_REQUIREMENTS.md',
  'infra/cloudflare/README.md',
  'infra/cloudflare/wrangler.example.toml',
  'infra/cloudflare/worker-api.example.ts',
  'infra/cloudflare/d1/schema.example.sql',
]
for (const d of docs) {
  docAssert(existsSync(join(root, d)), `artifact ${d}`)
}
const owner = readFileSync(join(root, 'docs/OWNER_AUTHORIZATION_AND_LAUNCH_REQUIREMENTS.md'), 'utf8')
docAssert(owner.includes('OWNER AUTHORIZATION & LAUNCH REQUIREMENTS'), 'owner report title')
docAssert(owner.includes('Tasks requiring your signature'), 'owner signature section')
docAssert(!owner.includes('liveProductionTransmit=true'), 'owner report does not enable live transmit')

rmSync(tmp, { recursive: true, force: true })
const codeFailed = r.status === 0 ? 0 : r.status ?? 1
process.exit(codeFailed !== 0 || docFailed > 0 ? 1 : 0)
