# NOVARA Tax OS — IRS e-File Authorization Pathway

**Status:** Documentation + offline scaffolding only.  
**Live IRS transmission:** OFF  
**Official ATS:** NOT completed  
**Do not treat mock MeF acknowledgments as IRS approval.**

## Intended operating model

NOVARA Tax OS will operate as an **independent IRS-authorized tax software provider** that:

1. Formats federal returns to IRS Modernized e-File (MeF) schemas (**Software Developer**).
2. Transmits returns directly to IRS MeF (**Transmitter**), without depending on another commercial tax platform.
3. May additionally offer taxpayer self-preparation (**Online Provider**) — optional, secondary.

**Critical rule:** An office’s or preparer’s EFIN does **not** authorize NOVARA (the software company) to transmit as Software Developer / Transmitter.

## Recommended IRS provider roles

| Role | Required for direct MeF? | Why |
|------|--------------------------|-----|
| Software Developer | **Yes** | Formats returns; must pass ATS; receives Test ETIN |
| Transmitter | **Yes** | Sends electronic return data to IRS; Production ETIN after communication testing |
| Online Provider | Optional | If taxpayers self-prepare online through NOVARA |
| Electronic Return Originator (ERO) | Separate | Typical for TP/Office client originations — not a substitute for NOVARA corporate roles |

Source of truth in code: `src/engine/irs/mef/authorization/irsProviderRoles.ts`

## Identifiers NOVARA needs

| Identifier | Required | Notes |
|------------|----------|-------|
| EFIN (NOVARA legal entity) | Yes | Assigned via IRS e-file Application |
| ETIN — Software Developer (Test) | Yes | Remains in Test status for year-round ATS |
| ETIN — Transmitter (Production) | Yes | After communication testing + IRS status update |
| Software Identification Number(s) | Yes | Per tax year / software package |
| Application System ID (A2A) | Yes (if A2A) | Automated Enrollment before A2A transmissions |
| Office/preparer EFIN | No (for corporate MeF) | Does not authorize NOVARA transmission |
| PTIN | Preparers only | Not a Transmitter substitute |

## Owner e-Services checklist (ordered)

1. Create/verify Login.gov or ID.me for IRS e-Services.
2. Start/update IRS e-file Application for the **NOVARA legal entity**.
3. Select **Software Developer** + **Transmitter** (and Online Provider if applicable).
4. Complete suitability checks for Principals / Responsible Officials (fingerprints as required).
5. Receive IRS-assigned **EFIN** and **ETIN(s)**; store secrets outside git.
6. Register **Software ID(s)**; complete ATS questionnaires.
7. Enroll **A2A Application System IDs** (Pub 4164) if using Application-to-Application.
8. Complete **Pub 1436** individual ATS scenarios with official IRS responses.
9. Complete Transmitter **communication test**; wait for IRS to move Forms Transmission Status to Production.
10. Implement **Pub 4557** safeguarding; complete independent AppSec before live returns.

Code checklist: `ownerEservicesApplicationChecklist()` in `irsProviderRoles.ts`.

## MeF enrollment, testing, and production

| Stage | What happens | Proof required |
|-------|----------------|----------------|
| Application | e-file Application + suitability | IRS-assigned EFIN/ETIN |
| ATS (Software Developer) | Pub 1436 scenarios via Test ETIN | Official IRS acceptances (not mock) |
| Communication test (Transmitter) | Transmitter path validation | IRS updates transmission status |
| Production | Live MeF with Production ETIN | Human launch auth + all locks still gated until owner says go |

## Official IRS documentation links

| Doc | URL | Purpose |
|-----|-----|---------|
| Pub 3112 | https://www.irs.gov/pub/irs-pdf/p3112.pdf | Provider options, suitability, EFIN/ETIN |
| Pub 4164 | https://www.irs.gov/pub/irs-pdf/p4164.pdf | MeF for Software Developers & Transmitters |
| Pub 1436 | https://www.irs.gov/pub/irs-pdf/p1436.pdf | Individual ATS guidelines |
| Pub 5078 | https://www.irs.gov/pub/irs-pdf/p5078.pdf | Business ATS guidelines |
| Pub 4163 | https://www.irs.gov/pub/irs-pdf/p4163.pdf | Business MeF information |
| Pub 1345 | https://www.irs.gov/publications/p1345 | Authorized e-file Providers (individual) |
| Pub 4557 | https://www.irs.gov/pub/irs-pdf/p4557.pdf | Safeguarding taxpayer data |
| e-file Provider Services | https://www.irs.gov/tax-professionals/e-file-provider-services | e-Services application access |
| MeF ATS page | https://www.irs.gov/e-file-providers/modernized-e-file-mef-assurance-testing-system-ats | ATS windows / known issues |
| MeF publications index | https://www.irs.gov/e-file-providers/modernized-e-file-mef-user-guides-and-publications | Schemas & guides |
| Software Developers fact sheet | https://www.irs.gov/e-file-providers/software-developers-technical-fact-sheet | ETIN / Software ID overview |

Full typed list: `OFFICIAL_IRS_EFILE_LINKS` in `irsProviderRoles.ts`.

## What developers can do without owner IRS credentials

- Offline XML compose / structural validation
- Form 8879 gates, duplicate prevention, reject/resubmit workflows
- Mock ATS sandbox (explicitly labeled simulated)
- Official ATS gate that **refuses** to claim completion from mock ACKs
- Pub 1436 scenario catalog + synthetic fixtures (awaiting official scenario IDs each season)

## What is blocked until owner completes IRS steps

- Official ATS transmission
- Production ETIN use
- Live return transmission
- Claiming IRS authorization or ATS completion
