/** Official ATS submission package — refuses mock as official approval. */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-official-ats')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  buildOfficialAtsSubmissionPackage,
  officialAtsSubmissionSteps,
  recordAtsScenarioResult,
  resetAtsResultsForTests,
  claimOfficialAtsComplete,
  officialAtsPassCount,
  getMefFlags,
  assertNoLiveIrsTransmit,
} from '../src/engine/irs/mef/index.ts'
import { TC_PERSONAL_FEE } from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

assertNoLiveIrsTransmit()
assert(getMefFlags().liveProductionTransmit === false, 'live OFF')
assert(TC_PERSONAL_FEE === 300, 'pricing')

const empty = buildOfficialAtsSubmissionPackage({})
assert(empty.officialAtsComplete === false, 'not complete')
assert(empty.canSubmitToIrs === false, 'cannot submit without creds')
assert(empty.syntheticPacks.length >= 6, 'synthetic packs')
assert(empty.disclaimer.includes('NOT official'), 'disclaimer')
assert(officialAtsSubmissionSteps().some(s => s.blocksWithoutOwner), 'owner steps')

const ready = buildOfficialAtsSubmissionPackage({
  softwareDeveloperTestEtin: 'T',
  softwareId: 'S',
  efin: '123456',
  atsWindowOpenAttested: true,
  scenarioSetAttested: true,
})
assert(ready.canSubmitToIrs === true, 'can submit when attested')
assert(ready.officialAtsComplete === false, 'still not complete')

resetAtsResultsForTests()
const mockAccept = recordAtsScenarioResult({
  scenarioId: 'ty2025-1040-basic-single',
  officialPub1436Id: null,
  source: 'mock_internal',
  outcome: 'accepted',
  ackSimulated: true,
  liveIrs: false,
})
assert(mockAccept.ok, 'mock accept recordable for dev')
assert(officialAtsPassCount() === 0, 'mock does not count as official pass')

const badOfficial = recordAtsScenarioResult({
  scenarioId: 'ty2025-1040-basic-single',
  officialPub1436Id: 'SCENARIO-1',
  source: 'official_irs',
  outcome: 'accepted',
  ackSimulated: true,
  liveIrs: false,
})
assert(badOfficial.ok === false, 'refuse simulated as official')

const claim = claimOfficialAtsComplete()
assert(claim.ok === false, 'cannot claim ATS complete from mock')

console.log('=== OFFICIAL_ATS_PACKAGE_OK failed=' + failed + ' ===')
process.exit(failed > 0 ? 1 : 0)
`,
)
const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
rmSync(tmp, { recursive: true, force: true })
const docOk = existsSync(join(root, 'docs/IRS_ATS_PRODUCTION_ACTIVATION.md'))
if (!docOk) console.error('FAIL missing ATS activation doc')
process.exit(r.status === 0 && docOk ? 0 : 1)
