# Pricing update — TP pay-per-return & Office annual plans

**Date:** 2026-11-14 America/Chicago  
**SSOT:** `src/data/fees.ts`

## Approved structure

### Tax Client (unchanged)
- Personal: **$300**
- Business: **$399**

### Tax Preparer — pay per return (no annual subscription)
| Return | NOVARA fee |
|--------|------------|
| Personal | **$89** per return |
| Self-employed / 1040 + Schedule C | **$119** per return |
| Business entity (1065 / 1120-S / 1120) | **$249** per return |

Standalone totals (not surcharges). Unlimited clients. TP sets client prep charges. Bank/sponsor fees separate. TP cannot manage other preparers.

### Tax Office — annual subscription
| Plan | Price | Covers |
|------|-------|--------|
| Personal | **$899/year** | Personal returns |
| Self-Employed | **$1,199/year** | Personal + Schedule C |
| Business | **$1,499/year** | Personal, Schedule C, 1065, 1120-S, 1120 |

Covered returns: **$0** additional NOVARA per-return fee (including office-employed preparers). Bank fees separate. Prior-year surcharge **$250** unchanged.

## Payment provider

Live Stripe/payment-provider price IDs are **not** configured in this repo (`livePayments=false`). Sandbox quotes read from `fees.ts` via `quoteCharge`.

**Owner setup still required for live billing:**
1. Create Stripe (or partner) Prices for TP per-return SKUs ($89 / $119 / $249) and Office annual SKUs ($899 / $1,199 / $1,499).
2. Bind secret keys via host secrets — do not commit keys.
3. Map Price IDs into the payments adapter when live mode is authorized.
4. Do **not** auto-migrate existing subscriber agreements when catalog changes.

## Enforcement
- Frontend + backend: `novaraSoftwareFeeForReturn` / `officePlanAllowsReturn`
- Office-employed preparers inherit Office plan (never standalone TP fees)
- `PRICING.preserveExistingBillingAgreements === true`
