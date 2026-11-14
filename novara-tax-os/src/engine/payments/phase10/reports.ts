/**
 * Financial reporting — office / preparer / platform / bank settlement.
 * Enforce permissions at API layer via Phase 7 serverAuthorize.
 */

import { listSandboxCheckouts } from './stripeSandbox'
import { listSandboxSubscriptions } from './subscriptions'
import { listBankingSettlements } from './bankingAdapter'
import { listLedger } from './ledger'

export interface FinancialReport {
  tenantId: string
  generatedAt: string
  livePayments: false
  officeRevenueCents: number
  preparerTransactionCents: number
  platformFeeCents: number
  bankProductSettlementCents: number
  failedPayments: number
  succeededPayments: number
  activeSubscriptions: number
  pastDueSubscriptions: number
  reconciliation: {
    checkoutTotalCents: number
    ledgerPaymentSucceededCents: number
    balanced: boolean
  }
  alerts: string[]
}

export function buildFinancialReport(tenantId: string): FinancialReport {
  const checkouts = listSandboxCheckouts({ tenantId })
  const subs = listSandboxSubscriptions(tenantId)
  const banks = listBankingSettlements(tenantId)
  const ledger = listLedger({ tenantId })

  const succeeded = checkouts.filter((c) => c.status === 'succeeded')
  const failed = checkouts.filter((c) => c.status === 'failed')
  const officeRevenueCents = succeeded
    .filter((c) => c.quote.kind.startsWith('office_') || c.quote.kind.includes('subscription'))
    .reduce((s, c) => s + c.quote.amountCents, 0)
  const preparerTransactionCents = succeeded
    .filter((c) => c.quote.kind.startsWith('tp_') || c.quote.kind.startsWith('tc_'))
    .reduce((s, c) => s + c.quote.amountCents, 0)
  const platformFeeCents = Math.round(preparerTransactionCents * 0) // placeholder — no extra platform cut in sandbox
  const bankProductSettlementCents = banks.reduce((s, b) => s + b.fees.bankProductFeeCents, 0)

  const ledgerSuccessCents = ledger
    .filter((e) => e.kind === 'payment_succeeded' && e.amountCents)
    .reduce((s, e) => s + (e.amountCents ?? 0), 0)
  const checkoutTotalCents = succeeded.reduce((s, c) => s + c.quote.amountCents, 0)

  const alerts: string[] = []
  if (failed.length) alerts.push(`failed_payments:${failed.length}`)
  if (subs.some((s) => s.status === 'past_due')) alerts.push('subscription_past_due')
  if (banks.some((b) => b.status === 'provider_offline')) alerts.push('banking_provider_offline')

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    livePayments: false,
    officeRevenueCents,
    preparerTransactionCents,
    platformFeeCents,
    bankProductSettlementCents,
    failedPayments: failed.length,
    succeededPayments: succeeded.length,
    activeSubscriptions: subs.filter((s) => s.status === 'active').length,
    pastDueSubscriptions: subs.filter((s) => s.status === 'past_due').length,
    reconciliation: {
      checkoutTotalCents,
      ledgerPaymentSucceededCents: ledgerSuccessCents,
      balanced: checkoutTotalCents === ledgerSuccessCents || ledgerSuccessCents === 0,
    },
    alerts,
  }
}

export function buildReconciliationDashboard(tenantId: string) {
  const report = buildFinancialReport(tenantId)
  return {
    ...report,
    sections: [
      { id: 'office_revenue', label: 'Office revenue', amountCents: report.officeRevenueCents },
      { id: 'preparer_transactions', label: 'Preparer / TC transactions', amountCents: report.preparerTransactionCents },
      { id: 'platform_fees', label: 'Platform fees', amountCents: report.platformFeeCents },
      { id: 'bank_settlement', label: 'Bank-product settlement', amountCents: report.bankProductSettlementCents },
    ],
    auditTrail: listLedger({ tenantId }).slice(-50),
  }
}
