# Phase 10 — Payment Processing, Banking Products & Refund Settlement

**Status:** STOPPED BEFORE LIVE PAYMENTS OR BANKING PRODUCTS  
**Checkpoint:** `checkpoint/pre-phase10-4bf9`  
**Branch:** `cursor/phase10-payments-banking-4bf9`  
**Version:** `phase10-payments-2025.1`  
**As of:** 2026-11-14 00:22 America/Chicago

Sandbox / staging development only. Synthetic accounts and sandbox transactions. Homepage, Maximizer, IRS engine, interview, roles, client records, and approved pricing unchanged. Live payments, live banking partners, live IRS filing, and production security enforcement remain hard-OFF.

## 1. Payment integrations completed

Sandbox Stripe-style adapter under `src/engine/payments/phase10/`:

| Capability | Status |
|------------|--------|
| Hosted checkout / tokenized collection (sandbox) | PASS — no raw PAN storage |
| Webhook signature verification | PASS |
| Idempotent payment processing | PASS |
| Payment reconciliation / ledger | PASS |
| Refunds and payment reversals | PASS |
| Dispute webhook handling | PASS |
| Failed-payment handling | PASS |
| Provider outage handling | PASS |
| Subscription create / renew / cancel | PASS |
| Receipts & transaction history (ledger) | PASS |
| Secure credential management | Sandbox secrets only; not production keys |

Charge kinds quote exclusively from `fees.ts` (Tax Office annual, Independent TP subscription, personal/business prep, prior-year surcharge).

**Hard locks:** `livePayments=false`, `liveBankingPartner=false`, `liveIrsFiling=false`, `activateIrsCalcEngine=false`, `productionSecurityEnforcement=false`.

## 2. Banking adapters developed

Offline banking-product adapter framework (`bankingAdapter.ts`) wrapping existing `bankProducts` / refund-delivery surfaces:

- Refund transfers, optional advances, fee deductions, prep-fee settlement, direct deposit, check/card disbursement options (explanatory only)
- Transaction reconciliation + settlement status tracking (sandbox)
- `bankingPartnerConnectionStatus().partnerConnected === false` — **no partner claimed connected**
- Settlement remains offline until a real agreement + tested integration exists

## 3. Subscription testing results

`npm run test:payments-phase10` — **failed=0**

- Office annual subscription (Standard $899 / Plus $1250) — PASS
- Independent TP subscription ($599) — PASS
- Subscription renewal — PASS
- Status updates via sandbox subscription module — PASS

## 4. Fee calculation results

Approved prices preserved (from `fees.ts`):

| Item | Amount | Result |
|------|--------|--------|
| Tax Client personal | **$300** | PASS |
| Tax Client business | **$399** | PASS |
| Prior-year surcharge | from fees.ts | PASS |
| Office Standard / Plus | $899 / $1250 | PASS |
| TP registration | $599 | PASS |
| Banking fee breakdown (sandbox calc) | refund − bank fee − prep fee | PASS |
| Other pricing tiers | unmodified | PASS (`test:pricing`) |

## 5. Financial reporting status

`reports.ts` delivers:

- Office revenue reports
- Preparer transaction reports
- Platform fee reports
- Bank-product settlement reports
- Failed-payment alerts
- Reconciliation dashboards
- Ledger audit trail

Phase 7 / Phase 6 authz: `payment.charge`, `billing.read`, `bank.apply` — owner allowed; preparer denied financial reports; cross-tenant denied. API at `/api/security/payments`.

## 6. Sandbox transaction results

| Scenario | Result |
|----------|--------|
| Checkout + confirm | PASS |
| Duplicate prevention (idempotency key) | PASS |
| Raw card number rejected | PASS |
| Failed payment | PASS |
| Refund | PASS |
| Invalid webhook signature rejected | PASS |
| Dispute webhook + idempotent reprocess | PASS |
| Provider outage | PASS |
| Sandbox bank settlement reconcile | PASS |
| No raw card in ledger | PASS |

## 7. External banking agreements required

Before any live banking product:

1. Signed agreement with an authorized refund banking partner
2. Sandbox + production credentials provisioned separately
3. End-to-end tested integration (eligibility, fees, disbursement, reconciliation)
4. Explicit product enablement (flip `liveBankingPartner` only after approval)
5. Taxpayer disclosures / e-sign / fee transparency review
6. Compliance review for refund advances (if offered)

**Do not claim any banking partner is connected without the above.**

## 8. Files changed

**Added:**

- `src/engine/payments/phase10/` (`config`, `quotes`, `stripeSandbox`, `subscriptions`, `bankingAdapter`, `ledger`, `reports`, `index`)
- `api/security/payments.ts`
- `scripts/test-payments-phase10.mjs`
- `docs/PHASE10_PAYMENTS_BANKING_REPORT.md`

**Modified:**

- `src/engine/security/phase6/types.ts` — financial AuthzAction
- `src/engine/security/phase6/authorize.ts` — payment/billing/bank rules
- `vite.config.ts` — payments API route
- `package.json` — `test:payments-phase10`
- `tsconfig.app.json` — exclude phase10 from browser bundle

## 9. Regression results

| Suite | Result |
|-------|--------|
| `test:payments-phase10` | PASS (failed=0) |
| `build` | PASS |
| `test:pricing` | PASS |
| `test:refund-delivery` | PASS |
| `test:refund-max` | PASS |
| `test:phase7-staging` | PASS |
| `test:publish-security` | PASS |
| `test:permissions` | PASS |

Preserved: homepage/video, branding/nav, AI Refund Maximizer, IRS calc engine, tax interview, account roles, approved pricing, taxpayer records.

## 10. Remaining launch blockers

- Human approval before **any** live payment collection
- Production Stripe (or approved processor) credentials + webhook secrets
- Signed banking-partner agreement + verified connectivity
- Production security enforcement still OFF (Phase 6/7)
- Live IRS MeF transmit OFF (Phase 8)
- IRS calc engine cutover OFF (Phase 9)
- PCI scope review; never store raw card data
- Operational runbooks for disputes, failed payments, reconciliation
- No real taxpayer payment or banking product activation

---

**STOP:** Do not enable production payment collection, live banking products, live IRS filing, or production engine cutover.
