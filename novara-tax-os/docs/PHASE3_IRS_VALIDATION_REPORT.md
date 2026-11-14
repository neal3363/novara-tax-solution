# Phase 3 — IRS Validation & Dual-Run Preparation

**Status:** STOPPED BEFORE ENGINE CUTOVER  
**Authorization:** Golden tests + dual-run development only  
**Branch:** `cursor/phase3-golden-dual-run-4bf9`  
**Base includes:** PR #38 merge commit `62983f6` (Phase 2 IRS modules)

## 1. Golden tests — passed and failed

| Metric | Result |
|--------|--------|
| Fixtures | 14 |
| Field checks passed | 75 |
| Field checks failed | **0** |
| Fixture failures | **0** |

Coverage: TY2022–2025; all five filing statuses (Single, MFJ, MFS, HOH, QSS) in TY2025; bracket boundaries; SALT-capped itemized; Schedule SE; CTC/ACTC (Sch. 8812); prior-year std ded/brackets.

Command: `npm run test:irs-golden`

## 2. IRS sources and verification evidence

Expected values are **hand-derived** in `src/engine/irs/golden/fixtures.ts` with per-fixture `source` + `derivation` worksheets. Authoring uses a local `bracketTax` helper for documentation only — tests assert literal `expected` fields against `computeIrsFederalReturn`, never by copying engine output into fixtures.

Primary citations (also in `src/engine/irs/sources.ts`):

- Rev. Proc. 2021-45 / 2022-38 / 2023-34 / 2024-40 (brackets & standard deductions)
- Form 1040 Instructions (by year)
- Schedule 8812 Instructions (CTC/ACTC)
- Schedule SE Instructions (92.35% NESE)
- IRC §164(b)(6) SALT cap

## 3. Demo-versus-IRS calculation differences (synthetic, internal)

Dual-run on `sampleProfilesForComparison()` (flag ON for tests only):

| Profile | Demo projected refund | IRS refund/balance | Δ (demo − IRS) |
|---------|----------------------:|-------------------:|---------------:|
| 2025 single wage earner | 700 | 938 | −238 |
| 2024 MFJ wage earners | 1,800 | 2,168 | −368 |
| 2023 HOH + one CTC child | −40 | 3,699 | −3,739 |
| 2022 single + SE | −3,719 | −3,273 | −446 |

Largest gap: HOH + CTC — demo benefit optimizer credit/discovery path diverges from IRS Sch. 8812/EITC arithmetic. Expected until migration; IRS remains taxpayer-hidden.

## 4. Remaining unsupported calculations

Proposals in `src/engine/irs/gaps/proposals.ts`; stubs return `supported: false` only:

| Form | Status |
|------|--------|
| Form 8962 (full) | partial (simplified PTC only) |
| Form 8995-A | partial (8995 simplified only) |
| Form 8863 | unsupported |
| Schedules B, D, E | unsupported |
| Additional 1040 (NIIT, AMT, 8959, etc.) | partial / unsupported |
| Form 1040-X recalc via IRS engine | stub_proposed |

**Approval required** before changing protected modules (`benefitOptimizer`, fees, UI).

## 5. Dual-run implementation status

| Item | Status |
|------|--------|
| Feature flag default OFF | Done (`DEFAULT_DUAL_RUN_FLAG`) |
| Audience hard-locked `internal_only` | Done |
| `mayShowIrsToTaxpayer()` always `false` | Done |
| Line diffs: AGI, TI, tax, credits, SE, WH, refund/balance | Done |
| Taxpayer UI wiring | **Not done (by design)** |

Module: `src/engine/irs/dualRun.ts`

## 6. Files added or modified

**Added**

- `src/engine/irs/golden/types.ts`
- `src/engine/irs/golden/fixtures.ts`
- `src/engine/irs/golden/runGolden.ts`
- `src/engine/irs/dualRun.ts`
- `src/engine/irs/gaps/proposals.ts`
- `src/engine/irs/gaps/stubs.ts`
- `src/engine/irs/maximizerMigrationPlan.ts`
- `scripts/test-irs-golden-dual-run.mjs`
- `docs/PHASE3_IRS_VALIDATION_REPORT.md`

**Modified**

- `src/engine/irs/index.ts` (exports)
- `package.json` (`test:irs-golden`)

## 7. Regression test results

| Suite | Result |
|-------|--------|
| `test:irs-golden` | PASS |
| `test:irs-engine` (Phase 2) | PASS |
| `test:pricing` | PASS (TC $300 / $399) |
| `test:refund-max` | PASS (homepage video assets + Maximizer) |
| `test:benefits` | PASS |

## 8. Proposed engine migration steps

See `maximizerMigrationPlan.ts`. Summary:

1. Golden pass (Phase 3 — done)
2. Internal dual-run (Phase 3 — done)
3. Close form gaps with independent fixtures (approval)
4. Read-only IRS adapter behind Maximizer (approval; keep discovery)
5. Staff-only shadow mode
6. Parity gate
7. **Cutover — blocked; not Phase 3**

Maximizer interface, question flow, and behavior are unchanged.

## 9. Security / compliance blockers

- IRS engine **not** authorized for real taxpayer data or production UI.
- Dual-run must remain `internal_only` until cutover approval.
- Full Form 8962 / 8995-A / 8863 / Schedules B/D/E must not be represented as complete.
- MeF / production filing path unchanged; sandbox posture from prior phases still applies.
- No pricing or role changes in this phase.

---

**STOP:** No production deploy, no real taxpayer data acceptance, no pricing changes, no engine cutover.
