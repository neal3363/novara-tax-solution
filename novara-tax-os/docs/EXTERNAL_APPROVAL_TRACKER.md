# External Approval Tracker

Items Cursor **cannot** complete through code alone. Do **not** mark complete without evidence.

| ID | Item | Owner | Status | Evidence required |
|----|------|-------|--------|-------------------|
| EXT-IRS-PROVIDER | IRS e-file provider authorization | Compliance / ops | **BLOCKED** | IRS provider letter / authorization record |
| EXT-IRS-ATS | Official IRS ATS testing | E-file / transmitter | **BLOCKED** | ATS acceptance documentation (not mock) |
| EXT-STATE-EFILE | Applicable state e-file approvals | Compliance | **BLOCKED** | Per-state approval letters for states to be filed |
| EXT-PAY-LIVE | Payment processor live-account approval | Finance | **BLOCKED** | Merchant agreement + live keys in secrets manager |
| EXT-BANK-PARTNER | Banking partner agreements | Finance / legal | **BLOCKED** | Signed partner agreement + settlement test report |
| EXT-PCI | PCI compliance obligations | Security / finance | **BLOCKED** | SAQ/ROC or AoC matching hosted-checkout model |
| EXT-APPSEC | Independent application security assessment | Security | **BLOCKED** | Third-party AppSec report with remediations closed |
| EXT-HOST-KEYS | Production hosting and encryption-key infrastructure | Platform | **BLOCKED** | Hosting runbook + KMS/HSM key custody evidence |
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
