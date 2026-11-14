# NOVARA TAX OS — OWNER AUTHORIZATION & LAUNCH REQUIREMENTS

**Audience:** NOVARA owner / Responsible Official  
**Purpose:** Exact actions requiring your signature, payment, identity, or vendor agreements — separate from developer work.  
**Date:** 2026-11-14 (America/Chicago)  
**Pricing:** Unchanged — TC $300/$399 · TP $89/$119/$249 · Office $899/$1,199/$1,499 (see `src/data/fees.ts`)  
**Production locks:** Remain OFF until you authorize go-live.

---

## 1. IRS registrations and applications you must personally complete

| # | Action | Where | Notes |
|---|--------|-------|-------|
| 1 | Identity proof Login.gov / ID.me for IRS e-Services | IRS e-Services | Responsible Official / Principal |
| 2 | IRS e-file Application for **NOVARA legal entity** | e-file Provider Services | Select **Software Developer** + **Transmitter** (+ Online Provider if self-prep) |
| 3 | Suitability / fingerprints as required | Per Pub 3112 | Principals & Responsible Officials |
| 4 | Record assigned **EFIN** and **ETIN(s)** | Secure secrets vault — never git | Test ETIN (Software Developer) ≠ Production ETIN (Transmitter) |
| 5 | Register **Software ID(s)** per tax year / product | e-file Application | Required for ATS questionnaires |
| 6 | A2A Automated Enrollment (Application System IDs) | Per Pub 4164 | If transmitting Application-to-Application |
| 7 | Authorize official **ATS** window participation | MeF ATS | Pub 1436 individual scenarios |
| 8 | Complete Transmitter communication test | IRS | Wait for Forms Transmission Status → Production |
| 9 | Confirm Pub 4557 safeguarding program | Internal + counsel | Before live taxpayer data |

**Official links:** `docs/IRS_EFILE_AUTHORIZATION_PATHWAY.md` and `OFFICIAL_IRS_EFILE_LINKS` in code.

**Do not assume** any existing office/preparer EFIN authorizes NOVARA to transmit.

---

## 2. Required business documentation

- Legal entity formation documents (EIN, articles / operating agreement)
- Responsible Official / Principal identity documentation for IRS suitability
- Business address and contact records matching e-file Application
- Privacy Policy & Terms of Service (counsel-approved before public production)
- Data safeguarding / incident response plan aligned to Pub 4557
- Banking partner underwriting packet (for refund settlement — separate from Stripe)
- Merchant / Stripe business verification documents (software billing only)

---

## 3. Required IRS credentials and approvals

| Credential / approval | Status today | Blocks |
|-----------------------|--------------|--------|
| NOVARA EFIN | Not obtained in-repo | Live MeF |
| Software Developer Test ETIN | Not obtained | Official ATS |
| Transmitter Production ETIN | Not obtained | Live transmit |
| Software ID(s) | Not obtained | ATS + production ID |
| Application System ID(s) | Not obtained | A2A |
| Official ATS acceptances | **Not completed** (mock only) | Production claim |
| IRS Production transmission status | Not granted | Live returns |
| State e-file approvals (as applicable) | Separate | State filing |

Mock MeF ACKs in the app are **not** ATS approval.

---

## 4. Banking partners and agreements

### A. Refund settlement (IRS refund → fees → client payout)

- Select an **approved refund-transfer / tax refund banking partner** (not Stripe).
- Execute partner agreement, underwriting, and sandbox webhook / settlement tests.
- Bind secrets (`REFUND_BANK_PARTNER_*`, virtual settlement account IDs) only after agreement.
- Keep refund settlement **disabled** until agreements + your authorization.

### B. NOVARA software billing (Stripe)

- Create Stripe Products / **live Price IDs** matching approved `fees.ts` amounts.
- Env slots are defined in `src/engine/payments/phase10/stripePriceCatalog.ts`.
- Test invoices / refunds / reconciliation in sandbox first.
- Keep `NOVARA_STRIPE_LIVE_ENABLED` / `livePayments` **false** until you authorize.

**Stripe must never be used as the IRS refund settlement rail.**

---

## 5. Cloudflare, Apple, Google, and Stripe accounts

| Account | Owner action | Production use |
|---------|--------------|----------------|
| Cloudflare | Create/own zone; Workers, D1, R2, WAF | DNS + APIs + storage — deploy only with your approval |
| Domain registrar | Purchase official domain | Point DNS via Cloudflare when you approve cutover |
| Stripe | Business verification; live Price IDs | Software fees only |
| Apple Developer Program | Enroll ($99/yr); App Store Connect | iOS app when built — not required for web launch |
| Google Play Console | Enroll ($25 one-time) | Android when built |
| Google Search Console + GA4 | Verify domain / property | SEO & analytics after domain live |
| Business email (Google Workspace / Microsoft 365 / ESP) | Domain verify + mailboxes | Support + transactional |

