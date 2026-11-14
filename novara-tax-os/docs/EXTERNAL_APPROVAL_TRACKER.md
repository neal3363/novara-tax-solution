# External Approval Tracker

Items Cursor **cannot** complete through code alone. Do **not** mark complete without evidence.

| ID | Item | Owner | Status | Evidence required |
|----|------|-------|--------|-------------------|
| EXT-IRS-PROVIDER | IRS e-file provider authorization (NOVARA Software Developer + Transmitter) | Compliance / ops | **BLOCKED** | IRS provider letter / authorization record; see `OWNER_AUTHORIZATION_AND_LAUNCH_REQUIREMENTS.md` |
| EXT-IRS-EFIN-ETIN | NOVARA EFIN + Test/Production ETINs + Software IDs | Owner / RO | **BLOCKED** | IRS-assigned identifiers in secrets vault (not git); office EFIN ≠ NOVARA transmit auth |
| EXT-IRS-ATS | Official IRS ATS testing | E-file / transmitter | **BLOCKED** | ATS acceptance documentation (not mock); Pub 1436 scenario evidence |
| EXT-STATE-EFILE | Applicable state e-file approvals | Compliance | **BLOCKED** | Per-state approval letters for states to be filed; see `STATE_EFILE_AUTHORIZATION_MATRIX.md` |
| EXT-BIZ-ENTITY | Legal entity + EIN + KYC for merchants/banks | Owner / counsel | **BLOCKED** | Formation docs + EIN matching IRS e-file Application |
| EXT-INSURANCE | Cyber liability + E&O insurance | Owner | **BLOCKED** | Bound policy evidence before scale PII |
| EXT-INDEPENDENT-COMPANY | Confirm independent software company model (not reseller/franchise) | Executive | **BLOCKED** | Signed charter acknowledgment; see `INDEPENDENT_TAX_SOFTWARE_COMPANY_CHARTER.md` |
| EXT-PAY-LIVE | Payment processor live-account approval | Finance | **BLOCKED** | Merchant agreement + live keys in secrets manager |
| EXT-STRIPE-PRICES | Live Stripe Price IDs matching `fees.ts` | Finance | **BLOCKED** | Price IDs for TP $89/$119/$249, Office $899/$1199/$1499, TC $300/$399 |
| EXT-BANK-PARTNER | Banking partner agreements (refund-transfer / settlement — **not Stripe**) | Finance / legal | **BLOCKED** | Signed partner agreement + settlement test report; secrets `REFUND_BANK_PARTNER_*` / `NOVARA_VIRTUAL_SETTLEMENT_ACCOUNT_ID` |
| EXT-PCI | PCI compliance obligations | Security / finance | **BLOCKED** | SAQ/ROC or AoC matching hosted-checkout model |
| EXT-APPSEC | Independent application security assessment | Security | **BLOCKED** | Third-party AppSec / penetration test with remediations closed |
| EXT-HOST-KEYS | Production hosting and encryption-key infrastructure | Platform | **BLOCKED** | Hosting runbook + KMS/HSM key custody evidence |
| EXT-CF-DNS | Official domain + Cloudflare DNS/SSL/WAF | Platform / owner | **BLOCKED** | Owner-approved DNS cutover evidence |
| EXT-EMAIL | Branded business + transactional email | Ops | **BLOCKED** | Domain verified + ESP live + templates |
| EXT-SUPPORT | Production ticket / helpdesk system | Ops | **BLOCKED** | Staffed support channel evidence |
| EXT-LEGAL | Final Privacy Policy & Terms | Legal | **BLOCKED** | Counsel-approved policies (draft pages exist only) |
| EXT-SEO | Google Search Console / GA4 / Business Profile | Marketing | **BLOCKED** | Property verification + sitemap submit on owned domain |
| EXT-IOS | Apple App Store release | Mobile | **BLOCKED** | TestFlight + App Review submission (no native app yet) |
| EXT-ANDROID | Google Play release | Mobile | **BLOCKED** | Signed AAB + Play Console listing (no native app yet) |
| EXT-LOAD | Controlled load test evidence (100 / 1k / 10k) | Platform | **BLOCKED** | Measured results on staging infra — not claimed |
| EXT-DR | Production backup restore drill | Platform | **BLOCKED** | Timed restore evidence on production-class storage |
| EXT-HUMAN-LAUNCH | Human launch authorization | Executive | **BLOCKED** | Signed go-live decision after gates pass |

## Related code locks (must stay OFF until approvals)

- `liveProductionTransmit` / MeF live IRS filing
- `activateCutover` / taxpayer-visible IRS engine
- `livePayments` / `liveBankingPartner`
- `productionEnforcement` / process real taxpayer returns
- `nationwideStateFiling` / `liveBusinessEfile`

## Notes

- Mock ATS / sandbox Stripe / staging security tests are **not** substitutes for the rows above.
- Synthetic public demo may proceed under `GO_SYNTHETIC_ONLY` without completing this tracker.
- Real taxpayer production remains **NO-GO** until every critical row has evidence.
- **Release fence (2026-11-14):** public synthetic demo is live and locked — see `RELEASE_FENCE.md` (`fence/public-demo-live-4bf9`).
- Pricing SSOT update (PR #58) does not authorize live Stripe Price creation — owner must create and bind IDs.
- Independent company charter (PR follow-on): NOVARA is not a white-label reseller or franchise — see `INDEPENDENT_COMPANY_OWNER_REQUIREMENTS.md`.
