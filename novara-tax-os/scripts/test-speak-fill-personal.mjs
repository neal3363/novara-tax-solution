/**
 * Spoken personal info must parse into taxProfile.answers and surface on Personal tab.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
let failed = 0
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    failed++
  } else console.log('OK', m)
}

const factsSrc = readFileSync(join(root, 'src/engine/naturalLanguageFacts.ts'), 'utf8')
assert(factsSrc.includes('parsePersonalIdentityFacts'), 'identity parser exported')
assert(factsSrc.includes('personalIdentityProgress'), 'personal progress helper')
assert(factsSrc.includes('ssn_last4'), 'SSN last-four only')
assert(!/mapsTo:\s*'ssn'(?!\s*_)/.test(factsSrc) || factsSrc.includes('Never store a full SSN'), 'no full-SSN storage path')

const prepare = readFileSync(join(root, 'src/pages/taxpayer/Prepare.tsx'), 'utf8')
assert(prepare.includes('parseTaxpayerStatement'), 'Prepare imports statement parser')
assert(prepare.includes('askAi(parsed.text)'), 'landing handoff ingests spoken text')
assert(prepare.includes('Personal information'), 'Personal panel present')
assert(prepare.includes('personalIdentityProgress'), 'Prepare uses identity progress')
assert(prepare.includes("setSection('personal')"), 'switches to Personal after spoken identity')

const tabs = readFileSync(join(root, 'src/components/interview/QuestionnaireTabs.tsx'), 'utf8')
assert(tabs.includes('personalIdentityProgress'), 'Personal tab counts identity fields')

const store = readFileSync(join(root, 'src/store/useAppStore.ts'), 'utf8')
assert(store.includes("mapsTo === 'full_name'"), 'ingest syncs spoken name to currentUser')
assert(store.includes('Spoken personal information'), 'household candidate from speech')

const tmp = join(root, '.tmp-speak-fill-personal')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  parsePersonalIdentityFacts,
  parseTaxpayerStatement,
  applyParsedFacts,
  personalIdentityProgress,
  isPersonalIdentityMapsTo,
} from '../src/engine/naturalLanguageFacts.ts'
import { defaultProfile } from '../src/engine/benefitOptimizer.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++; } else console.log('OK', m)
}

const spoken =
  "My name is Alex Rivera, I was born March 3 1985, I live at 12 Oak Street Austin Texas, my phone is 512-555-0199, email is alex.rivera@example.com, SSN ends in 4321, and I am single."

const identity = parsePersonalIdentityFacts(spoken)
assert(identity.some((f) => f.mapsTo === 'full_name' && f.value === 'Alex Rivera'), 'parses legal name')
assert(identity.some((f) => f.mapsTo === 'date_of_birth' && String(f.value).startsWith('1985-03')), 'parses DOB')
assert(identity.some((f) => f.mapsTo === 'address' && String(f.value).toLowerCase().includes('oak')), 'parses address')
assert(identity.some((f) => f.mapsTo === 'phone' && String(f.value).includes('512')), 'parses phone')
assert(identity.some((f) => f.mapsTo === 'email' && String(f.value).includes('alex.rivera')), 'parses email')
assert(identity.some((f) => f.mapsTo === 'ssn_last4' && f.value === '4321'), 'parses SSN last4 only')
assert(identity.some((f) => f.mapsTo === 'filing_status' && f.value === 'single'), 'parses filing status')

const fullSsn = parsePersonalIdentityFacts('My social security number is 123-45-6789')
assert(fullSsn.some((f) => f.mapsTo === 'ssn_last4' && f.value === '6789'), 'full SSN reduced to last4')
assert(!fullSsn.some((f) => String(f.value).includes('123')), 'does not keep full SSN')

const facts = parseTaxpayerStatement(spoken)
assert(facts.length >= 6, 'statement includes identity facts')
assert(facts.every((f) => typeof f.mapsTo === 'string'), 'facts have mapsTo')

let profile = defaultProfile()
profile = applyParsedFacts(profile, facts)
assert(profile.answers.full_name === 'Alex Rivera', 'apply stores full_name')
assert(profile.answers.email === 'alex.rivera@example.com', 'apply stores email')
assert(profile.answers.ssn_last4 === '4321', 'apply stores last4')
assert(profile.filingStatus === 'single', 'apply sets filingStatus')

const progress = personalIdentityProgress(profile)
assert(progress.filter((r) => r.status === 'answered').length >= 5, 'personal progress mostly filled')
assert(isPersonalIdentityMapsTo('full_name') && isPersonalIdentityMapsTo('phone'), 'identity mapsTo helper')

if (failed) process.exit(1)
console.log('speak-fill runtime ok')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
assert(r.status === 0, 'speak-fill runtime checks')
rmSync(tmp, { recursive: true, force: true })

if (failed) {
  console.error(failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('All speak-fill-personal checks passed')
