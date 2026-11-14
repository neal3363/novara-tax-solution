/** Independent tax software company charter + commercial/ops scaffolds. */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-independent-company')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  COMPANY_CHARTER_VERSION,
  REQUIRED_OPERATING_MODEL,
  companyIndependenceStatement,
  assertIndependentOperatingModel,
  independentCompanyPillars,
  assertNotResellerOrWhiteLabel,
  commercialSoftwareSkuCatalog,
  assertCommercialPricingMatchesFees,
  COMMERCIAL_POSITIONING,
  priorityStateFilingRequirements,
  federalFilingRequirements,
  statesRequiringEfileApprovalBeforeLive,
  STATE_EFILE_DISCLAIMER,
  businessRegistrationChecklist,
  thirdPartyAgreementsRequired,
  defaultSupportOpsPlan,
  taxYearUpdateProgram,
  mobileDistributionChecklist,
  companyIndependenceSummary,
} from '../src/engine/company/index.ts'
import { getMefFlags } from '../src/engine/irs/mef/index.ts'
import { getPhase10Flags } from '../src/engine/payments/phase10/index.ts'
import { getPhase11Flags } from '../src/engine/returns/phase11/config.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

assertIndependentOperatingModel(REQUIRED_OPERATING_MODEL)
assert(REQUIRED_OPERATING_MODEL === 'independent_software_company', 'operating model')
assert(companyIndependenceStatement().includes('not a franchise'), 'independence statement')
assert(COMPANY_CHARTER_VERSION.includes('independent-company'), 'charter version')

const anti = assertNotResellerOrWhiteLabel({
  whiteLabelOfThirdParty: false,
  franchiseModel: false,
  dependsOnThirdPartyCalcEngine: false,
  dependsOnThirdPartyTransmitterPlatform: false,
})
assert(anti.ok, 'anti-reseller ok')
const bad = assertNotResellerOrWhiteLabel({ whiteLabelOfThirdParty: true })
assert(bad.ok === false, 'white-label rejected')

const pillars = independentCompanyPillars()
assert(pillars.length === 12, '12 company pillars')
assert(pillars.every(p => p.ownsIp === true), 'NOVARA owns IP on all pillars')
assert(pillars.some(p => p.id === 'direct_irs_mef' && p.status === 'simulated'), 'MeF simulated')
assert(pillars.some(p => p.id === 'tc_tp_office_products' && p.status === 'implemented'), 'TC/TP/Office implemented')

const pricing = assertCommercialPricingMatchesFees()
assert(pricing.ok, 'commercial pricing matches fees: ' + pricing.mismatches.join(';'))
const skus = commercialSoftwareSkuCatalog()
assert(skus.length === 8, '8 commercial SKUs')
assert(skus.filter(s => s.licensesSoftwareToProfessionals).length >= 5, 'TP/Office license SKUs')
assert(COMMERCIAL_POSITIONING.isFranchise === false, 'not franchise')
assert(COMMERCIAL_POSITIONING.isWhiteLabelReseller === false, 'not white-label')
assert(COMMERCIAL_POSITIONING.transmitterPath.includes('NOVARA_direct_IRS_MeF'), 'direct MeF path')

const states = priorityStateFilingRequirements()
assert(states.some(s => s.stateCode === 'CA' && s.efileRequiredForProduction), 'CA e-file required')
assert(states.some(s => s.stateCode === 'TX' && !s.efileRequiredForProduction), 'TX no PIT e-file')
assert(statesRequiringEfileApprovalBeforeLive().length >= 3, 'states need e-file approval')
assert(STATE_EFILE_DISCLAIMER.includes('not state e-file authorization'), 'state disclaimer')
assert(federalFilingRequirements().every(f => f.status === 'blocked' || f.status === 'scaffolded'), 'federal reqs gated')

const regs = businessRegistrationChecklist()
assert(regs.some(r => r.id === 'irs-efile-app' && r.blocksLiveLaunch), 'IRS app blocks launch')
assert(regs.some(r => r.id === 'bank-partner'), 'bank partner listed')
const agr = thirdPartyAgreementsRequired()
assert(agr.some(a => a.id === 'agr-stripe' && a.stripeIsNotSubstitute), 'Stripe not settlement')
assert(agr.some(a => a.id === 'agr-refund-bank'), 'refund bank agreement')

const support = defaultSupportOpsPlan()
assert(support.liveHelpdeskEnabled === false, 'helpdesk not live')
assert(taxYearUpdateProgram().atsRetestEachSeason === true, 'ATS each season')

const mobile = mobileDistributionChecklist()
assert(mobile.some(m => m.platform === 'web_responsive' && m.status === 'available'), 'web available')
assert(mobile.some(m => m.platform === 'ios' && m.status === 'account_required'), 'ios needs owner account')

assert(getMefFlags().liveProductionTransmit === false, 'MeF live OFF')
assert(getPhase10Flags().livePayments === false, 'payments live OFF')
assert(getPhase11Flags().nationwideStateFiling === false, 'nationwide state OFF')

const summary = companyIndependenceSummary()
assert(summary.includes('Independent Tax Software Company'), 'summary header')
assert(summary.includes('STOP before live'), 'summary stop')

console.log('=== INDEPENDENT_COMPANY_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)

let docFailed = 0
function docAssert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    docFailed++
  } else console.log('OK', m)
}
for (const d of [
  'docs/INDEPENDENT_TAX_SOFTWARE_COMPANY_CHARTER.md',
  'docs/COMPANY_CAPABILITY_GAP_MATRIX.md',
  'docs/STATE_EFILE_AUTHORIZATION_MATRIX.md',
  'docs/INDEPENDENT_COMPANY_OWNER_REQUIREMENTS.md',
]) {
  docAssert(existsSync(join(root, d)), `artifact ${d}`)
}
const charter = readFileSync(join(root, 'docs/INDEPENDENT_TAX_SOFTWARE_COMPANY_CHARTER.md'), 'utf8')
docAssert(/not\*?\*? a franchise/i.test(charter) || charter.includes('franchise'), 'charter forbids franchise')
docAssert(charter.includes('white-label'), 'charter forbids white-label')

rmSync(tmp, { recursive: true, force: true })
process.exit(r.status === 0 && docFailed === 0 ? 0 : 1)
