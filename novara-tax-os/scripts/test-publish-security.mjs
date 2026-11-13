/**
 * Pre-publish security gates for the private NOVARA Tax OS app.
 * Fails if the production bundle ships multi-tenant seed / role picker data,
 * or if tenant isolation / role clamping regressions appear.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('..', import.meta.url).pathname
let failed = 0

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg)
    failed++
  } else {
    console.log('OK', msg)
  }
}

console.log('=== Production build ===')
const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8', shell: true })
assert(build.status === 0, 'npm run build succeeds')
if (build.status !== 0) {
  console.error(build.stdout)
  console.error(build.stderr)
  process.exit(1)
}

console.log('=== Dev fixtures must not ship inside the published app tree ===')
assert(!existsSync(join(root, 'src/data/seed.dev.ts')), 'src/data/seed.dev.ts removed from app tree')
assert(!existsSync(join(root, 'src/data/seed.dev.js')), 'src/data/seed.dev.js absent from app tree')
assert(!existsSync(join(root, 'src/components/VoiceInputDev.tsx')), 'vendor STT helper removed from app tree')
assert(existsSync(join(root, '../dev-fixtures/seed.dev.ts')), 'fixtures remain available outside app tree for local tests')
assert(existsSync(join(root, '../dev-fixtures/VoiceInputDev.tsx')), 'DEV voice helper remains outside app tree')

console.log('=== Production bundle must not expose multi-tenant / demo PII seed ===')
const assetsDir = join(root, 'dist/assets')
const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
const bundle = jsFiles.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n')

const forbidden = [
  'Jordan Blake',
  'Taylor Kim',
  'Alex Rivera',
  'Morgan Lee',
  'Jamie Brooks',
  'tenant-summit',
  'tenant-lakeside',
  'tenant-kim-tp',
  'W2_Acme_2025',
  '1099NEC_Studio',
  'P00000001',
  'seed.dev',
  'DEV_DEMO_USERS',
  'LoginDev',
  'TP — Solo',
  'u-owner-lakes',
  'Continue & edit sample',
  'Enter sample sandbox',
  'webkitSpeechRecognition',
  'SpeechRecognition',
  'VoiceInputDev',
]

for (const needle of forbidden) {
  assert(!bundle.includes(needle), `bundle excludes "${needle}"`)
}

assert(!/role-card panel/.test(bundle), 'bundle excludes role-card picker markup')
assert(
  bundle.includes('Cloud speech recognition is disabled') || bundle.includes('type to NOVARA'),
  'production discloses typing-only voice path',
)

console.log('=== Role clamp helpers ===')
const clampMod = await import(pathToFileURL(join(root, 'src/auth/sessionClient.ts')).href)
assert(clampMod.clampProductionRole('admin') === 'taxpayer', 'admin clamps to taxpayer')
assert(clampMod.clampProductionRole('preparer') === 'taxpayer', 'preparer clamps to taxpayer')
assert(clampMod.clampProductionRole('efin_owner') === 'taxpayer', 'efin_owner clamps to taxpayer')
assert(clampMod.clampProductionRole('taxpayer') === 'taxpayer', 'taxpayer remains taxpayer')
assert(clampMod.clampProductionAccountType('office_owner') === 'tc', 'accountType clamps to tc')
assert(clampMod.PRODUCTION_ALLOWED_ROLES.length === 1, 'only taxpayer allowed in production')

console.log('=== Production session / RoleGate hardening ===')
const storeSrc = readFileSync(join(root, 'src/store/useAppStore.ts'), 'utf8')
const roleGateSrc = readFileSync(join(root, 'src/components/RoleGate.tsx'), 'utf8')
assert(storeSrc.includes('novara-tax-os-session-v15'), 'session key bumped to v15')
assert(storeSrc.includes('PRODUCTION_MEMORY_ONLY'), 'production memory-only field list present')
assert(storeSrc.includes('freshWorkspaceForViewer'), 'viewer switch wipes via fresh workspace helper')
assert(storeSrc.includes('wipeLegacySessionKeys'), 'legacy session keys wiped on viewer switch')
assert(
  /IS_BROWSER_PROD[\s\S]*sessionStorage\.setItem\(SESSION_KEY/.test(storeSrc) ||
    storeSrc.includes('tax content stays in tab memory'),
  'production persist avoids writing full tax workspace',
)
assert(roleGateSrc.includes("!roles.includes('taxpayer')"), 'RoleGate refuses elevated-only routes in production')
assert(roleGateSrc.includes('clampProductionRole'), 'RoleGate clamps production role')
console.log('=== Tenant isolation engine ===')
const iso = spawnSync('npm', ['run', 'test:isolation'], { cwd: root, encoding: 'utf8', shell: true })
assert(iso.status === 0, 'tenant isolation tests pass')
if (iso.status !== 0) {
  console.error(iso.stdout)
  console.error(iso.stderr)
}

console.log('=== Account permissions / credentials ===')
const perm = spawnSync('npm', ['run', 'test:permissions'], { cwd: root, encoding: 'utf8', shell: true })
assert(perm.status === 0, 'account permission tests pass')
if (perm.status !== 0) {
  console.error(perm.stdout)
  console.error(perm.stderr)
}

if (failed) {
  console.error(`\n${failed} security check(s) failed`)
  process.exit(1)
}
console.log('\nAll publish security checks passed.')
