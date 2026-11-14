/**
 * Master production launch acceptance harness.
 * Honest statuses only — never invents production readiness.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

function runNpm(script) {
  const r = spawnSync('npm', ['run', script], { cwd: root, encoding: 'utf8' })
  return { script, status: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') }
}

const requiredDocs = [
  'docs/ARCHITECTURE.md',
  'docs/BUSINESS_CONTINUITY.md',
  'docs/ENV_VARIABLE_INVENTORY.md',
  'docs/OPERATING_COST_ESTIMATES.md',
  'docs/EXTERNAL_APPROVAL_TRACKER.md',
  'docs/MASTER_PRODUCTION_LAUNCH_REPORT.md',
  'public/robots.txt',
  'public/sitemap.xml',
  'src/pages/Legal.tsx',
  'vercel.json',
]

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    failed++
  } else {
    console.log('OK', msg)
  }
}

console.log('=== Continuity / launch artifacts ===')
for (const rel of requiredDocs) {
  assert(existsSync(join(root, rel)), `artifact present: ${rel}`)
}

const robots = readFileSync(join(root, 'public/robots.txt'), 'utf8')
assert(robots.includes('Sitemap:'), 'robots declares sitemap')
assert(robots.includes('Disallow: /app/'), 'robots disallows authenticated app paths')

const vercel = readFileSync(join(root, 'vercel.json'), 'utf8')
assert(vercel.includes('Content-Security-Policy'), 'vercel CSP header configured')
assert(vercel.includes('X-Frame-Options'), 'vercel frame denial configured')

const arch = readFileSync(join(root, 'docs/ARCHITECTURE.md'), 'utf8')
assert(arch.includes('browser store') || arch.includes('client/store'), 'architecture documents client-store auth gap')

const legal = readFileSync(join(root, 'src/pages/Legal.tsx'), 'utf8')
assert(legal.includes('draft'), 'legal pages marked draft')
assert(legal.includes('Privacy Policy'), 'privacy page present')

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
assert(app.includes('/privacy') && app.includes('/terms') && app.includes('/help') && app.includes('/fees'), 'public legal/fees routes wired')

const suites = [
  'build',
  'test:pricing',
  'test:final-review',
  'test:payments-phase10',
  'test:launch-phase12',
  'test:master-acceptance',
  'test:public-demo-deploy',
  'test:publish-security',
]

console.log('\n=== Critical suite matrix ===')
const results = suites.map(runNpm)
for (const r of results) {
  assert(r.status === 0, `${r.script} exit 0`)
  if (r.status !== 0) {
    process.stdout.write(r.out.slice(-1500))
  }
}

const tmp = join(root, '.tmp-master-launch')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getPhase10Flags } from '../src/engine/payments/phase10/index.ts'
import { getMefFlags } from '../src/engine/irs/mef/index.ts'
import { cutoverReady, mayShowIrsToTaxpayer } from '../src/engine/irs/index.ts'
import { getRemediationFlags } from '../src/engine/remediation/index.ts'
import { finalReleaseGate, buildLaunchReadinessReport } from '../src/engine/launch/phase12/index.ts'
import {
  TP_PERSONAL_FEE,
  TP_SELF_EMPLOYED_FEE,
  TP_BUSINESS_FEE,
  OFFICE_SUBSCRIPTION_PERSONAL,
  OFFICE_SUBSCRIPTION_SELF_EMPLOYED,
  OFFICE_SUBSCRIPTION_BUSINESS,
  OFFICE_PERSONAL_FEE,
  TC_PERSONAL_FEE,
  TC_BUSINESS_FEE,
} from '../src/data/fees.ts'

const root = ${JSON.stringify(root)}
const rows: { id: string; area: string; status: string; detail: string; severity?: string }[] = []
function add(id: string, area: string, status: string, detail: string, severity?: string) {
  rows.push({ id, area, status, detail, severity })
}

add('pricing-tp', 'Pricing', TP_PERSONAL_FEE === 89 && TP_SELF_EMPLOYED_FEE === 119 && TP_BUSINESS_FEE === 249 ? 'PASS' : 'FAIL', 'TP per-return 89/119/249')
add('pricing-office', 'Pricing', OFFICE_SUBSCRIPTION_PERSONAL === 899 && OFFICE_SUBSCRIPTION_SELF_EMPLOYED === 1199 && OFFICE_SUBSCRIPTION_BUSINESS === 1499 ? 'PASS' : 'FAIL', 'Office annual 899/1199/1499')
add('pricing-office-per-return', 'Pricing', OFFICE_PERSONAL_FEE === 0 ? 'PASS' : 'FAIL', 'Office covered returns $0 NOVARA fee')
add('pricing-tc', 'Pricing', TC_PERSONAL_FEE === 300 && TC_BUSINESS_FEE === 399 ? 'PASS' : 'FAIL', 'TC 300/399 intact')

add('locks-pay', 'Production locks', getPhase10Flags().livePayments === false ? 'PASS' : 'FAIL', 'livePayments OFF')
add('locks-mef', 'Production locks', getMefFlags().liveProductionTransmit === false ? 'PASS' : 'FAIL', 'MeF live OFF')
add('locks-cutover', 'Production locks', cutoverReady() === false && mayShowIrsToTaxpayer() === false ? 'PASS' : 'FAIL', 'IRS cutover/visibility OFF')
add('locks-enforce', 'Production locks', getRemediationFlags().productionEnforcement === false ? 'PASS' : 'FAIL', 'productionEnforcement OFF')

const report = buildLaunchReadinessReport()
const gate = finalReleaseGate(true)
add('gate-ready', 'Launch gate', report.productionReady === false ? 'PASS' : 'FAIL', 'productionReady=false')
add('gate-go', 'Launch gate', gate.productionGo === false ? 'PASS' : 'FAIL', 'productionGo=false even if humanApproved')

add('backend-workers', 'Backend', existsSync(join(root, 'wrangler.toml')) ? 'FAIL' : 'BLOCKED', 'Cloudflare Workers/wrangler absent — expected until infra build', 'critical')
add('backend-d1', 'Backend', 'BLOCKED', 'D1 migrations absent', 'critical')
add('backend-r2', 'Backend', 'BLOCKED', 'R2 document store absent', 'critical')
add('mobile-native', 'Mobile', 'BLOCKED', 'No native iOS/Android store apps', 'high')
add('load-concurrent', 'Scalability', 'NOT_TESTED', '100/1k/10k concurrent HTTP users not measured', 'high')
add('appsec', 'Security', 'BLOCKED', 'Independent AppSec / pen test required', 'critical')
add('irs-ats', 'IRS MeF', 'BLOCKED', 'Official ATS not executed', 'critical')
add('stripe-live', 'Payments', 'BLOCKED', 'Live Stripe Price IDs not bound', 'critical')
add('dns', 'Domain', 'BLOCKED', 'Custom DNS requires owner approval', 'high')
add('gsc', 'SEO', 'PASS_STAGING', 'robots.txt + sitemap present; Search Console needs owned domain')
add('legal-draft', 'Ops', existsSync(join(root, 'src/pages/Legal.tsx')) ? 'PASS_STAGING' : 'FAIL', 'Draft Privacy/Terms/Help pages')
add('continuity-docs', 'Continuity', existsSync(join(root, 'docs/BUSINESS_CONTINUITY.md')) ? 'PASS' : 'FAIL', 'Business continuity pack present')
add('host-csp', 'Security', readFileSync(join(root, 'vercel.json'), 'utf8').includes('Content-Security-Policy') ? 'PASS_STAGING' : 'FAIL', 'Demo host CSP + frame denial headers')
add('auth-data-plane', 'Backend', 'BLOCKED', 'Tax data remains client/store-scoped; server multi-tenant API absent', 'critical')

const totals = { recorded: rows.length, pass: 0, pass_staging: 0, fail: 0, blocked: 0, not_tested: 0 }
for (const r of rows) {
  const s = r.status.toLowerCase()
  if (s === 'pass') totals.pass++
  else if (s === 'pass_staging') totals.pass_staging++
  else if (s === 'fail') totals.fail++
  else if (s === 'blocked') totals.blocked++
  else totals.not_tested++
}

const decisions = {
  publicDemoLaunch: 'GO_SYNTHETIC_ONLY',
  realTaxpayerProduction: 'NO-GO',
}

const out = {
  generatedAt: new Date().toISOString(),
  productionActivation: false,
  totals,
  decisions,
  authorizationRequired: [
    'Custom DNS / Cloudflare',
    'Live Stripe keys and Price IDs',
    'Live IRS ATS / filing',
    'Banking partner go-live',
    'Production enforcement flags',
    'App Store / Play submission',
    'Accepting real taxpayer data',
  ],
  rows,
}

console.log(JSON.stringify(out, null, 2))
if (totals.fail > 0) process.exit(1)
`,
)

const agg = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (agg.stdout) {
  process.stdout.write(agg.stdout)
  const jsonStart = agg.stdout.indexOf('{')
  if (jsonStart >= 0) {
    writeFileSync(join(root, 'docs/MASTER_PRODUCTION_LAUNCH_SCORECARD.json'), agg.stdout.slice(jsonStart))
  }
}
if (agg.stderr) process.stderr.write(agg.stderr)
rmSync(tmp, { recursive: true, force: true })

if (agg.status) failed++
console.log(`\n=== MASTER_PRODUCTION_LAUNCH failed=${failed} agg_exit=${agg.status ?? 1} ===`)
process.exit(failed || agg.status ? 1 : 0)
