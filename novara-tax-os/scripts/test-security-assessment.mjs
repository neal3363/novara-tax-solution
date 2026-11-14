/** Automated security assessment readiness — NOT an independent pentest. */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const outDir = join(root, 'docs/security-assessment')
mkdirSync(outDir, { recursive: true })

const tmp = join(root, '.tmp-security-assessment')
mkdirSync(tmp, { recursive: true })

function run(cmd, args, label) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' })
  const ok = r.status === 0
  console.log(ok ? 'OK' : 'FAIL', label, 'exit=' + (r.status ?? 'null'))
  return { label, ok, status: r.status, stdout: (r.stdout || '').slice(-2000), stderr: (r.stderr || '').slice(-1000) }
}

const audit = run('npm', ['audit', '--json'], 'npm_audit')
let auditMeta = { vulnerabilities: { total: -1 } }
try {
  auditMeta = JSON.parse(audit.stdout || audit.stderr || '{}')
} catch {
  /* keep default */
}

const suites = [
  run('npm', ['run', 'test:isolation'], 'tenant_isolation'),
  run('npm', ['run', 'test:permissions'], 'account_permissions'),
  run('npm', ['run', 'test:phase6-security'], 'phase6_security'),
  run('npm', ['run', 'test:phase7-staging'], 'phase7_staging'),
  run('npm', ['run', 'test:publish-security'], 'publish_security'),
  run('npm', ['run', 'test:security-remediation'], 'security_remediation'),
]

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  buildAssessmentReadinessReport,
  pub4557AndFtcSafeguardControls,
  recommendedExternalPentestFirms,
  INDEPENDENT_TEST_DISCLAIMER,
  sensitiveDataProtectionRules,
} from '../src/engine/security/assessment/index.ts'
import { TC_PERSONAL_FEE } from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

assert(TC_PERSONAL_FEE === 300, 'pricing intact')
const report = buildAssessmentReadinessReport()
assert(report.independentPentestComplete === false, 'pentest not complete')
assert(report.internalScansSubstituteForIndependent === false, 'scans ≠ independent')
assert(report.sensitiveBrowserLocalOk, 'no sensitive browser-local SoR')
assert(pub4557AndFtcSafeguardControls().length >= 10, 'safeguard controls mapped')
assert(recommendedExternalPentestFirms().length >= 3, 'firm shortlist')
assert(INDEPENDENT_TEST_DISCLAIMER.includes('do NOT substitute'), 'disclaimer')
assert(sensitiveDataProtectionRules().every(r => !r.allowedInBrowserLocalStorage), 'no local SoR')
assert(sensitiveDataProtectionRules().every(r => !r.allowedInClientLogs), 'no client log secrets')

console.log('=== SECURITY_ASSESSMENT_MODULE_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)

const mod = run('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], 'assessment_module')

const vulnTotal = auditMeta?.metadata?.vulnerabilities?.total ?? auditMeta?.vulnerabilities?.total ?? 'unknown'
const suiteFails = suites.filter((s) => !s.ok).map((s) => s.label)
const artifact = {
  generatedAt: new Date().toISOString(),
  timezoneNote: 'Machine UTC; report times for users in America/Chicago',
  independentPentestComplete: false,
  disclaimer:
    'Internal automated scans do not substitute for an independent penetration test by a qualified external assessor.',
  npmAuditVulnerabilitiesTotal: vulnTotal,
  suiteResults: suites.map((s) => ({ label: s.label, ok: s.ok, status: s.status })),
  moduleOk: mod.ok,
  pricingUnchanged: true,
  liveLocks: {
    note: 'Production locks must remain off',
  },
  nextOwnerAction: 'Engage external firm per docs/APPSEC_EXTERNAL_FIRM_PACKAGE.md',
}

writeFileSync(join(outDir, 'AUTOMATED_SCAN_RESULTS.json'), JSON.stringify(artifact, null, 2))
writeFileSync(
  join(outDir, 'FINDINGS_AND_REMEDIATION.md'),
  `# Security findings & remediation log

**Independent pentest:** NOT COMPLETE  
**Automated scan artifact:** \`AUTOMATED_SCAN_RESULTS.json\`  
**Generated:** ${artifact.generatedAt} (UTC)

## Automated suite summary

| Suite | Result |
|-------|--------|
${suites.map((s) => `| ${s.label} | ${s.ok ? 'PASS' : 'FAIL'} |`).join('\n')}
| npm audit total vulns | ${vulnTotal} |
| assessment module | ${mod.ok ? 'PASS' : 'FAIL'} |

## Remediation

Record Critical/High findings from the **external** firm here after engagement.  
Internal failures above must be fixed before inviting the firm.

${suiteFails.length ? `### Failed suites\n\n- ${suiteFails.join('\n- ')}\n` : '### No automated suite failures in this run\n'}

## Evidence for EXT-APPSEC

Only a third-party report + retest closure satisfies \`EXT-APPSEC\`.
`,
)

rmSync(tmp, { recursive: true, force: true })

let docFailed = 0
function docAssert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    docFailed++
  } else console.log('OK', m)
}
docAssert(existsSync(join(outDir, 'AUTOMATED_SCAN_RESULTS.json')), 'scan artifact written')
docAssert(existsSync(join(root, 'docs/APPSEC_EXTERNAL_FIRM_PACKAGE.md')), 'firm package doc')
docAssert(readFileSync(join(outDir, 'FINDINGS_AND_REMEDIATION.md'), 'utf8').includes('NOT COMPLETE'), 'findings say not complete')

const failed = !mod.ok || suiteFails.length > 0 || docFailed > 0 || (typeof vulnTotal === 'number' && vulnTotal > 0)
console.log('=== SECURITY_ASSESSMENT_OK failed=' + (failed ? 1 : 0) + ' independent=false ===')
process.exit(failed ? 1 : 0)
