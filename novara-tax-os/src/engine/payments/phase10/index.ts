/**
 * Phase 10 — Payment processing, banking products & refund settlement (sandbox).
 * STOP before activating live payments or banking products.
 */

export {
  PHASE10_VERSION,
  DEFAULT_PHASE10_FLAGS,
  getPhase10Flags,
  setPhase10FlagsForTests,
  resetPhase10Flags,
  assertNoLivePayments,
} from './config'
export type { Phase10PaymentFlags } from './config'

export {
  quoteCharge,
  assertApprovedPricingIntact,
} from './quotes'
export type { ChargeKind, FeeQuote } from './quotes'

export {
  createSandboxCheckout,
  confirmSandboxPayment,
  refundSandboxPayment,
  buildSandboxWebhook,
  processSandboxWebhook,
  verifyWebhookSignature,
  getSandboxCheckout,
  listSandboxCheckouts,
  resetStripeSandboxForTests,
  setStripeProviderMode,
  getStripeWebhookSecretForTests,
} from './stripeSandbox'
export type { PaymentStatus, SandboxCheckoutSession, SandboxWebhookEvent } from './stripeSandbox'

export {
  createSandboxSubscription,
  renewSandboxSubscription,
  cancelSandboxSubscription,
  getSandboxSubscription,
  listSandboxSubscriptions,
  resetSubscriptionsForTests,
} from './subscriptions'
export type { SubscriptionStatus, SandboxSubscription } from './subscriptions'

export {
  bankingPartnerConnectionStatus,
  calculateBankingFees,
  explainRefundDeliveryOptions,
  startSandboxBankSettlement,
  advanceSandboxSettlement,
  listBankingSettlements,
  resetBankingAdapterForTests,
} from './bankingAdapter'
export type { BankingFeeBreakdown, BankingSettlementRecord, BankingSettlementStatus } from './bankingAdapter'

export {
  openRefundSettlementCase,
  receiveIrsWire,
  verifyInboundDeposit,
  withholdAuthorizedFees,
  submitClientDisbursement,
  confirmClientDisbursement,
  sendDepositTransactionalEmail,
  runSandboxSettlementHappyPath,
  listRefundSettlementCases,
  getRefundSettlementCase,
  resetRefundSettlementForTests,
  destinationLabel,
  achDestinationFromForm,
  debitRailDestination,
  validatePayoutDestination,
} from './refundSettlementPipeline'
export type {
  RefundSettlementCase,
  SettlementPhase,
  ClientPayoutDestination,
  DebitRail,
  FeeSplitBreakdown,
} from './refundSettlementPipeline'

export {
  listTransactionalEmails,
  resetTransactionalEmailForTests,
  maskEmail,
  buildRefundDepositNotice,
} from './transactionalEmail'
export type { TransactionalEmailRecord, TransactionalEmailKind } from './transactionalEmail'

export { appendLedger, listLedger, resetLedgerForTests } from './ledger'
export type { LedgerEntry, LedgerEntryKind } from './ledger'

export { buildFinancialReport, buildReconciliationDashboard } from './reports'
export type { FinancialReport } from './reports'

import { PHASE10_VERSION, getPhase10Flags, resetPhase10Flags } from './config'
import { assertApprovedPricingIntact } from './quotes'
import { bankingPartnerConnectionStatus } from './bankingAdapter'
import { resetStripeSandboxForTests } from './stripeSandbox'
import { resetSubscriptionsForTests } from './subscriptions'
import { resetBankingAdapterForTests } from './bankingAdapter'
import { resetLedgerForTests } from './ledger'
import { resetRefundSettlementForTests } from './refundSettlementPipeline'
import { resetTransactionalEmailForTests } from './transactionalEmail'

export function resetPhase10ForTests(): void {
  resetPhase10Flags()
  resetStripeSandboxForTests()
  resetSubscriptionsForTests()
  resetBankingAdapterForTests()
  resetLedgerForTests()
  resetRefundSettlementForTests()
  resetTransactionalEmailForTests()
}

export function phase10Summary(): string {
  const f = getPhase10Flags()
  const pricing = assertApprovedPricingIntact()
  const bank = bankingPartnerConnectionStatus()
  return [
    'NOVARA Phase 10 payments & banking (sandbox only)',
    `version=${PHASE10_VERSION}`,
    `livePayments=${f.livePayments}`,
    `liveBankingPartner=${f.liveBankingPartner}`,
    `tcPersonal=${pricing.tcPersonal}`,
    `tcBusiness=${pricing.tcBusiness}`,
    `partnerConnected=${bank.partnerConnected}`,
    'STOP before activating live payments or banking products.',
  ].join('\n')
}
