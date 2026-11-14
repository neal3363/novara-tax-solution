# Remediation Workstream 2–4 — Tax Engine, Maximizer, State/Business

**Status:** Staging remediation complete for prioritized mapping gaps.  
**Production IRS cutover:** OFF  
**Taxpayer-visible IRS numbers:** OFF  
**Live e-file / nationwide state filing / business e-file:** OFF

## What was fixed (code)

| Gap | Change | Filing-ready? |
|-----|--------|---------------|
| HSA | Form 8889 staging + AGI adjustment via `hsaContribution` | No — HDHP eligibility review required |
| Energy | Partial Form 5695 + nonrefundable credit path | No — product categories incomplete |
| IRA / retirement | Pub 590-A deduction worksheet + AGI path | No — phaseout simplified; Roth/8606 incomplete |
| Education | Profile → Form 8863 when `education_credit_type` set | No — follow-up still required when type missing |
| QSS | Native `filingStatus: 'qss'` on TaxpayerProfile | Staging only |
| CA / NY / IL | Explicit worksheets (`computeCa540Worksheet`, `computeNyItWorksheet`, `computeIlFlatWorksheet`) | Staging; NYC/Yonkers excluded |
| Business | Existing depreciation + 1065 K-1 goldens covered by remediation harness | Live e-file OFF |

## Tests

```bash
npm run test:tax-remediation
```

Independent fixtures: `src/engine/irs/golden/remediationFixtures.ts`

## Maximizer (WS3) verification notes

- Discover / ask / avoid / recalc contracts unchanged (existing Phase 9 maximizerCompat).
- Energy / HSA / retirement remain **escalated** (not silently `fullyValidated`).
- Hypothetical (`potentialSavings`) stays separate from verified IRS staging numbers.
- UI / upload-first experience not modified.

## Explicit non-claims

- Does **not** claim nationwide state filing.
- Does **not** activate production cutover or MeF transmit.
- Does **not** substitute estimates for verified IRS filing output.
