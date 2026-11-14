/**
 * Phase 10 sandbox payments API — Phase 7 server authorization required.
 * Live payments hard-blocked. No raw card storage.
 */

import { json, loadPhase7, sessionIdFrom, refuseUnlessStagingEnabled} from './_shared.js'

async function loadP10() {
  return import('../../novara-tax-os/src/engine/payments/phase10/index.js')
}

export async function GET() {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p10 = await loadP10()
    return json(200, {
      summary: p10.phase10Summary(),
      flags: p10.getPhase10Flags(),
      pricing: p10.assertApprovedPricingIntact(),
      banking: p10.bankingPartnerConnectionStatus(),
      livePayments: false,
      stop: 'STOP before activating live payments or banking products',
    })
  } catch (e) {
    return json(500, { error: 'payments_status_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}

export async function POST(request: Request) {
  const __denied = refuseUnlessStagingEnabled()
  if (__denied) return __denied
  try {
    const p7 = await loadPhase7()
    const p10 = await loadP10()
    p10.assertNoLivePayments()

    const body = (await request.json()) as Record<string, unknown>
    const op = String(body.op ?? '')
    const sessionId = sessionIdFrom(request, body)
    if (!sessionId) return json(401, { error: 'missing_session' })

    const action =
      op === 'report' || op === 'delivery_options'
        ? ('billing.read' as const)
        : op === 'bank_settle'
          ? ('bank.apply' as const)
          : ('payment.charge' as const)

    let authz
    try {
      const { session } = p7.resolveSessionPrincipal(sessionId)
      authz = p7.serverAuthorize({
        sessionId,
        action,
        resourceTenantId: String(body.tenantId ?? session.tenantId),
        resourceOwnerId: body.ownerId ? String(body.ownerId) : session.principalId,
        resourceOfficeId: body.officeId ? String(body.officeId) : session.officeId,
      })
    } catch {
      return json(401, { error: 'session_invalid' })
    }

    if (!authz.allowed) {
      p10.appendLedger({
        tenantId: authz.session.tenantId,
        actorId: authz.principal.id,
        kind: 'access_denied',
        outcome: 'denied',
        meta: { op, code: authz.code },
      })
      return json(403, { error: authz.code, reason: authz.reason, serverSide: true })
    }

    const tenantId = authz.session.tenantId
    const actorId = authz.principal.id

    if (op === 'quote') {
      const kind = String(body.kind ?? 'tc_personal') as Parameters<typeof p10.quoteCharge>[0]
      const quote = p10.quoteCharge(kind, {
        includePriorYearSurcharge: Boolean(body.includePriorYearSurcharge),
      })
      return json(200, { quote, livePayments: false })
    }

    if (op === 'checkout') {
      const kind = String(body.kind ?? 'tc_personal') as Parameters<typeof p10.quoteCharge>[0]
      const quote = p10.quoteCharge(kind, {
        includePriorYearSurcharge: Boolean(body.includePriorYearSurcharge),
      })
      const idempotencyKey = String(body.idempotencyKey ?? `idem_${Date.now()}`)
      try {
        const checkout = p10.createSandboxCheckout({
          quote,
          tenantId,
          principalId: actorId,
          idempotencyKey,
        })
        p10.appendLedger({
          tenantId,
          actorId,
          kind: 'checkout_created',
          amountCents: quote.amountCents,
          currency: 'usd',
          refId: checkout.id,
          outcome: 'success',
          meta: { kind: quote.kind },
        })
        return json(200, { checkout, livePayments: false })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg === 'payment_provider_unavailable') {
          p10.appendLedger({
            tenantId,
            actorId,
            kind: 'provider_outage',
            outcome: 'error',
            meta: { op: 'checkout' },
          })
          return json(503, { error: msg })
        }
        return json(400, { error: msg })
      }
    }

    if (op === 'confirm') {
      try {
        const checkout = p10.confirmSandboxPayment({
          checkoutId: String(body.checkoutId ?? ''),
          paymentMethodToken: String(body.paymentMethodToken ?? 'pm_test'),
          forceFail: Boolean(body.forceFail),
        })
        p10.appendLedger({
          tenantId,
          actorId,
          kind: checkout.status === 'succeeded' ? 'payment_succeeded' : 'payment_failed',
          amountCents: checkout.quote.amountCents,
          currency: 'usd',
          refId: checkout.id,
          outcome: checkout.status === 'succeeded' ? 'success' : 'error',
          meta: { status: checkout.status },
        })
        return json(200, { checkout, livePayments: false })
      } catch (e) {
        return json(400, { error: String(e instanceof Error ? e.message : e) })
      }
    }

    if (op === 'refund') {
      const checkout = p10.refundSandboxPayment({
        checkoutId: String(body.checkoutId ?? ''),
        amountCents: typeof body.amountCents === 'number' ? body.amountCents : undefined,
      })
      p10.appendLedger({
        tenantId,
        actorId,
        kind: 'payment_refunded',
        amountCents: checkout.quote.amountCents,
        currency: 'usd',
        refId: checkout.id,
        outcome: 'success',
        meta: { status: checkout.status },
      })
      return json(200, { checkout, livePayments: false })
    }

    if (op === 'subscribe') {
      const kind = String(body.kind ?? 'tp_subscription') as 'tp_subscription' | 'office_subscription_standard' | 'office_subscription_plus'
      const result = p10.createSandboxSubscription({ tenantId, principalId: actorId, kind })
      p10.appendLedger({
        tenantId,
        actorId,
        kind: 'subscription_created',
        amountCents: result.subscription.quote.amountCents,
        currency: 'usd',
        refId: result.subscription.id,
        outcome: 'success',
        meta: { kind },
      })
      return json(200, { ...result, livePayments: false })
    }

    if (op === 'report') {
      return json(200, {
        report: p10.buildFinancialReport(tenantId),
        dashboard: p10.buildReconciliationDashboard(tenantId),
      })
    }

    if (op === 'delivery_options') {
      const amount = typeof body.verifiedRefund === 'number' ? body.verifiedRefund : 0
      return json(200, p10.explainRefundDeliveryOptions(amount))
    }

    if (op === 'bank_settle') {
      const delivery = body.delivery as Parameters<typeof p10.startSandboxBankSettlement>[0]['delivery']
      const rec = p10.startSandboxBankSettlement({
        tenantId,
        ownerId: actorId,
        providerId: String(body.providerId ?? 'novara-platform-default'),
        productCode: String(body.productCode ?? 'refund_transfer'),
        refundDollars: Number(body.refundDollars ?? 0),
        bankProductFeeDollars: Number(body.bankProductFeeDollars ?? 0),
        taxPrepFeeDollars: Number(body.taxPrepFeeDollars ?? 0),
        delivery,
      })
      p10.appendLedger({
        tenantId,
        actorId,
        kind: 'bank_settlement',
        amountCents: rec.fees.bankProductFeeCents,
        currency: 'usd',
        refId: rec.id,
        outcome: 'success',
        meta: { status: rec.status, partnerConnected: false },
      })
      return json(200, { settlement: rec, partnerConnected: false, liveBankingPartner: false })
    }

    return json(400, { error: 'unknown_op' })
  } catch (e) {
    return json(500, { error: 'payments_failed', detail: String(e instanceof Error ? e.message : e) })
  }
}
