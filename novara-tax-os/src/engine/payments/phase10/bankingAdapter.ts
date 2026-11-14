/**
 * Banking-product adapter framework for authorized refund partners.
 * Does NOT claim a partner is connected without agreement + tested integration.
 */

import { randomBytes } from 'node:crypto'
import {
  createOfflineBankApplication,
  evaluateBankProductEligibility,
  listBankProviderConfigs,
  type BankProductApplication,
  type BankProductStatus,
} from '../../bankProducts'
import {
  REFUND_DELIVERY_LABELS,
  validateRefundDelivery,
  type RefundDeliverySelection,
} from '../../refundDelivery'
import { PRICING } from '../../../data/fees'
import { assertNoLivePayments, getPhase10Flags } from './config'

export type BankingSettlementStatus =
  | 'not_started'
  | 'pending_provider'
  | 'fee_calculated'
  | 'prep_fee_settled'
  | 'disbursed_simulated'
  | 'reconciled'
  | 'failed'
  | 'provider_offline'

export interface BankingFeeBreakdown {
  refundAmountCents: number
  bankProductFeeCents: number
  taxPrepFeeSettlementCents: number
  netToTaxpayerCents: number
  currency: 'usd'
  disclosure: string
  liveBankingPartner: false
  partnerConnected: false
}

export interface BankingSettlementRecord {
  id: string
  tenantId: string
  ownerId: string
  providerId: string
  productCode: string
  application: BankProductApplication
  fees: BankingFeeBreakdown
  status: BankingSettlementStatus
  deliveryMethod: RefundDeliverySelection['method']
  updatedAt: string
  note: string
}

const settlements = new Map<string, BankingSettlementRecord>()

export function resetBankingAdapterForTests(): void {
  settlements.clear()
}

export function bankingPartnerConnectionStatus(): {
  liveConnectivity: false
  partnerConnected: false
  agreementRequired: true
  message: string
} {
  return {
    liveConnectivity: false,
    partnerConnected: false,
    agreementRequired: true,
    message:
      'No banking partner is connected. Adapter framework is ready for sandbox simulation only. External agreements required before live activation.',
  }
}

export function calculateBankingFees(input: {
  refundDollars: number
  bankProductFeeDollars: number
  taxPrepFeeDollars: number
}): BankingFeeBreakdown {
  assertNoLivePayments()
  const refundAmountCents = Math.round(input.refundDollars * 100)
  const bankProductFeeCents = Math.round(input.bankProductFeeDollars * 100)
  const taxPrepFeeSettlementCents = Math.round(input.taxPrepFeeDollars * 100)
  const net = refundAmountCents - bankProductFeeCents - taxPrepFeeSettlementCents
  return {
    refundAmountCents,
    bankProductFeeCents,
    taxPrepFeeSettlementCents,
    netToTaxpayerCents: Math.max(0, net),
    currency: 'usd',
    disclosure: PRICING.banking.disclosure,
    liveBankingPartner: false,
    partnerConnected: false,
  }
}

export function explainRefundDeliveryOptions(verifiedRefund: number): {
  options: { method: RefundDeliverySelection['method']; label: string; available: boolean; feeNote: string }[]
  irsControlDisclaimer: string
} {
  const bankLive = PRICING.banking.liveConnectivity
  return {
    options: [
      {
        method: 'direct_deposit',
        label: REFUND_DELIVERY_LABELS.direct_deposit,
        available: verifiedRefund > 0,
        feeNote: 'No NOVARA fee for standard IRS direct deposit.',
      },
      {
        method: 'paper_check',
        label: REFUND_DELIVERY_LABELS.paper_check,
        available: verifiedRefund > 0,
        feeNote: 'IRS mailed check — timing controlled by IRS, not NOVARA.',
      },
      {
        method: 'bank_product',
        label: REFUND_DELIVERY_LABELS.bank_product,
        available: verifiedRefund > 0 && getPhase10Flags().bankingAdapterEnabled,
        feeNote: bankLive
          ? 'Partner fees disclosed before authorization.'
          : 'Banking products offline until partner agreement and tested integration.',
      },
    ],
    irsControlDisclaimer:
      'NOVARA Tax OS does not control IRS refund issuance, timing, or approval. Delivery selection only records taxpayer preference and partner applications.',
  }
}

