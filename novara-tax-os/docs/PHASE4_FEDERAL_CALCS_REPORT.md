# Phase 4 — Complete Federal Tax Calculations (Isolated)

**Status:** STOPPED BEFORE ENGINE CUTOVER  
**Checkpoint:** `checkpoint/pre-phase4-4bf9`  
**Branch:** `cursor/phase4-federal-calcs-4bf9`  
**Production-ready claim:** **false** for all new forms

## 1. Calculations completed (isolated-validated / isolated-partial)

| Form | Status | Notes |
|------|--------|-------|
| Form 8962 | isolated-validated | SLCSP benchmark, applicable %, APTC repayment limit |
| Form 8995-A | isolated-validated | Below / phase-in / above; SSTB; W-2 / UBIA |
| Form 8863 | isolated-validated | AOTC (40% refundable) + LLC + phaseouts |
| Schedule B | isolated-validated | Interest / dividends / foreign flags |
| Schedule D | isolated-validated | ST/LT net, $3k loss limit, QD/LTCG worksheet themes |
| Schedule E | isolated-partial | Rental/royalty/K-1; Form 8582 not complete |
| Form 6251 AMT | isolated-validated | Std-ded/SALT add-back; 26%/28% TMT |
| Form 8960 NIIT | isolated-validated | 3.8% of lesser of NII or MAGI excess |
| Form 1040-X | isolated-validated | Original vs corrected engine deltas; UI unchanged |

## 2. Calculations still unsupported

- Form 8582 full passive activity limitation worksheet
- Schedule D 28% rate gains / unrecaptured §1250 / Form 8949 detail
- Full AMT preference-item schedule (ISO, etc.)
- Multi-trade QBI aggregation beyond single business inputs
- UI / Maximizer / production wiring of any of the above

## 3. Golden-test results

| Metric | Result |
|--------|--------|
| Combined fixtures | 23 |
| Field checks passed | **137** |
| Field checks failed | **0** |
| Command | `npm run test:irs-phase4` / `npm run test:irs-golden` |

Phase 4 fixtures cover: all five FS (via Phase 3+), PTC, education, capital gains, SE+QBI, rental, itemized, NIIT+AMT, multi-dependent CTC, prior-year LLC, 1040-X (unit test).

## 4. Official IRS sources

Documented in `phase4Params.ts`, per-form `sources` arrays, and fixture `source`/`derivation` fields:

- Form 8962 / Pub 974; HHS FPL 2022–2025
- Form 8995-A Instructions
- Form 8863 Instructions
- Schedule B / D / E Instructions; QD/LTCG worksheet
- Form 6251 + Rev. Proc. AMT amounts
- Form 8960 / IRC §1411
- Form 1040-X Instructions
- Rev. Proc. 2021-45 / 2022-38 / 2023-34 / 2024-40

## 5. Demo-versus-IRS differences (dual-run, internal)

| Profile | Demo | IRS | Δ |
|---------|-----:|----:|--:|
| 2025 single wage earner | 700 | 938 | −238 |
| 2024 MFJ wage earners | 1,800 | 2,168 | −368 |
| 2023 HOH + CTC child | −40 | 3,699 | −3,739 |
| 2022 single + SE | −3,719 | −3,273 | −446 |

Flag default OFF; `mayShowIrsToTaxpayer()` always false; Maximizer not connected.

## 6. Files changed / added

**Added:** `phase4Params.ts`, `taxMath.ts`, `forms/*` (8962, 8995A, 8863, Sch B/D/E, 6251, 8960, 1040x), `golden/phase4Fixtures.ts`, `scripts/test-irs-phase4.mjs`, `docs/PHASE4_FEDERAL_CALCS_REPORT.md`

**Modified:** `types.ts`, `federalReturn.ts`, `index.ts`, `dualRun.ts`, `golden/*`, `gaps/*`, `package.json`

## 7. Regression-test results

| Suite | Result |
|-------|--------|
| `test:irs-phase4` | PASS |
| `test:irs-golden` | PASS |
| `test:irs-engine` | PASS |
| `test:pricing` | PASS ($300/$399) |
| `test:refund-max` | PASS |
| `test:benefits` | PASS |

## 8. Remaining launch blockers

- IRS engine still not authorized for real taxpayer data or production UI
- Schedule E incomplete without Form 8582
- Dual-run must stay internal_only
- No MeF production filing path
- Cutover / Maximizer wiring explicitly blocked

## 9. Recommendation for next phase

**Phase 5 (approval-gated):** (1) Form 8582 + remaining Schedule D preference items; (2) expand golden corpus for excess-APTC repayment and 8995-A above-threshold wage limits; (3) staff-only dual-run shadow UI; (4) parity gate criteria; (5) only then consider Maximizer adapter — still no automatic cutover.

---

**STOP:** No deploy, no engine switch, no real taxpayer data, no pricing/homepage/Maximizer UI changes.
