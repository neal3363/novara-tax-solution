# NOVARA TAX OS — INDEPENDENT COMPANY OWNER REQUIREMENTS

**Audience:** Owner / Responsible Official  
**Objective:** Establish NOVARA as an independent, nationally available tax software company — not an app demo or reseller.  
**Date:** 2026-11-14 (America/Chicago)  
**Pricing preserved:** TC $300/$399 · TP $89/$119/$249 · Office $899/$1,199/$1,499  

Companion charter: `INDEPENDENT_TAX_SOFTWARE_COMPANY_CHARTER.md`  
Prior MeF-focused report remains valid: `OWNER_AUTHORIZATION_AND_LAUNCH_REQUIREMENTS.md`

---

## 1. IRS approvals (federal)

| You must complete | Evidence |
|-------------------|----------|
| e-Services identity + e-file Application as **Software Developer + Transmitter** | IRS application / acceptance |
| Suitability for Principals / Responsible Officials | Fingerprints / suitability clearance |
| NOVARA **EFIN**, Test ETIN, Production ETIN, Software IDs | Secrets vault (never git) |
| Official **ATS** (Pub 1436) — not mock | IRS acceptance records |
| Transmitter communication test → Production status | IRS status update |
| Pub 4557 safeguarding program | Documented controls |

Office/preparer EFINs do **not** authorize NOVARA corporate transmission.

---

## 2. Federal and state filing requirements

| Layer | Requirement |
|-------|-------------|
| Federal individual | MeF Software Developer + Transmitter + ATS |
| Federal business (when offered) | Pub 5078 ATS / business MeF; keep `liveBusinessEfile` OFF until done |
| States with staging calc (CA/NY/IL) | State DOR/FTB software/e-file approval before live e-file |
| TX/FL personal | No personal PIT e-file; do not overclaim business filings |
| All other states | Calc + e-file approval before “supported” claims |
| Nationwide claim | Forbidden while `nationwideStateFiling=false` |

Details: `STATE_EFILE_AUTHORIZATION_MATRIX.md`.

---

## 3. Business registrations

| Registration | Blocks launch? |
|--------------|----------------|
| Legal entity + EIN in good standing | Yes |
| Beneficial ownership / KYC (Stripe + bank) | Yes |
| Cyber + E&O insurance | Yes (before scale PII) |
| Trademark (recommended) | No |
| Domain + Cloudflare | Yes (for official production) |
| Business email + ESP | Yes |
| Helpdesk vendor | Yes |
| Apple Developer / Google Play | No (web can launch first) |
| Search Console / GA4 | No |

Code checklist: `businessRegistrationChecklist()`.

---

## 4. Third-party agreements

| Counterparty | Purpose | Note |
|--------------|---------|------|
| Stripe | Software billing only | **Not** refund settlement |
| Refund-transfer bank | IRS refund → fees → client payout | Required for bank products |
| Cloudflare | Production host / DNS / WAF | Owner-approved deploy only |
| ESP | Transactional email | |
| AppSec firm | Pentest | Critical/high closed before live PII |
| Counsel | Privacy / ToS / trademark | Draft pages insufficient |

---

## 5. Operating expenses (planning bands, USD)

### One-time / annual

| Item | Band |
|------|------|
| Entity / counsel setup | 500–5,000+ |
| Trademark | 1,000–5,000+ |
| AppSec pentest | 5,000–40,000+ |
| Privacy/ToS counsel | 2,000–25,000+ |
| Insurance (cyber/E&O) | 3,000–25,000+/yr |
| Apple / Play | 99/yr · 25 once |
| IRS fingerprint / fees | Per IRS schedule |

### Monthly production band

See `OPERATING_COST_ESTIMATES.md`: roughly **~$280 – $1,100 – $4,000+** before Stripe % and banking partner fees. Filing-season support labor is additional and often the largest opex line.

---

## 6. Owner responsibilities vs developer

### You (signature / payment / identity)

1. IRS e-file Application + suitability  
2. State e-file applications for each live state  
3. Stripe live + banking partner contracts  
4. Domain, Cloudflare, email, helpdesk accounts  
5. AppSec engagement + remediation budget  
6. Counsel Privacy/ToS  
7. Insurance binders  
8. Apple/Google enrollments (when mobile ships)  
9. Written go-live authorization for every production lock  

### Developer (without your IRS/bank credentials)

1. Proprietary product, calc, MeF **offline** / mock paths  
2. Independence charter + commercial SKU enforcement  
3. State/federal requirement matrices  
4. Cloudflare templates, Stripe price mapping, sandbox settlement  
5. Tests, fences, documentation  
6. **Never** enable live MeF / payments / nationwide state / production publish without you  

---

## 7. Commercial positioning (locked in code)

- Sells software licenses to TC, TP, and Office  
- `isFranchise=false` · `isWhiteLabelReseller=false`  
- Calc engine owner = NOVARA  
- Transmitter path = NOVARA direct IRS MeF when authorized  

---

## 8. Immediate owner sequence

1. Confirm legal entity + EIN match future IRS e-file Application.  
2. Start IRS Software Developer + Transmitter application.  
3. Shortlist refund banking partners; create Stripe Price IDs (charges off).  
4. Budget AppSec, counsel, insurance, filing-season support.  
5. Do not authorize live transmit, DNS cutover, or nationwide claims until gates pass.  

---

## Related code

- `src/engine/company/*`  
- Harness: `npm run test:independent-company`  
