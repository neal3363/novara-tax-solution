# Phase 5 — Form 8582, Capital Gains/AMT, Shadow Testing, Cutover Criteria

**Status:** STOPPED BEFORE ENGINE CUTOVER  
**Checkpoint:** `checkpoint/pre-phase5-4bf9`  
**Branch:** `cursor/phase5-8582-shadow-cutover-4bf9`  
**productionReady:** false for all forms  
**cutoverReady():** false (by design)

## 1. Form 8582 implementation status

**isolated-validated** (not production-ready)

- Rental real estate special allowance ($25,000 / $12,500 MFS lived-apart)
- MAGI phaseout $100k–$150k (MFS $50k–$75k)
- Passive income offset of losses
- Suspended PAL carryforwards
- Entire-interest disposition release
- Unsupported-case flags (PTP netting, nonpassive conversion with prior PAL)

Module: `src/engine/irs/forms/form8582.ts`

## 2. Schedule E implementation status

**isolated-validated** with Form 8582 integration (not production-ready)

- Rental/royalty net → Form 8582 activities
- K-1 ordinary (passive/nonpassive)
- AGI inclusion after limitation
- Suspended loss reporting
- Not classified production-complete (PTP / REP hour tests remain limited)

## 3. Capital gains and AMT improvements

| Area | Status |
|------|--------|
| Form 8949 transaction aggregation | isolated-validated |
| Schedule D Tax Worksheet themes | 0/15/20% + §1250@25% + collectibles@28% |
| Capital loss carryforwards | tracked on Schedule D result |
| AMT preferences | ISO, PAB interest, depreciation, etc. add-backs |
| Still unsupported | §1202 QSBS, installment sales, full depletion/IDC, PTP worksheets |

## 4. Golden-test results

| Metric | Result |
|--------|--------|
| Combined fixtures | 36 |
| Field checks passed | **215** |
| Field checks failed | **0** |
| Command | `npm run test:irs-phase5` |

## 5. Shadow-test comparison results

Internal-only (`qa-shadow-1`); unauthorized IDs rejected.

| Profile | Δ (demo − IRS) refund | Likely cause |
|---------|----------------------:|--------------|
| 2025 single wage earner | −238 | Demo vs IRS tax/credit models |
| 2024 MFJ | −368 | same |
| 2023 HOH + CTC | −3,739 | Discovery credits vs Sch 8812/EITC |
| 2022 SE | −446 | SE/QBI model divergence |

Taxpayer visible: **false**. Dual-run flag reset OFF after suite.

## 6. Remaining unsupported tax situations

- PTP full Form 8582 worksheets
- Real estate professional hour/material-participation tests
- §1202 QSBS exclusion; installment-sale timing
- Full AMT depletion / intangible drilling / FTC AMT limitation detail
- Maximizer / UI / MeF production wiring

## 7. Files created or modified

**Added:** `forms/form8582.ts`, `forms/form8949.ts`, `golden/phase5Fixtures.ts`, `shadowTesting.ts`, `cutoverCriteria.ts`, `scripts/test-irs-phase5.mjs`, `docs/PHASE5_8582_SHADOW_REPORT.md`

**Modified:** `scheduleE.ts`, `scheduleD.ts`, `form6251Amt.ts`, `federalReturn.ts`, `types.ts`, `phase4Params.ts`, `golden/*`, `gaps/proposals.ts`, `index.ts`, `package.json`, phase4 test Sch E call

## 8. Regression test results

| Suite | Result |
|-------|--------|
| test:irs-phase5 | PASS |
| test:irs-phase4 | PASS |
| test:irs-golden | PASS |
| test:irs-engine | PASS |
| test:pricing | PASS ($300/$399) |
| test:refund-max | PASS |
| test:benefits | PASS |

Homepage/video/branding/roles/Maximizer/interview unchanged.

## 9. Proposed cutover acceptance criteria

See `cutoverCriteria.ts`. Required categories:

1. Official IRS calculation accuracy (≥99% golden; 0 critical)
2. Required form coverage (validated or waived)
3. Tax-year isolation
4. Regression green on cutover candidate
5. Unsupported-case detection
6. Maximizer compatibility (adapter approval)
7. Security readiness (synthetic shadow only)
8. Rollback kill-switch
9. **Explicit human product + compliance approval**

`cutoverReady()` is **false**. Passing tests alone do not authorize cutover.

## 10. Remaining production launch blockers

- No taxpayer exposure of IRS engine
- No real taxpayer data in shadow corpus
- No MeF production filing
- Cutover governance not approved
- Some complex PAL/CG/AMT cases still unsupported

---

**STOP:** No deploy, no engine switch, no real taxpayer data, no e-filing activation.
