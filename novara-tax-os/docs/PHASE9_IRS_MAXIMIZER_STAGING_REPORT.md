# Phase 9 — IRS Tax Engine & AI Refund Maximizer Staging Integration

**Status:** STOPPED BEFORE PRODUCTION ENGINE CUTOVER  
**Checkpoint:** `checkpoint/pre-phase9-4bf9`  
**Branch:** `cursor/phase9-irs-maximizer-staging-4bf9`

Synthetic profiles only. Homepage, Maximizer UX, pricing ($300/$399), roles, client records, live IRS filing, and production security enforcement unchanged / OFF.

## 1. IRS engine integration status

Staging adapter delivered under `src/engine/irs/phase9/`:

- Maps `TaxpayerProfile` → `IrsReturnInput` (TY2022–2025)
- Runs `computeIrsFederalReturn` in parallel with Maximizer
- Returns internal `irsVerifiedNumbers` — **not** wired into taxpayer UI
- Flags: `activateCutover=false`, `taxpayerVisible=false`, `showIrsInProductionUi=false`
- Demo `runBenefitOptimization` remains the taxpayer-facing path (rollback)

## 2. AI Refund Maximizer compatibility

PASS — interface/discovery preserved:

- Identify credits/deductions, follow-up questions, recalc on answers
- Hypothetical (`potentialSavings`) vs verified (`verifiedSavings`) retained
- No hardcoded refunds; report shape unchanged
- UI components not modified

## 3. Staging calculation test results

`npm run test:irs-phase9` — **failed=0**

Covered: single, MFJ, MFS, HOH, QSS-proxy, dependents, CTC, EITC, education, CDCC, business/SE, rental/capital-gains flags, itemized, TY2022–2025, amended flag, unsupported year.

## 4. Remaining calculation differences

Dual-run suite invents expected demo↔IRS deltas (demo discovery uplift vs IRS liability). Differences are inventoried in `remainingDifferences` — not silently zeroed. IRS numbers stay internal.

## 5. Unsupported tax situations

Flagged when present, e.g.:

- `unsupported_tax_year` outside 2022–2025
- Education credit needs follow-up
- Energy / HSA / retirement partial mapping
- IRS `unsupportedCases[]` surfaced as `irs:…`
- Returns with unsupported flags are **not** `fullyValidated`

## 6. Files changed

**Added:** `src/engine/irs/phase9/*`, `api/security/irs-staging.ts`, `scripts/test-irs-phase9-staging.mjs`, `docs/PHASE9_IRS_MAXIMIZER_STAGING_REPORT.md`

**Modified:** `irs/index.ts`, `cutoverCriteria.ts` (maximizer-compat → partial), `maximizerMigrationPlan.ts` (adapter-layer → planned), `vite.config.ts`, `package.json`

## 7. Regression results

| Suite | Result |
|-------|--------|
| `test:irs-phase9` | PASS |
| `build` | PASS |
| `test:pricing` | PASS |
| `test:refund-max` | PASS |
| `test:irs-golden` | PASS |
| `test:phase7-staging` | PASS |
| `test:publish-security` | PASS |
| `test:irs-mef` | PASS |

## 8. Rollback readiness

`verifyRollbackReadiness()` PASS:

- Demo engine callable
- Dual-run default OFF
- `mayShowIrsToTaxpayer()=false`
- `cutoverReady()=false`
- Git: `checkpoint/pre-phase9-4bf9`

## 9. Remaining production blockers

- Human/compliance approval (`human-approval` still blocked)
- Taxpayer-visible IRS display forbidden
- Production cutover forbidden
- Live IRS filing OFF
- Production security enforcement OFF
- Full form-gap / parity gate still required before cutover
- No real taxpayer processing

---

**STOP:** Do not process real taxpayer returns, enable live IRS filing, or deploy production engine cutover.
