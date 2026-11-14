# NOVARA Tax OS — Production readiness audit

**As of:** 2026-11-14 ~10:15 AM America/Chicago  
**Branch:** `cursor/prod-readiness-audit-4bf9`  
**Base:** `cursor/novara-tax-os-v1-local-4bf9` (includes PR #68)  
**Auditor method:** Code, config, tests, docs, and deploy topology inspection — **not** treating merged PRs or sandbox sims as live proof  
**Decisions:** Public synthetic demo **GO_SYNTHETIC_ONLY** · Real taxpayer production **NO-GO**

Status vocabulary for this scorecard:

| Status | Meaning |
|--------|---------|
| **Implemented and verified** | Code present + automated or documented evidence in this pass |
| **Implemented but unverified** | Code present; no production-class external evidence |
| **Simulated** | Explicit sandbox / mock / UI walkthrough only |
| **Blocked** | Requires owner account, partner, DNS, or third party |
| **Missing** | Not present in repo or deploy |

---

## 1. Product separation

| Capability | Status | Evidence | Remaining action | Owner |
|------------|--------|----------|------------------|-------|
| Tax OS branch + `novara-tax-os/` directory | Implemented and verified | Tree on `cursor/novara-tax-os-v1-local-4bf9` | Keep publishing from Tax OS path only | Eng |
| Asset Intelligence on `main` | Implemented and verified | Root Next.js on `main`; no `novara-tax-os/` | Optional dedicated GitHub repo (blocked: createRepository) | Owner |
| PR #67 reached Tax OS | Missing (correct) | `totp.ts` absent on Tax OS HEAD | None — keep separate | Eng |
| PR #68 on Tax OS | Implemented and verified (code) | Merge `0e7cbad` on Tax OS base | Republish demo when desired | Eng |
| Dedicated Tax DB / R2 / Workers | Missing | No `wrangler.toml`, no D1 migrations | Authorize infra build | Owner |
| Separation doc | Implemented and verified | `docs/PRODUCT_SEPARATION_EVIDENCE.md` | Keep updated on merges | Eng |

## 2. Production infrastructure

| Capability | Status | Evidence | Remaining | Secrets / config (names only) |
|------------|--------|----------|-----------|-------------------------------|
| Cloudflare Workers | Missing | No wrangler | Owner authorize CF account | CF account |
| D1 / Postgres | Missing | ARCHITECTURE.md | Migrations + tenant indexes | `DATABASE_URL` / D1 binding |
| R2 document store | Missing | ARCHITECTURE.md | Bucket + KMS | `DOCUMENT_BUCKET`, `DOCUMENT_KMS_KEY_ID` |
| Queues / DLQ | Missing | Absent | Job runner for MeF/email/settlement | — |
| Transactional email ESP | Simulated | In-memory queue in phase10 transactionalEmail | Bind ESP | `EMAIL_FROM`, `EMAIL_API_KEY`, `EMAIL_WEBHOOK_SECRET` |
| Backups / restore | Implemented but unverified (docs only) | BUSINESS_CONTINUITY.md; no prod restore drill | EXT-DR | — |
| Secrets management | Blocked | Cursor app secrets for demo only | Prod secrets manager | See ENV_VARIABLE_INVENTORY.md |
| Individual accounts + MFA (Tax data plane) | Missing / Blocked | Staging MFA modules ≠ tax store auth | Server IdP + MFA | IdP vars TBD |
| Server-side role/tenant isolation | Implemented but unverified for prod API | Client isolation tests PASS; server tax API absent | Build API + persist | — |
| Cursor host session | Implemented and verified (demo) | `api/session.ts` | Not sufficient alone for tax data | Platform identity |

## 3. Tax preparation journey

| Step | Status | Notes |
|------|--------|-------|
| Upload / classify | Implemented and verified (demo) | Landing + vault classify; filename heuristics |
| Extraction | Simulated | Deterministic demo extractFactsForType — not OCR vendor |
| Targeted questions | Implemented and verified (engine tests) | Interview / progress suites |
| Eligibility / benefits | Implemented and verified (staging) | Benefit optimizer + maximizer scenarios |
| Calculation | Implemented but unverified vs IRS production | Isolated engine + golden; cutover OFF |
| Human verification | Implemented and verified (UI/flow) | Confirm extracted fields; no invent policy in docs |
| Signature | Implemented and verified (sandbox) | Filing auth / 8879 bridge |
| Submission | Simulated | MeF mock ATS only |
| Acceptance / rejection tracking | Simulated | Mock ACK pipeline |
| Filing status / dependents / childcare / education / credits | Implemented and verified (synthetic) | Engine + questionnaire tests |
| Federal | Implemented but unverified (official) | Phases 3–5 staging |
| State | Implemented but unverified / partial | Phase 11; nationwide flag OFF |
| Amended / multi-year | Implemented but unverified | Phase 11 / multi-year modules; live e-file blocked |
| Promise refund | N/A control | UI uses verified amounts; settlement uses authorized fees |

## 4. E-file

| Item | Status | Detail |
|------|--------|--------|
| Authorized e-file provider | Blocked | No IRS provider letter on file (`EXT-IRS-PROVIDER`) |
| Integration path | Simulated | `src/engine/irs/mef/` mock transmitter; `liveProductionTransmit=false` |
| Credentials | Blocked | `MEF_*` secrets unset |
| Forms / years | Simulated | 1040/1040-SR compose stubs TY2022–2025; business/NR blocked |
| States | Blocked / partial | Per-state approvals missing |
| Official ATS | Blocked | Mock only (`EXT-IRS-ATS`) |
| Unsupported paths labeled | Implemented and verified | Unsupported forms blocked in MeF tests |

## 5. Payments & refund settlement (PR #68)

| Item | Status | Detail |
|------|--------|--------|
| PR #68 pipeline | Simulated | Virtual bank → verify → fee withhold → ACH/Chime/Cash App → email after confirm |
| Live money movement | Blocked | `livePayments=false`, `liveBankingPartner=false` |
| Stripe role | Simulated (software fees) | Checkout/subscriptions only — **not** IRS refund settlement |
| Required bank-product provider | Blocked | Authorized refund-transfer partner agreement (`EXT-BANK-PARTNER`) |
| Partner webhook / reconciliation / duplicates | Implemented but unverified | `refundBankPartner.ts` sandbox adapter + idempotency |
| Notifications on confirmed events | Simulated | Transactional email gated on disbursement_confirmed |
| NOVARA as bank | Explicitly not claimed | Docs + UI copy |

## 6. Pricing (preserved)

| Tier | Amount | Status |
|------|--------|--------|
| TC personal / business | $300 / $399 | Implemented and verified (`test:pricing`) |
| TP per-return | $89 / $119 / $249 | Implemented and verified |
| Office annual | $899 / $1,199 / $1,499 | Implemented and verified |
| Office covered per-return NOVARA fee | $0 | Implemented and verified |
| Contradictions this pass | None vs `fees.ts` | Do not change without owner review |

## 7. Security & reliability

| Item | Status | Evidence |
|------|--------|----------|
| Tenant isolation / RBAC suites | Implemented and verified | `test:isolation`, permissions |
| Publish bundle PII gate | Implemented and verified | Fixed Landing placeholder leaking forbidden demo name |
| Staging security engines | Implemented but unverified as prod | Phase 6/7 |
| Independent AppSec | Blocked | `APPSEC_PENTEST_SCOPE.md` prepared |
| Production build | Implemented and verified | `npm run build` PASS this pass |
| Concurrent HTTP 100/1k/10k | Missing / Blocked | In-memory scale smoke ≠ concurrent load (`EXT-LOAD`) |

## 8. Final decisions

- **Synthetic public demo:** GO_SYNTHETIC_ONLY (unchanged)  
- **Real taxpayer commercial production:** **NO-GO**  
- **Do not** enable live filing, live money, DNS cutover, or irreversible migrations in this pass  

Machine-readable companion: `docs/PRODUCTION_READINESS_SCORECARD_2026-11-14.json`
