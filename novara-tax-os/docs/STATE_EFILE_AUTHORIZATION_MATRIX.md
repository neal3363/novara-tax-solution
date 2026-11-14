# Federal & State Filing Authorization Matrix

**Rule:** Staging calculations ≠ electronic filing authorization.  
**Lock:** `nationwideStateFiling=false` until per-state approvals and production validation.

## Federal (IRS MeF)

| Requirement | Status | Tracker |
|-------------|--------|---------|
| Software Developer | Blocked — owner application | EXT-IRS-PROVIDER |
| Transmitter | Blocked — owner application | EXT-IRS-PROVIDER |
| EFIN / ETIN / Software ID | Blocked | EXT-IRS-EFIN-ETIN |
| Official ATS (Pub 1436) | Blocked — mock ≠ approval | EXT-IRS-ATS |
| Pub 4557 + AppSec | Scaffolded / blocked | EXT-APPSEC |

Official pathway: `IRS_EFILE_AUTHORIZATION_PATHWAY.md`.

## Priority states (Phase 11 calc present)

| State | Calc | Live e-file | Agency path |
|-------|------|-------------|-------------|
| TX | No PIT validated | N/A (no personal PIT) | — |
| FL | No PIT validated | N/A | — |
| CA | Staging PIT | Requires FTB software/e-file approval | https://www.ftb.ca.gov/tax-professionals/efile/ |
| NY | Staging PIT | Requires NYS e-file software approval | https://www.tax.ny.gov/bus/efile/ |
| IL | Staging PIT | Requires IDOR e-file/software approval | https://tax.illinois.gov/taxprofessionals/electronicfiling.html |

NYC/Yonkers and CA local add-ons remain out of current staging scope.

## Expansion states (placeholders)

GA, NC, PA, OH, MI, NJ, VA, AZ, WA, CO — **unsupported calc** today. Each needs:

1. Production-grade state calc engine  
2. State software developer / e-file testing  
3. Written approval evidence before any “supported” marketing claim  

Code: `src/engine/company/stateEfileMatrix.ts`.

## Business / entity federal e-file

Form 1065 / 1120-S / 1120 staging calcs exist; **business MeF / live business e-file OFF** (`liveBusinessEfile=false`). Separate ATS (Pub 5078) when business e-file is offered.
