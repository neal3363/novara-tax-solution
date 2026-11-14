/** Mobile scaffold integrity — does not require Capacitor install or signed builds. */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = new URL('..', import.meta.url).pathname
let failed = 0
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    failed++
  } else console.log('OK', m)
}

const required = [
  'README.md',
  'package.json',
  'capacitor.config.ts',
  'src/bridges/nativeCapabilities.ts',
  'store/ios/APP_STORE_CONNECT.md',
  'store/android/PLAY_CONSOLE.md',
  'store/SHARED_PRIVACY_DISCLOSURES.md',
  'store/ASSETS_CHECKLIST.md',
  'scripts/copy-web-dist.mjs',
]
for (const f of required) {
  assert(existsSync(join(root, f)), f)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
assert(pkg.dependencies['@capacitor/ios'], 'capacitor ios dep declared')
assert(pkg.dependencies['@capacitor/android'], 'capacitor android dep declared')

const cap = readFileSync(join(root, 'capacitor.config.ts'), 'utf8')
assert(cap.includes("appId: 'com.novara.taxos'"), 'appId')
assert(cap.includes('NOVARA Tax OS'), 'app name')

// Load bridge via tsx
const { spawnSync } = await import('node:child_process')
const tmpRun = `
import {
  mobileFeatureMatrix,
  detectNativePlatform,
  requestBiometricUnlock,
  APPLE_IAP_POLICY_NOTE,
} from '../src/bridges/nativeCapabilities.ts'

async function main() {
  let failed = 0
  function assert(c: boolean, m: string) {
    if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
  }
  assert(detectNativePlatform('Mozilla') === 'web', 'web platform')
  assert(mobileFeatureMatrix().length >= 10, 'feature matrix')
  assert(mobileFeatureMatrix().every(f => f.ios && f.android), 'platforms set')
  assert(mobileFeatureMatrix().some(f => f.id === 'tc_dashboard' && f.ios === 'ready'), 'TC ready via web')
  assert(mobileFeatureMatrix().some(f => f.id === 'push' && f.ios === 'blocked_owner'), 'push blocked on owner')
  const bio = await requestBiometricUnlock()
  assert(bio.ok === false, 'biometric stub safe')
  assert(APPLE_IAP_POLICY_NOTE.includes('In-App Purchase'), 'IAP policy note')
  console.log('BRIDGE_OK failed=' + failed)
  process.exit(failed > 0 ? 1 : 0)
}
main()
`
const { writeFileSync, mkdirSync, rmSync } = await import('node:fs')
const tmp = join(root, '.tmp-mobile-test')
mkdirSync(tmp, { recursive: true })
writeFileSync(join(tmp, 'run.ts'), tmpRun)
const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], {
  cwd: join(root, '..'),
  encoding: 'utf8',
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
assert(r.status === 0, 'bridge module tests')
rmSync(tmp, { recursive: true, force: true })

const ios = readFileSync(join(root, 'store/ios/APP_STORE_CONNECT.md'), 'utf8')
assert(ios.includes('TestFlight'), 'TestFlight section')
assert(ios.includes('submission blocked') || ios.includes('Submission blockers'), 'ios blockers')
const and = readFileSync(join(root, 'store/android/PLAY_CONSOLE.md'), 'utf8')
assert(and.includes('Data safety'), 'android data safety')
assert(and.includes('Signed AAB') || and.includes('signed AAB'), 'AAB mentioned')

console.log('=== MOBILE_SCAFFOLD_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
