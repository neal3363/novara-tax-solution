import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-isolation-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { DEV_DEMO_USERS, DEV_SEED_DOCS, DEV_SEED_RETURNS } from '../src/data/seed.dev.ts'
import {
  asScopedDocument,
  asScopedReturn,
  canAccessDocument,
  canAccessReturn,
  filterDocumentsForActor,
  filterReturnsForActor,
  issueDocumentAccessToken,
  resolveWriteTenant,
  verifyDocumentAccessToken,
  assertNoClientQuota,
  assertNoReturnQuota,
} from '../src/engine/tenantIsolation.ts'
import { PRICING, assertUnlimitedProfessionalAccess, clientQuotaForTier } from '../src/data/fees.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const returns = DEV_SEED_RETURNS.map(asScopedReturn)
const docs = DEV_SEED_DOCS.map(asScopedDocument)

const alex = DEV_DEMO_USERS.find((u) => u.id === 'u-prep')!
const kim = DEV_DEMO_USERS.find((u) => u.id === 'u-prep-solo')!
const summitOwner = DEV_DEMO_USERS.find((u) => u.id === 'u-owner')!
const lakesOwner = DEV_DEMO_USERS.find((u) => u.id === 'u-owner-lakes')!
const jordan = DEV_DEMO_USERS.find((u) => u.id === 'u-tax')!
const admin = DEV_DEMO_USERS.find((u) => u.id === 'u-admin')!

console.log('=== Cross-tenant return denial ===')
const kimReturn = returns.find((r) => r.id === 'r-2001')!
const lakesReturn = returns.find((r) => r.id === 'r-3001')!
const summitReturn = returns.find((r) => r.id === 'r-1002')!
const jordanReturn = returns.find((r) => r.id === 'r-1001')!

assert(!canAccessReturn(alex, kimReturn).allowed, 'Summit TP cannot open Kim TP return')
assert(!canAccessReturn(kim, summitReturn).allowed, 'Kim TP cannot open Summit return')
assert(!canAccessReturn(summitOwner, lakesReturn).allowed, 'Summit office cannot open Lakeside return')
assert(!canAccessReturn(lakesOwner, summitReturn).allowed, 'Lakeside office cannot open Summit return')
assert(!canAccessReturn(alex, jordanReturn).allowed, 'TP cannot open direct TC engagement return')
assert(canAccessReturn(jordan, jordanReturn).allowed, 'Taxpayer can open own return')
assert(!canAccessReturn(jordan, kimReturn).allowed, 'Taxpayer cannot open unrelated TP return')
assert(!canAccessReturn(admin, summitReturn).allowed, 'Admin has no default return access')

console.log('=== Cross-tenant document denial ===')
const kimDoc = docs.find((d) => d.id === 'd-kim-1')!
const lakesDoc = docs.find((d) => d.id === 'd-lakes-1')!
const jordanDoc = docs.find((d) => d.id === 'd-1')!

assert(!canAccessDocument(alex, kimDoc).allowed, 'Summit TP cannot download Kim vault file')
assert(!canAccessDocument(kim, lakesDoc).allowed, 'Kim TP cannot download Lakeside vault file')
assert(!canAccessDocument(lakesOwner, jordanDoc).allowed, 'Lakeside cannot open TC vault file')
assert(canAccessDocument(jordan, jordanDoc).allowed, 'Taxpayer can open own vault file')
assert(!canAccessDocument(admin, jordanDoc).allowed, 'Admin has no default document access')

console.log('=== Authorized links ===')
const good = issueDocumentAccessToken(jordan, jordanDoc)
assert(!!good, 'Authorized link issued for own document')
assert(verifyDocumentAccessToken(good!.token, jordan, jordanDoc).allowed, 'Token verifies for owner')
assert(!verifyDocumentAccessToken(good!.token, kim, jordanDoc).allowed, 'Token rejected for other user')
assert(issueDocumentAccessToken(alex, kimDoc) === null, 'No link for cross-tenant document')

console.log('=== Filter lists (search simulation) ===')
const alexVisible = filterReturnsForActor(alex, returns)
assert(alexVisible.every((r) => r.tenantId === 'tenant-summit'), 'Alex only sees Summit returns')
assert(!alexVisible.some((r) => r.id === 'r-2001' || r.id === 'r-3001'), 'Alex search never lists Kim/Lakeside')
const kimVisible = filterReturnsForActor(kim, returns)
assert(kimVisible.length === 1 && kimVisible[0].id === 'r-2001', 'Kim only sees own client return')
const lakesDocs = filterDocumentsForActor(lakesOwner, docs)
assert(lakesDocs.every((d) => d.tenantId === 'tenant-lakeside'), 'Lakeside vault isolated')
assert(filterDocumentsForActor(admin, docs).length === 0, 'Admin document list empty without grant')

console.log('=== Tenant spoof rejection ===')
let spoofBlocked = false
try {
  resolveWriteTenant(kim, 'tenant-summit')
} catch {
  spoofBlocked = true
}
assert(spoofBlocked, 'Client-supplied foreign tenantId rejected')
assert(resolveWriteTenant(kim) === 'tenant-kim-tp', 'Write tenant comes from authenticated actor')

console.log('=== Unlimited quotas ===')
assert(PRICING.TP.unlimitedClients && PRICING.TP.unlimitedReturns, 'TP unlimited flags')
assert(PRICING.Office.unlimitedClients && PRICING.Office.unlimitedReturns, 'Office unlimited flags')
assert(assertUnlimitedProfessionalAccess('TP'), 'TP unlimited assert')
assert(assertUnlimitedProfessionalAccess('Office'), 'Office unlimited assert')
assert(clientQuotaForTier('TP') === null && clientQuotaForTier('Office') === null, 'No client quota caps')
assertNoClientQuota(kim, 10_000)
assertNoReturnQuota(summitOwner, 10_000)
assert(true, 'No quota throw at 10k clients/returns')

if (failed) {
  console.error(failed + ' isolation failures')
  process.exit(1)
}
console.log('All tenant isolation tests passed')
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
