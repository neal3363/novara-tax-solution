/**
 * Refund settlement: virtual bank wire → verify → fee withhold → client payout → email after confirm.
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

const pipeSrc = readFileSync(join(root, 'src/engine/payments/phase10/refundSettlementPipeline.ts'), 'utf8')
assert(pipeSrc.includes('email_blocked_until_disbursement_confirmed'), 'email blocked until disbursement')
assert(pipeSrc.includes('debit_rail'), 'supports debit rails')
assert(pipeSrc.includes('ach_bank'), 'supports ACH bank routing')
assert(pipeSrc.includes('assertNoLivePayments'), 'live payments hard-off')

const emailSrc = readFileSync(join(root, 'src/engine/payments/phase10/transactionalEmail.ts'), 'utf8')
assert(emailSrc.includes('refund_deposit_notice'), 'deposit notice template')
assert(emailSrc.includes('sandbox_queued'), 'emails are sandbox-queued only')

const panel = readFileSync(join(root, 'src/components/filing/RefundSettlementPanel.tsx'), 'utf8')
assert(panel.includes('Transactional email'), 'UI exposes transactional email step')
assert(panel.includes('Chime'), 'UI offers Chime')
assert(panel.includes('Cash App'), 'UI offers Cash App')

const tracking = readFileSync(join(root, 'src/pages/taxpayer/RefundTracking.tsx'), 'utf8')
assert(tracking.includes('RefundSettlementPanel'), 'Refund tracking hosts settlement panel')

const tmp = join(root, '.tmp-refund-settlement')
mkdirSync(tmp, { recursive: true })
writeFileSync(
  join(tmp, 'run.ts'),
  `
import {
  openRefundSettlementCase,
  receiveIrsWire,
  verifyInboundDeposit,
  withholdAuthorizedFees,
  submitClientDisbursement,
  confirmClientDisbursement,
  sendDepositTransactionalEmail,
  runSandboxSettlementHappyPath,
  resetRefundSettlementForTests,
  debitRailDestination,
} from '../src/engine/payments/phase10/refundSettlementPipeline.ts'
import {
  listTransactionalEmails,
  resetTransactionalEmailForTests,
} from '../src/engine/payments/phase10/transactionalEmail.ts'
import { getPhase10Flags } from '../src/engine/payments/phase10/config.ts'

let failed = 0
function assert(c: boolean, m: string) {
  if (!c) { console.error('FAIL', m); failed++ } else console.log('OK', m)
}

resetRefundSettlementForTests()
resetTransactionalEmailForTests()

assert(getPhase10Flags().livePayments === false, 'livePayments false')
assert(getPhase10Flags().liveBankingPartner === false, 'liveBankingPartner false')

// Example: $7000 refund, $1400 fee, remaining $5600 to Chime
const opened = openRefundSettlementCase({
  tenantId: 'tenant-demo',
  ownerId: 'u-tax',
  taxpayerEmail: 'client@example.test',
  taxYear: 2025,
  expectedRefundDollars: 7000,
  authorizedPrepFeeDollars: 1400,
  destination: debitRailDestination('chime', '$client99'),
})
assert(opened.phase === 'awaiting_irs_wire', 'starts awaiting wire')

// Email must fail before confirmation
let blocked = false
try {
  sendDepositTransactionalEmail(opened.id)
} catch (e) {
  blocked = e instanceof Error && e.message === 'email_blocked_until_disbursement_confirmed'
}
assert(blocked, 'email blocked before disbursement')

receiveIrsWire(opened.id, 7000)
assert(verifyInboundDeposit(opened.id).phase === 'amount_verified', 'amount verified')
const afterFee = withholdAuthorizedFees(opened.id)
assert(afterFee.fees?.netToClientCents === 5600_00, 'net 5600 after 1400 fee')
assert(afterFee.phase === 'fee_withheld', 'fees withheld')
assert(listTransactionalEmails(opened.id).length === 0, 'still no email after fee withhold')

submitClientDisbursement(opened.id)
confirmClientDisbursement(opened.id)
const { settlement, email } = sendDepositTransactionalEmail(opened.id)
assert(settlement.phase === 'complete', 'complete after email')
assert(email.kind === 'refund_deposit_notice', 'deposit notice kind')
assert(email.body.includes('5600.00') || email.body.includes('$5600'), 'email mentions net deposit')
assert(email.delivery === 'sandbox_queued', 'sandbox email only')

resetRefundSettlementForTests()
resetTransactionalEmailForTests()
const happy = openRefundSettlementCase({
  tenantId: 'tenant-demo',
  ownerId: 'u-tax',
  taxpayerEmail: 'ach@example.test',
  taxYear: 2025,
  expectedRefundDollars: 3000,
  authorizedPrepFeeDollars: 300,
  destination: {
    kind: 'ach_bank',
    routingNumber: '021000021',
    accountLast4: '6789',
    accountType: 'checking',
  },
})
const run = runSandboxSettlementHappyPath(happy.id)
assert(run.settlement.phase === 'complete', 'happy path completes')
assert(run.settlement.fees?.netToClientCents === 2700_00, 'ACH net after fee')
assert(listTransactionalEmails(happy.id).length === 1, 'one email after happy path')

if (failed) process.exit(1)
console.log('refund settlement runtime ok')
`,
)

const r = spawnSync('npx', ['--yes', 'tsx', join(tmp, 'run.ts')], { cwd: root, encoding: 'utf8' })
process.stdout.write(r.stdout || '')
process.stderr.write(r.stderr || '')
assert(r.status === 0, 'settlement runtime checks')
rmSync(tmp, { recursive: true, force: true })

if (failed) {
  console.error(failed + ' assertion(s) failed')
  process.exit(1)
}
console.log('All refund-settlement-pipeline checks passed')
