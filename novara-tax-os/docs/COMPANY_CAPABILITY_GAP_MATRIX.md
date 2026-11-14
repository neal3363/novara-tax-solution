# Independent Company — Capability Gap Matrix

**Date:** 2026-11-14 (America/Chicago)  
**Goal:** Standalone commercial tax software company (not an app-only demo).  
**Pricing:** Unchanged — TC $300/$399 · TP $89/$119/$249 · Office $899/$1,199/$1,499.

## Pillar status

| # | Pillar | Status | Notes |
|---|--------|--------|-------|
| 1 | Proprietary AI tax prep | Staging | Speak-fill, docs, interview — prod PII plane gated |
| 2 | Federal + state calc engines | Staging | IRS isolated engine + 5-state models; cutover OFF |
| 3 | Forms / schedules / validation | Staging | MeF compose/validate; full IRS XSD packs pending |
| 4 | Direct IRS MeF | Simulated | Mock transmitter; live OFF |
| 5 | Software Developer + Transmitter | Scaffolded | Pathway ready; credentials blocked on owner |
| 6 | TC / TP / Office products | Implemented | Commercial license targets in-product |
| 7 | Subscriptions / licensing / fees | Implemented | SSOT + Stripe catalog; live charges OFF |
| 8 | Refund banking partners | Scaffolded | Sandbox only; partner agreement blocked |
| 9 | Secure cloud infra | Scaffolded | CF templates; not deployed |
| 10 | Web / iOS / Android | Staging / Missing native | Web responsive; store apps not built |
| 11 | Support / admin / maintenance | Scaffolded | Draft Help; staffed desk blocked |
| 12 | Nationwide distribution / updates | Scaffolded | Tax-year program defined; nationwide e-file OFF |

## Compared to peer software companies (directional)

| Capability | Peer class | NOVARA today |
|------------|------------|--------------|
| Own calc engines | Yes | Yes (staging; cutover gated) |
| Direct MeF as Transmitter | Yes | Pathway + mock; IRS auth pending |
| Sell to offices/preparers | Yes | Yes (TP/Office SKUs) |
| Multi-state e-file | Broad | Calc: 5 states; e-file: none live |
| Native mobile | Common | Not built |
| Filing-season support org | Required | Not staffed |
| Counsel Privacy/ToS | Required | Draft only |

## What code can finish without owner

- Independence charter + commercial SKU assertions  
- State e-file requirement matrix (documentation)  
- Support / mobile / registration checklists  
- Keep all production locks OFF  
- Continue federal/state staging engines and MeF offline work  

## What only owner / external parties can finish

See `INDEPENDENT_COMPANY_OWNER_REQUIREMENTS.md` and `EXTERNAL_APPROVAL_TRACKER.md`.