export function startSandboxBankSettlement(input: {
  tenantId: string
  ownerId: string
  providerId: string
  productCode: string
  refundDollars: number
  bankProductFeeDollars: number
  taxPrepFeeDollars: number
  delivery: RefundDeliverySelection
}): BankingSettlementRecord {
  assertNoLivePayments()
  if (!getPhase10Flags().bankingAdapterEnabled) throw new Error('banking_adapter_disabled')

  const configs = listBankProviderConfigs(input.tenantId)
  const provider = configs.find((c) => c.id === input.providerId) ?? configs[0]
  if (!provider) throw new Error('provider_not_configured')

  const product = provider.products.find((p) => p.code === input.productCode) ?? provider.products[0]
  const eligibility = evaluateBankProductEligibility(provider, product?.code ?? input.productCode)
  const app = createOfflineBankApplication(provider.id, product?.code ?? input.productCode)
  const fees = calculateBankingFees({
    refundDollars: input.refundDollars,
    bankProductFeeDollars: input.bankProductFeeDollars,
    taxPrepFeeDollars: input.taxPrepFeeDollars,
  })

  const validation = validateRefundDelivery(input.delivery, input.refundDollars)
  const status: BankingSettlementStatus = !eligibility.liveConnectivity
    ? 'provider_offline'
    : validation.ok
      ? 'pending_provider'
      : 'failed'

  const rec: BankingSettlementRecord = {
    id: `bset_${randomBytes(6).toString('hex')}`,
    tenantId: input.tenantId,
    ownerId: input.ownerId,
    providerId: provider.id,
    productCode: product?.code ?? input.productCode,
    application: app,
    fees,
    status,
    deliveryMethod: input.delivery.method,
    updatedAt: new Date().toISOString(),
    note: eligibility.liveConnectivity
      ? 'Submitted to provider (sandbox)'
      : 'Provider offline — application recorded; not a live partner connection',
  }
  settlements.set(rec.id, rec)
  return { ...rec, fees: { ...rec.fees }, application: { ...rec.application } }
}

export function advanceSandboxSettlement(
  id: string,
  next: Extract<BankingSettlementStatus, 'fee_calculated' | 'prep_fee_settled' | 'disbursed_simulated' | 'reconciled'>,
): BankingSettlementRecord {
  assertNoLivePayments()
  const rec = settlements.get(id)
  if (!rec) throw new Error('settlement_not_found')
  if (rec.status === 'provider_offline' && next !== 'fee_calculated') {
    // Allow fee calc simulation even when offline; block live-like disbursement claims
    if (next === 'disbursed_simulated' || next === 'reconciled' || next === 'prep_fee_settled') {
      rec.status = next
      rec.note = `${next} (sandbox simulation only — partner not connected)`
      rec.updatedAt = new Date().toISOString()
      settlements.set(id, rec)
      return { ...rec, fees: { ...rec.fees }, application: { ...rec.application } }
    }
  }
  rec.status = next
  rec.updatedAt = new Date().toISOString()
  settlements.set(id, rec)
  return { ...rec, fees: { ...rec.fees }, application: { ...rec.application } }
}

export function listBankingSettlements(tenantId?: string): BankingSettlementRecord[] {
  return [...settlements.values()]
    .filter((s) => !tenantId || s.tenantId === tenantId)
    .map((s) => ({ ...s, fees: { ...s.fees }, application: { ...s.application } }))
}

export function mapApplicationStatus(status: BankProductStatus): string {
  return status
}
