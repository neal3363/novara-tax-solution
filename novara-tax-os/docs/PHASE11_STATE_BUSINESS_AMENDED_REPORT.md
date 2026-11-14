# Phase 11 — State, Business & Amended Tax Returns

**Status:** STOPPED BEFORE PRODUCTION ACTIVATION  
**Checkpoint:** `checkpoint/pre-phase11-4bf9`  
**Branch:** `cursor/phase11-state-business-amended-4bf9`  
**Version:** `phase11-returns-2025.1`  
**As of:** 2026-11-14 00:35 America/Chicago

Isolated staging modules only. Synthetic fixtures. Homepage, Maximizer, pricing ($300/$399), roles, client records, live IRS filing, live payments/banking, and interview UX unchanged. Nationwide state filing, business e-file, and AI wiring to interview remain hard-OFF.

## 1. States implemented and validated

Prioritized from interview `filing_state` choices + flat-rate staging candidate:

| State | Status | Notes |
|-------|--------|-------|
| **TX** | `validated_no_income_tax` | No personal income tax |
| **FL** | `validated_no_income_tax` | No personal income tax |
| **CA** | `staging_validated` | PIT brackets / std deduction; 540NR allocation simplified |
| **NY** | `staging_validated` | PIT brackets; IT-203 allocation simplified; NYC/Yonkers not included |
| **IL** | `staging_validated` | Flat 4.95% + exemption allowance |
| All others | `unsupported` | Explicit unsupported-state detection |

Years: 2022–2025. Features: residency / nonresident / part-year, multi-state allocation, withholding, refund/balance due, credit stubs, tax-year rules.

**Do not claim nationwide state filing support.**

## 2. Business forms implemented

| Form | Capability | Live e-file |
|------|------------|-------------|
| **Form 1065** | Partnership ordinary income, expenses, depreciation, K-1s | OFF |
| **Form 1120-S** | S-corp ordinary income, K-1s to shareholders | OFF |
| **Form 1120** | C-corp 21% entity tax, credits, estimated payments | OFF |
| **Schedule K-1** | Generated from 1065 / 1120-S ownership % | OFF |
| Depreciation | Sec. 179 + half-year MACRS stub (Pub 946 themes) | OFF |
| Estimated tax | Simplified quarterly / safe-harbor stub | OFF |

Personal and business calculations remain separated. No MeF business schema activation.

## 3. Amended-return capabilities

- Form 1040-X column A/B/C via existing isolated engine + Phase 11 wrapper
- Original-versus-amended comparisons (income / deductions / credits themes)
- Corrected income, deductions, credits → refund/balance adjustment
- Prior-year amendment rules (TY2022–2025; out-of-range rejected)
- **Required taxpayer authorization** (blocked without it)
- Amendment audit history
- **Original filed returns preserved** (first snapshot never overwritten)

## 4. Golden-test results

`npm run test:returns-phase11` — **failed=0**

Covered: TX/FL/CA/NY/IL, unsupported AK, prior-year CA 2023, part-year NY, CA nonresident allocation, 1065/1120-S/1120, depreciation Sec.179, 1040-X wage correction, auth block, original preserve, AI recognition (suggested-only), Phase 7 API authz.

## 5. Unsupported tax situations

- States other than TX/FL/CA/NY/IL
- Tax years outside 2022–2025
- CA Mental Health Services Tax / local add-ons; NY NYC/Yonkers
- Full Form 540NR / IT-203 worksheets (simplified ratio allocation)
- S-corp built-in gains / ENPI; consolidated C-corps
- Full Form 4562 / all MACRS conventions
- Business MeF XML / e-file
- Interview / Maximizer wiring (adapters isolated only)

## 6. Files created or modified

**Added:** `src/engine/returns/phase11/**` (config, state, business, amended, aiAdapter, golden), `api/security/returns-phase11.ts`, `scripts/test-returns-phase11.mjs`, `docs/PHASE11_STATE_BUSINESS_AMENDED_REPORT.md`

**Modified:** `package.json`, `tsconfig.app.json` (exclude phase11), `vite.config.ts` (API route)

## 7. Regression results

| Suite | Result |
|-------|--------|
| `test:returns-phase11` | PASS |
| `build` | PASS |
| `test:pricing` | PASS |
| `test:refund-max` | PASS |
| `test:phase7-staging` | PASS |
| `test:payments-phase10` | PASS |
| `test:publish-security` | PASS |
| `test:irs-golden` | PASS |

## 8. Required IRS/state approvals

Before production:

1. State DOR/FTB/Tax Dept schema & e-file authorizations per state
2. IRS MeF business return schemas (1065 / 1120-S / 1120) + EFIN/provider auth
3. Compliance review of CA/NY/IL tables against official TY publications each year
4. Approval to wire AI adapters into interview (explicit — currently OFF)
5. Approval before any real taxpayer amended / state / business filing

## 9. Remaining launch blockers

- Nationwide state coverage incomplete by design
- Business e-file OFF; personal MeF live transmit OFF
- IRS calc cutover OFF; production security enforcement OFF
- Live payments / banking OFF (Phase 10)
- AI adapters not approved for interview/Maximizer wiring
- Full state nonresident worksheets & local taxes incomplete
- No real taxpayer processing

## 10. Phase 12 readiness recommendation

**Conditional ready for Phase 12 planning** after Phase 11 merge, provided Phase 12 remains isolated/staging and does not activate production filing, payments, banking, or interview cutover.

Suggested Phase 12 focus (recommendation only): deepen validated-state worksheets (CA 540NR, NY IT-203), expand golden fixtures against published examples, and prepare (but not activate) business MeF schema stubs — still STOP before production.

---

**STOP:** Do not process real taxpayer returns, enable live IRS filing, or activate production banking and payment systems.