Infra templates (not live): `infra/cloudflare/`.

---

## 6. Estimated one-time and monthly expenses

Planning estimates only (USD). Replace with vendor quotes.

### One-time / annual

| Item | Low | Mid | High |
|------|-----|-----|------|
| Domain | 12 | 20 | 50 /yr |
| Apple Developer | — | 99 | — /yr |
| Google Play | 25 | 25 | 25 one-time |
| Independent AppSec / pentest | 5,000 | 15,000 | 40,000+ |
| Legal (Privacy/ToS/counsel) | 2,000 | 8,000 | 25,000+ |
| Banking partner setup / underwriting | TBD | TBD | TBD |
| IRS suitability / fingerprinting fees | per IRS schedule | — | — |

### Monthly (production band)

See `docs/OPERATING_COST_ESTIMATES.md`: roughly **~$280 – $1,100 – $4,000+** before payment processing % and IRS/banking partner fees.

---

## 7. Third-party security testing costs

| Scope | Typical range (USD) | Notes |
|-------|---------------------|-------|
| Web app pentest (OWASP) | 5,000 – 20,000 | Required before processing real taxpayer PII at scale |
| Retest after remediations | 1,500 – 5,000 | Close critical/high findings |
| Optional SOC 2 / ongoing | 15,000+ /yr | Not a substitute for Pub 4557 controls |

Scope draft: `docs/APPSEC_PENTEST_SCOPE.md`.

---

## 8. Expected timelines and external dependencies

Timelines below are **external dependency order**, not calendar commitments.

| Dependency | Blocks |
|------------|--------|
| IRS e-file Application + suitability | EFIN/ETIN issuance |
| ATS window open + Test ETIN | Official ATS scenarios |
| ATS pass + communication test | Production ETIN / transmit status |
| Banking partner agreement | Refund settlement |
| Stripe live Price IDs + your auth | Live software charges |
| Cloudflare + domain cutover (your auth) | Official production host |
| Independent AppSec remediations closed | Safe handling of real taxpayer data |
| Counsel-approved Privacy/ToS | Public production claims |
| Your explicit go-live authorization | Any production lock flip |

Developer work can proceed in parallel on mock/staging paths without these approvals.

---

## 9. Tasks the developer can complete without you

- MeF XML compose / validate / 8879 / duplicate / reject / resubmit (mock)
- Official ATS **gate** that refuses mock-as-proof
- ATS scenario catalog + synthetic fixtures
- Stripe Price ID **catalog mapping** to approved fees (no live charges)
- Refund settlement **sandbox** pipeline (no live money)
- Cloudflare Workers/D1/R2 **templates** (no deploy)
- Unit / integration / staging security tests
- Documentation, gap matrix, release fences
- Keep all production locks OFF

---

## 10. Tasks requiring your signature, payment, or authorization

1. IRS e-Services identity + e-file Application + suitability  
2. Payment of IRS / fingerprinting / vendor fees  
3. Signing banking partner agreements  
4. Creating and paying for Cloudflare, domain, Stripe live, Apple, Google accounts  
5. Binding production secrets (ETIN, certs, Stripe keys, bank webhooks)  
6. Authorizing official ATS attempts with your credentials  
7. Authorizing independent AppSec engagement and remediation budget  
8. Approving Privacy Policy / Terms of Service  
9. Approving DNS cutover and production publish  
10. Written go-live authorization to enable any of: live MeF, live payments, live refund settlement, production security enforcement  

---

## Immediate next actions for you (shortest path)

1. Start IRS e-Services + e-file Application as Software Developer + Transmitter.  
2. Decide refund banking partner shortlist and begin underwriting.  
3. Create Stripe live Price IDs matching `fees.ts` (keep live charges off).  
4. Approve budget for AppSec + counsel Privacy/ToS.  
5. Do **not** authorize live transmit or DNS cutover until ATS + AppSec gates pass.

---

## Related artifacts

- `docs/IRS_EFILE_AUTHORIZATION_PATHWAY.md`
- `docs/MEF_DIRECT_INTEGRATION_GAP_MATRIX.md`
- `docs/EXTERNAL_APPROVAL_TRACKER.md`
- `docs/OPERATING_COST_ESTIMATES.md`
- `src/engine/irs/mef/authorization/irsProviderRoles.ts`
- `src/engine/irs/mef/ats/officialAtsGate.ts`
