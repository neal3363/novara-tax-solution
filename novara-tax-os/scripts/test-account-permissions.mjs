import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const tmp = join(root, '.tmp-perm-test')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'run.ts'),
  `
import { DEMO_USERS } from '../src/data/seed.ts'
import {
  canAssignClients,
  canCreateClients,
  canManageStaff,
  canTransmitTaxReturn,
  permissionSummary,
} from '../src/engine/accountPermissions.ts'
import {
  submitCredential,
  isValidPtinFormat,
  isValidEfinFormat,
  decryptCredentialValue,
  isCredentialVerified,
  completeAuthorizedVerification,
} from '../src/engine/credentials.ts'
import type { UserAccount } from '../src/data/types.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

const tc = DEMO_USERS.find((u) => u.id === 'u-tax')!
const kim = DEMO_USERS.find((u) => u.id === 'u-prep-solo')!
const alex = DEMO_USERS.find((u) => u.id === 'u-prep')!
const morgan = DEMO_USERS.find((u) => u.id === 'u-owner')!

console.log('=== Account types ===')
assert(tc.accountType === 'tc', 'Jordan is TC')
assert(kim.accountType === 'independent_tp', 'Kim is independent TP')
assert(alex.accountType === 'office_preparer', 'Alex is office preparer')
assert(morgan.accountType === 'office_owner', 'Morgan is office owner')

console.log('=== TP = clients only ===')
assert(canCreateClients(kim).allowed, 'TP can create clients')
assert(!canManageStaff(kim).allowed, 'TP cannot manage staff')
assert(!canAssignClients(kim).allowed, 'TP cannot assign clients')
assert(canManageStaff(kim).reason === 'tp_staff_forbidden', 'TP staff deny reason')

console.log('=== Office = preparers + clients ===')
assert(canCreateClients(morgan).allowed, 'Office owner can create clients')
assert(canManageStaff(morgan).allowed, 'Office owner can manage staff')
assert(canAssignClients(morgan).allowed, 'Office owner can assign clients')
assert(!canManageStaff(alex).allowed, 'Office preparer cannot manage staff')
assert(!canAssignClients(alex).allowed, 'Office preparer cannot assign clients')

console.log('=== TC limits ===')
assert(!canCreateClients(tc).allowed, 'TC cannot create other clients')
assert(!canManageStaff(tc).allowed, 'TC cannot manage staff')

console.log('=== Credential format + never auto-verify ===')
assert(isValidPtinFormat('P12345678'), 'PTIN format ok')
assert(!isValidPtinFormat('12345678'), 'PTIN without P rejected')
assert(isValidEfinFormat('123456'), 'EFIN format ok')
assert(!isValidEfinFormat('12345'), 'Short EFIN rejected')
const submitted = submitCredential('ptin', 'P11112222')
assert(submitted.ok && submitted.credential.status === 'pending_verification', 'Manual PTIN is pending, not verified')
assert(!isCredentialVerified(submitted.ok ? submitted.credential : null), 'Manual entry not verified')
const decrypted = submitted.ok ? decryptCredentialValue(submitted.credential.valueEncrypted) : null
assert(decrypted === 'P11112222', 'Encrypted credential round-trips')
const verified = completeAuthorizedVerification(submitted.ok ? submitted.credential : submitted as never, true)
assert(verified.status === 'verified' && verified.method === 'irs_lookup_verified', 'Only authorized process verifies')

console.log('=== Transmit gates ===')
assert(canTransmitTaxReturn(tc).allowed, 'TC can transmit own return path')
assert(canTransmitTaxReturn(kim).allowed, 'Seed Kim has verified PTIN + provider')
assert(canTransmitTaxReturn(morgan).allowed, 'Seed Morgan has verified EFIN')

const unverifiedTp: UserAccount = {
  ...kim,
  id: 'u-new-tp',
  credentials: {
    ptin: submitCredential('ptin', 'P99998888').ok
      ? (submitCredential('ptin', 'P99998888') as Extract<ReturnType<typeof submitCredential>, { ok: true }>).credential
      : undefined,
    efileProvider: { providerName: 'Pending Co', status: 'pending' },
  },
}
assert(!canTransmitTaxReturn(unverifiedTp).allowed, 'Unverified TP cannot transmit')
assert(canTransmitTaxReturn(unverifiedTp).reason === 'credentials_unverified', 'Unverified reason is credentials')

const noProvider: UserAccount = {
  ...kim,
  id: 'u-tp-noprov',
  credentials: {
    ptin: kim.credentials!.ptin,
    efileProvider: { providerName: 'None', status: 'none' },
  },
}
assert(!canTransmitTaxReturn(noProvider).allowed, 'TP without e-file provider cannot transmit')

const unverifiedOffice: UserAccount = {
  ...morgan,
  credentials: {
    ...morgan.credentials,
    efin: submitCredential('efin', '111222').ok
      ? (submitCredential('efin', '111222') as Extract<ReturnType<typeof submitCredential>, { ok: true }>).credential
      : undefined,
  },
}
assert(!canTransmitTaxReturn(unverifiedOffice).allowed, 'Unverified Office EFIN cannot transmit')

console.log('=== Permission summary ===')
const kimSum = permissionSummary(kim)
assert(kimSum.createClients && !kimSum.manageStaff && !kimSum.assignClients, 'Kim summary: clients only')
const officeSum = permissionSummary(morgan)
assert(officeSum.createClients && officeSum.manageStaff && officeSum.assignClients, 'Morgan summary: preparers + clients')

if (failed) {
  console.error(failed + ' permission failures')
  process.exit(1)
}
console.log('All account permission + credential tests passed')
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
