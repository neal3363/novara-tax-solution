# Environment Variable Inventory

**Rule:** This file lists **names only**. Never commit secret values.  
**Production activation:** OFF

## Published / demo host (current)

| Name | Required | Purpose | Bound today? |
|------|----------|---------|--------------|
| Cursor identity headers (platform) | Host-provided | Viewer session for `api/session.ts` | Platform-managed |
| App visibility (platform) | Host-provided | Public / private / team | Platform-managed |

No Stripe, IRS, or bank secrets are required for the synthetic public demo.

## Required before live payments

| Name | Purpose | Notes |
|------|---------|-------|
| `STRIPE_SECRET_KEY` | Live Stripe API | Owner creates; bind via secrets manager |
| `STRIPE_WEBHOOK_SECRET` | Verify webhooks | Required for reconciliation |
| `STRIPE_PRICE_TP_PERSONAL` | Price ID — TP personal $89 | Must match `fees.ts` |
| `STRIPE_PRICE_TP_SELF_EMPLOYED` | Price ID — TP SE $119 | Must match `fees.ts` |
| `STRIPE_PRICE_TP_BUSINESS_ENTITY` | Price ID — TP business $249 | Must match `fees.ts` |
| `STRIPE_PRICE_OFFICE_PERSONAL` | Price ID — Office $899/yr | Must match `fees.ts` |
| `STRIPE_PRICE_OFFICE_SELF_EMPLOYED` | Price ID — Office $1,199/yr | Must match `fees.ts` |
| `STRIPE_PRICE_OFFICE_BUSINESS` | Price ID — Office $1,499/yr | Must match `fees.ts` |
| `STRIPE_PRICE_TC_PERSONAL` | Price ID — TC $300 | Preserve existing |
| `STRIPE_PRICE_TC_BUSINESS` | Price ID — TC $399 | Preserve existing |

## Required before live IRS / MeF

| Name | Purpose |
|------|---------|
| `MEF_ENV` | Must be official ATS/production only after authorization |
| `MEF_TRANSMITTER_ID` | IRS transmitter credentials |
| `MEF_ETIN` / related transmitter secrets | Partner-provided |
| `MEF_CERT_PEM` / key material | KMS-backed; never in repo |

## Required before production document vault

| Name | Purpose |
|------|---------|
| `DOCUMENT_BUCKET` | R2/S3 bucket name |
| `DOCUMENT_KMS_KEY_ID` | Encryption at rest |
| `MALWARE_SCAN_ENDPOINT` | Upload scanning |

## Required before transactional email

| Name | Purpose |
|------|---------|
| `EMAIL_FROM` | Branded From address |
| `EMAIL_API_KEY` | Provider API key |
| `EMAIL_WEBHOOK_SECRET` | Bounce/complaint handling |

## Required before live refund settlement (not Stripe)

Stripe Price IDs above cover **software billing only**. IRS refund receipt, fee withhold, and client disbursement need an **authorized refund-banking / refund-transfer partner** — separate from Stripe.

| Name | Purpose |
|------|---------|
| `REFUND_BANK_PARTNER_API_KEY` | Partner API credential |
| `REFUND_BANK_PARTNER_WEBHOOK_SECRET` | Verify partner settlement webhooks |
| `REFUND_BANK_PARTNER_MERCHANT_ID` | Merchant / EFIN-linked settlement ID from partner |
| `NOVARA_VIRTUAL_SETTLEMENT_ACCOUNT_ID` | Partner-issued virtual account for inbound IRS wires |

## Feature flags (code defaults — keep false until GO)

Documented in engine configs, not necessarily env:

- `livePayments=false`
- `liveBankingPartner=false`
- `liveProductionTransmit=false`
- `activateCutover=false`
- `productionEnforcement=false`

Changing these without owner authorization and external evidence is forbidden.
