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
assert(landing.includes('summarizeUploadRouting'), 'Landing shows auto-sort destinations')
assert(landing.includes('Social Security card') || landing.includes('driver'), 'Landing invites DL/SS card uploads')
assert(landing.includes('EXAMPLE_RETURN_DOCS') || landing.includes('example-docs'), 'Landing shows example docs list')
assert(landing.includes('stateLawDifferenceBullets') || landing.includes('State credit laws differ'), 'Landing explains state law differences')
assert(landing.includes('Questions only after docs') || landing.includes('only asks'), 'Landing says questions follow docs')
assert(landing.includes('Money from each form') || landing.includes('money'), 'Landing ties money to each form')

const landingCss = readFileSync(join(root, 'src/pages/Landing.css'), 'utf8')
assert(landingCss.includes('.maximize-section'), 'docs example section has contrast styles')
assert(landingCss.includes('#06110f') || landingCss.includes('#081412'), 'docs section uses darker text for readability')

const exampleDocs = readFileSync(join(root, 'src/data/exampleReturnDocs.ts'), 'utf8')
assert(exampleDocs.includes('Form W-2'), 'example docs include W-2')
assert(exampleDocs.includes('1098-T'), 'example docs include tuition')
assert(exampleDocs.includes('Childcare'), 'example docs include childcare')

const stateCredits = readFileSync(join(root, 'src/engine/stateCredits.ts'), 'utf8')
assert(stateCredits.includes('federalEitcMatchRate'), 'state credits encode per-state EITC match')
assert(stateCredits.includes('Texas'), 'state credits call out Texas no-PIT')
assert(stateCredits.includes('California'), 'state credits call out California extras')

const prepare = readFileSync(join(root, 'src/pages/taxpayer/Prepare.tsx'), 'utf8')
assert(prepare.includes('takeLandingUploads'), 'Prepare consumes landing uploads')
assert(prepare.includes('Upload it later') || prepare.includes('same routing'), 'Prepare mentions later credit/doc uploads')
assert(prepare.includes('sectionFromUploadedNames') || prepare.includes('summarizeUploadRouting'), 'Prepare opens matching tab after sort')

const classifySrc = readFileSync(join(root, 'src/engine/documentProcessing.ts'), 'utf8')
assert(classifySrc.includes('routingPlaceForDocType'), 'routing helper exported')
assert(classifySrc.includes('ss_card') || classifySrc.includes('ss[\\s\\-_]?card'), 'SS card filename patterns')
assert(classifySrc.includes('driver'), 'driver license filename patterns')

assert(existsSync(join(root, 'src/engine/pendingLandingUploads.ts')), 'pending upload module exists')

const tmp = join(root, '.tmp-landing-speak-upload')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import { stashLandingUploads, takeLandingUploads, peekLandingUploadCount, clearLandingUploads } from '../src/engine/pendingLandingUploads.ts'
import {
  classifyDocumentName,
  summarizeUploadRouting,
  routingPlaceForDocType,
} from '../src/engine/documentProcessing.ts'

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

// Front-page identity + income routing (DL, SS card, W-2, 1099)
assert(classifyDocumentName('DL_Alex_Rivera.pdf') === 'ID', 'routes DL.pdf-style name to ID')
assert(classifyDocumentName("driver's_license.jpg") === 'ID', 'routes driver’s license')
assert(classifyDocumentName('drivers-license-front.png') === 'ID', 'routes drivers-license')
assert(classifyDocumentName('ss_card_Alex.pdf') === 'ID', 'routes ss_card to ID')
assert(classifyDocumentName('social_security_card.pdf') === 'ID', 'routes social security card')
assert(classifyDocumentName('SSN_Alex_Rivera.pdf') === 'ID', 'routes SSN card')
assert(classifyDocumentName('W-2_Acme_2025.pdf') === 'W-2', 'routes W-2 with hyphen')
assert(classifyDocumentName('1099.pdf') === '1099-NEC', 'generic 1099 → income NEC')
assert(classifyDocumentName('1099-INT_bank.pdf') === '1099-INT', 'routes 1099-INT')
assert(classifyDocumentName('simple_scan.pdf') !== 'P&L', 'does not misclassify simple as P&L')
assert(classifyDocumentName('valid_receipt.pdf') !== 'ID', 'does not misclassify valid as ID')

const summary = summarizeUploadRouting(['DL.pdf', 'ss_card.pdf', 'W2_2025.pdf', '1099-NEC.pdf'])
assert(summary.includes('Personal ID vault'), 'summary mentions Personal ID vault')
assert(summary.includes('Income documents'), 'summary mentions Income documents')
assert(routingPlaceForDocType('ID').vaultCategory === 'primary_taxpayer', 'ID → primary taxpayer vault')
assert(routingPlaceForDocType('W-2').vaultCategory === 'income', 'W-2 → income vault')
assert(routingPlaceForDocType('1099-NEC').questionnaireSection === 'income', '1099 opens Income tab')

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
