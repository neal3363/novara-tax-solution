# Remediation WS6 — Payments & Banking Readiness

**Live payments:** OFF  
**Live banking partner:** OFF  
**Approved pricing preserved:** TC personal $300, TC business $399; Office/TP tiers unchanged

## Sandbox verified

- Hosted/tokenized checkout (no raw PAN)
- Webhook signature verification + spoof rejection
- Idempotent checkout
- Subscription renewals
- Refunds
- Provider outage fail-closed
- Banking adapter remains disconnected

Harness: `npm run test:payments-readiness`

## Refund settlement (PR #68)

Sandbox pipeline exists (virtual bank → verify → fee withhold → ACH/Chime-Cash App → email after confirm).  
**Class:** Simulated. Live money OFF.

Stripe = software billing only. IRS refund settlement requires an **authorized refund-banking partner** (`refundBankPartner.ts` + `EXT-BANK-PARTNER`).

## External steps

See `EXTERNAL_APPROVAL_TRACKER.md` rows EXT-PAY-LIVE, EXT-BANK-PARTNER, EXT-PCI.
