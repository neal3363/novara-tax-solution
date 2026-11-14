# NOVARA Tax OS — Independent Tax Software Company Charter

**Version:** `novara-independent-company-2025.1`  
**Date:** 2026-11-14 (America/Chicago)  
**Operating model:** Independent software company — **not** a franchise, white-label reseller, or dependent frontend for another tax software provider.

## Mandate

NOVARA Tax OS will develop, own, control, license, and operate a nationally available commercial tax software business comparable in scope to established providers (TurboTax, Drake, TaxSlayer, and peers) — as **NOVARA’s own product**, sold to:

- Individual taxpayers (TC)
- Independent tax preparers (TP)
- Tax offices (Office)

Tax professionals purchase and use **NOVARA software** to prepare and (when authorized) electronically file client returns. They are **customers/licensees**, not franchisees of a third-party engine.

## What NOVARA owns and operates

1. Proprietary AI-powered tax preparation software  
2. Federal and supported state calculation engines  
3. IRS-compliant forms, schedules, and validation systems  
4. Direct IRS MeF filing (subject to IRS authorization)  
5. IRS Software Developer and Transmitter provider roles (as applicable)  
6. TC / TP / Office product lines  
7. Subscription plans, software licensing, and per-return fees (`fees.ts` SSOT)  
8. Integrations with authorized refund-transfer banking partners (not Stripe-as-settlement)  
9. Secure cloud infrastructure, databases, APIs, document management  
10. Branded website, future iOS and Android applications  
11. Customer service, technical support, administration, software maintenance  
12. Nationwide distribution, tax-year updates, compliance maintenance, expansion  

## Explicit non-models

| Forbidden | Why |
|-----------|-----|
| White-label reseller of another vendor’s calc/efile stack | Would make NOVARA a dependent frontend |
| Franchise of another tax software company | Conflicts with independent IP ownership |
| Transmit-only via another commercial tax platform as the system of record | Conflicts with direct MeF / Transmitter goal |

Code invariants: `src/engine/company/independenceCharter.ts` (`assertNotResellerOrWhiteLabel`).

## Production posture

- Preserve existing application functionality and **approved pricing**.  
- Keep live production functions **disabled** until testing and authorizations complete.  
- Mock MeF ≠ official ATS. Staging state calc ≠ state e-file approval.  

## Related artifacts

- Capability gap matrix: `COMPANY_CAPABILITY_GAP_MATRIX.md`  
- Federal/state filing: `STATE_EFILE_AUTHORIZATION_MATRIX.md`  
- Owner requirements: `INDEPENDENT_COMPANY_OWNER_REQUIREMENTS.md`  
- Prior MeF pathway: `IRS_EFILE_AUTHORIZATION_PATHWAY.md`  
- External tracker: `EXTERNAL_APPROVAL_TRACKER.md`  
