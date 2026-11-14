# MeF Direct Integration — Gap Matrix

**Audit date:** 2026-11-14 (America/Chicago)  
**Baseline:** Phase 8 MeF package + WS5 remediation readiness  
**Live production transmit:** OFF (`liveProductionTransmit=false`)

## Status taxonomy

| Status | Meaning |
|--------|---------|
| **Implemented** | Code path exists and is covered by mock/staging tests |
| **Simulated** | Behavior uses mock IRS ACKs / sandbox only |
| **Scaffolded** | New offline structure ready; needs IRS credentials or production infra |
| **Blocked** | Requires owner / IRS / partner authorization |
| **Missing** | Not present; must be built after external deps |

## Capability matrix

| Capability | Status | Location / notes |
|------------|--------|------------------|
| Return data generation (synthetic / app state → MeF payload) | Implemented (staging) | `xml/compose.ts`, pipeline |
| Full IRS XSD compile for season schemas | Missing / Blocked | Needs official IRS schema packs |
| Business-rule validation (subset) | Implemented (staging) | `xml/validate.ts` |
| Full IRS BR catalog for tax year | Missing / Blocked | Requires IRS MeF BR publications |
| Transmission packaging (MIME/SOAP/A2A) | Simulated | `transmitter/sandboxAdapter.ts` — not live A2A |
| Authentication (certs / ETIN / App Sys ID) | Scaffolded gates | `credentials/efinGate.ts`, `ats/officialAtsGate.ts` |
| Secure transmission | Simulated | Mock only; production channel Blocked |
| Acknowledgment processing | Implemented + Simulated | `ack/parseAck.ts` — `simulated=true` on mock |
| Submission tracking | Implemented | `pipeline.ts` submissions map |
| Duplicate prevention | Implemented | content-hash + already-transmitted checks |
| Accepted / rejected status handling | Implemented | `status.ts`, pipeline |
| Rejection-code explanations | Implemented (subset) | `ack/rejectCodes.ts` — expand with IRS R&C |
| Correction / resubmission | Implemented | `resubmitCorrection()` |
| Taxpayer signatures (8879) | Implemented | `form8879/bridge.ts` |
| Secure audit logs | Implemented (in-memory staging) | `logging.ts` — production durable store Blocked |
| Official ATS scenario catalog | Scaffolded | `ats/scenarioCatalog.ts` — official Pub 1436 IDs pending season |
| Synthetic ATS fixtures | Scaffolded | `ats/syntheticTestReturns.ts` |
| Official ATS gate (refuse mock-as-proof) | Scaffolded | `ats/officialAtsGate.ts` |
| Provider role / e-Services pathway | Scaffolded | `authorization/irsProviderRoles.ts` |
| Live IRS MeF A2A client | Missing / Blocked | Owner ETIN + certs + IRS Production status |
| Durable submission store (D1/Postgres) | Scaffolded (infra templates) | `infra/cloudflare/` — not deployed |
| Production encryption / KMS | Blocked | Owner key custody |

## Explicit non-claims

1. Mock acknowledgments are **not** official ATS approval.
2. Entered EFIN / PTIN format checks are **not** IRS verification.
3. Office EFIN credentials do **not** authorize NOVARA corporate transmission.
4. This matrix does **not** authorize enabling `liveProductionTransmit`.

## Next technical work (no external approval needed)

1. Expand reject-code catalog as IRS public R&C texts are mapped.
2. Wire ATS scenario packs into `test:irs-mef` / new `test:direct-irs-mef-auth`.
3. Keep production adapters throwing / returning blocked until credentials + owner auth.
4. Persist MeF logs to Cloudflare D1 **only** after infra secrets + owner approval to deploy.

## Next external work (owner)

See `docs/OWNER_AUTHORIZATION_AND_LAUNCH_REQUIREMENTS.md`.
