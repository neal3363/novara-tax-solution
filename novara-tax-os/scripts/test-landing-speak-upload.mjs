/**
 * Landing speak + multi-upload handoff: stash/take, classify routing, VoiceInput production surface.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
let failed = 0
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m)
    failed++
  } else console.log('OK', m)
}

const voice = readFileSync(join(root, 'src/components/VoiceInput.tsx'), 'utf8')
assert(voice.includes('browserSpeechCtor'), 'VoiceInput uses browser speech helper')
assert(!voice.includes('IS_DEV'), 'VoiceInput is not DEV-gated away')
assert(voice.includes('compact'), 'VoiceInput supports compact landing mic')
assert(!voice.includes('Cloud speech recognition is disabled'), 'no typing-only production dead-end')

const landing = readFileSync(join(root, 'src/pages/Landing.tsx'), 'utf8')
assert(landing.includes('beginWithFiles'), 'Landing multi-upload handler present')
assert(landing.includes('Upload all documents'), 'Landing invites bulk upload')
assert(landing.includes('Add more anytime') || landing.includes('upload later'), 'Landing discloses later upload')
assert(landing.includes('stashLandingUploads') || landing.includes('uploadFiles'), 'Landing routes files into workspace')

const prepare = readFileSync(join(root, 'src/pages/taxpayer/Prepare.tsx'), 'utf8')
assert(prepare.includes('takeLandingUploads'), 'Prepare consumes landing uploads')
assert(prepare.includes('Upload it later'), 'Prepare mentions later credit/doc uploads')

assert(existsSync(join(root, 'src/engine/pendingLandingUploads.ts')), 'pending upload module exists')

const tmp = join(root, '.tmp-landing-speak-upload')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import { stashLandingUploads, takeLandingUploads, peekLandingUploadCount, clearLandingUploads } from '../src/engine/pendingLandingUploads.ts'
import { classifyDocumentName } from '../src/engine/documentProcessing.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++; } else console.log('OK', m)
}

clearLandingUploads()
assert(peekLandingUploadCount() === 0, 'empty stash')
const f1 = new File([new Uint8Array([1,2,3])], 'W2_Acme_2025.pdf', { type: 'application/pdf' })
const f2 = new File([new Uint8Array([4,5])], 'childcare_receipt.pdf', { type: 'application/pdf' })
const f3 = new File([new Uint8Array([6])], '1099-NEC_freelance.pdf', { type: 'application/pdf' })
assert(stashLandingUploads([f1, f2, f3]) === 3, 'stash three files')
assert(peekLandingUploadCount() === 3, 'peek three')
const taken = takeLandingUploads()
assert(taken.length === 3 && peekLandingUploadCount() === 0, 'take clears stash')
assert(takeLandingUploads().length === 0, 'second take empty')

assert(classifyDocumentName(f1.name) === 'W-2', 'routes W-2')
assert(classifyDocumentName(f2.name) === 'Childcare', 'routes childcare credit support')
assert(classifyDocumentName(f3.name) === '1099-NEC', 'routes 1099-NEC')
assert(classifyDocumentName('tuition_1098-T.pdf') === '1098-T', 'routes education credit form')
assert(classifyDocumentName('random_scan.pdf') === 'Other', 'unknown stays Other for later review')

if (failed) process.exit(1)
console.log('handoff logic ok')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
assert(r.status === 0, 'handoff/classify runtime checks')
rmSync(tmp, { recursive: true, force: true })

if (failed) {
  console.error(failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('All landing speak/upload checks passed')
