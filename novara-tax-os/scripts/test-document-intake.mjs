import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-intake-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  extractPeopleFromDocuments,
  recommendFilingStatus,
  relationshipsComplete,
  nextRelationshipPrompt,
  applyHouseholdToProfile,
  maskSensitiveFactValue,
  outstandingDocumentRequests,
  emptyHouseholdIntake,
  type HouseholdIntakeState,
} from '../src/engine/documentIntakeEngine.ts'
import { extractFactsForType } from '../src/engine/documentProcessing.ts'
import { defaultProfile } from '../src/engine/benefitOptimizer.ts'
import type { DocumentRecord } from '../src/data/types.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

function uid(p: string) { return p + '-' + Math.random().toString(36).slice(2, 7) }

console.log('=== Extract people from multi-person docs ===')
const docs: DocumentRecord[] = [
  {
    id: 'd1', name: 'ID_Jordan_Blake.pdf', type: 'ID', taxYear: 2025, sizeLabel: '1 KB',
    uploadedAt: new Date().toISOString(), status: 'extracted', confidence: 0.96, ownerId: 'u',
    tenantId: 't', facts: extractFactsForType('ID', 'ID_Jordan_Blake.pdf', 0.96, uid, 'Jordan Blake'),
  },
  {
    id: 'd2', name: 'license_Mary_Johnson.pdf', type: 'ID', taxYear: 2025, sizeLabel: '1 KB',
    uploadedAt: new Date().toISOString(), status: 'extracted', confidence: 0.95, ownerId: 'u',
    tenantId: 't', facts: extractFactsForType('ID', 'license_Mary_Johnson.pdf', 0.95, uid, 'Jordan Blake'),
  },
  {
    id: 'd3', name: 'ssn_Emma_Blake.pdf', type: 'ID', taxYear: 2025, sizeLabel: '1 KB',
    uploadedAt: new Date().toISOString(), status: 'extracted', confidence: 0.94, ownerId: 'u',
    tenantId: 't', facts: extractFactsForType('ID', 'ssn_Emma_Blake.pdf', 0.94, uid, 'Jordan Blake'),
  },
  {
    id: 'd4', name: 'W2_Jordan_Blake.pdf', type: 'W-2', taxYear: 2025, sizeLabel: '1 KB',
    uploadedAt: new Date().toISOString(), status: 'extracted', confidence: 0.97, ownerId: 'u',
    tenantId: 't', facts: extractFactsForType('W-2', 'W2_Jordan_Blake.pdf', 0.97, uid, 'Jordan Blake'),
  },
]

const people = extractPeopleFromDocuments(docs, 'Jordan Blake')
assert(people.length >= 3, 'Extracted at least 3 people (got ' + people.length + ')')
assert(people.some((p) => /Jordan/i.test(p.fullLegalName)), 'Jordan found')
assert(people.some((p) => /Mary/i.test(p.fullLegalName)), 'Mary found')
assert(people.some((p) => /Emma/i.test(p.fullLegalName)), 'Emma found')
assert(people.every((p) => p.relationToPrimary === null), 'No relationships assumed from docs')

console.log('=== Masking ===')
assert(maskSensitiveFactValue('Tax ID (SSN/ITIN)', '123-45-6789') === '***-**-6789', 'SSN masked')
assert(maskSensitiveFactValue('Wages', '$64,200.00') === '$64,200.00', 'Wages not masked')
const tinFact = docs[0].facts.find((f) => /Tax ID/i.test(f.label))
assert(tinFact && tinFact.value.includes('***'), 'Extracted TIN fact is already masked')

console.log('=== Relationship confirmation flow ===')
let intake: HouseholdIntakeState = {
  ...emptyHouseholdIntake(),
  phase: 'confirm_relationships',
  candidates: people,
  primaryPersonId: people.find((p) => /Jordan/i.test(p.fullLegalName))!.id,
}
assert(nextRelationshipPrompt(intake)?.person.fullLegalName.match(/Mary|Emma/i), 'Asks who next person is')
const mary = people.find((p) => /Mary/i.test(p.fullLegalName))!
intake.candidates = intake.candidates.map((c) =>
  c.id === mary.id ? { ...c, relationToPrimary: 'spouse', mayQualifyDependent: false } : c,
)
const emma = people.find((p) => /Emma/i.test(p.fullLegalName))!
intake.candidates = intake.candidates.map((c) =>
  c.id === emma.id ? { ...c, relationToPrimary: 'daughter', mayQualifyDependent: true } : c,
)
assert(relationshipsComplete(intake), 'Relationships complete after explicit answers')

console.log('=== Filing status recommendation ===')
const rec = recommendFilingStatus(intake)
assert(rec.recommended === 'mfj', 'MFJ recommended when spouse confirmed')

console.log('=== Apply household without inventing ===')
const profile = applyHouseholdToProfile(defaultProfile(), intake, 2025)
assert(profile.dependents.length === 1, 'One dependent from mayQualify=true')
assert(profile.dependents[0].fullLegalName.match(/Emma/i), 'Emma is the dependent')
assert(profile.answers.married_dec31 === 'yes', 'Married flag from spouse confirmation')

console.log('=== Outstanding docs skip received ===')
const outstanding = outstandingDocumentRequests(docs, intake)
assert(!outstanding.some((r) => r.id === 'req-id'), 'Does not re-request ID already received')

if (failed) {
  console.error(failed + ' intake failures')
  process.exit(1)
}
console.log('All document intake tests passed')
`,
)

const result = spawnSync(
  'npx',
  ['--yes', 'tsx', join(tmp, 'run.ts')],
  { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' } },
)
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
rmSync(tmp, { recursive: true, force: true })
process.exit(result.status ?? 1)
