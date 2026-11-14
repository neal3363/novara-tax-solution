# NOVARA Tax OS — Business Continuity Pack

**Purpose:** Ensure the owner can operate if an outside developer is unavailable.  
**As of:** 2026-11-14 (America/Chicago)

## 1. Source of truth

| Asset | Location |
|-------|----------|
| Owner-controlled repository | `github.com/neal3363/novara-tax-solution` |
| Application root | `novara-tax-os/` |
| Preferred working base branch | `cursor/novara-tax-os-v1-local-4bf9` |
| Public demo fence | `docs/RELEASE_FENCE.md` |
| Pricing SSOT | `src/data/fees.ts` |

## 2. Documentation map

| Need | Document |
|------|----------|
| Architecture | `docs/ARCHITECTURE.md` |
| Env / secrets inventory (names only) | `docs/ENV_VARIABLE_INVENTORY.md` |
| Cost planning | `docs/OPERATING_COST_ESTIMATES.md` |
| External approvals | `docs/EXTERNAL_APPROVAL_TRACKER.md` |
| Phase / remediation history | `docs/PHASE*.md`, `docs/REMEDIATION_*.md` |
| Master QA | `docs/MASTER_ACCEPTANCE_TEST_REPORT.md` |
| This launch audit | `docs/MASTER_PRODUCTION_LAUNCH_REPORT.md` |
| Public demo deploy | `docs/PUBLIC_DEMO_*.md` |
| Admin training (in-app) | Office → Business Continuity page |

## 3. Deploy / rollback (demo host)

1. Ensure branch tip is intended release.  
2. `cd novara-tax-os && npm ci && npm run build`  
3. Publish via Cursor app hosting (owner action).  
4. Rollback: see `RELEASE_FENCE.md` tags `fence/public-demo-live-4bf9` / `rollback/fence-public-demo-live-4bf9`.

**Do not** change public DNS without owner approval (`PUBLIC_DEMO_DNS_SETUP.md`).

## 4. Backup & recovery

- Staging simulation: `npm run test:recovery-remediation`  
- In-app office continuity dashboard: `/app/office/continuity` (synthetic)  
- Production DB restore drill: **NOT_TESTED** — no production DB yet  

## 5. Credential & account ownership checklist

Transfer/confirm owner control of:

- [ ] GitHub repository admin  
- [ ] Cursor team / app hosting  
- [ ] Domain registrar (when purchased)  
- [ ] Cloudflare account (when connected)  
- [ ] Stripe account  
- [ ] Email domain + ESP  
- [ ] IRS e-file / transmitter credentials  
- [ ] Banking partner portal  
- [ ] Apple Developer Program  
- [ ] Google Play Console  
- [ ] Secrets manager / KMS  

No production infrastructure, domain, or developer account should remain exclusively controlled by an outside developer.

## 6. Administrator training outline

1. Open synthetic demo; confirm banners and live locks OFF.  
2. Review Fees page vs `fees.ts`.  
3. Office onboarding: EFIN, staff, pricing, banking **selection** (not live products).  
4. Continuity page: backup inventory is synthetic until production storage exists.  
5. Never enable live flags without completing `EXTERNAL_APPROVAL_TRACKER.md`.

## 7. Vendor inventory

| Vendor / surface | Role | Live? |
|------------------|------|-------|
| Cursor App Hosting | Demo frontend/API host | Yes (demo) |
| GitHub | Source control | Yes |
| Stripe | Payments | Sandbox code only |
| IRS MeF | E-file | Mock only |
| Bank product partners | Refund products | Not connected |
| Cloudflare | DNS/WAF/Workers | Not connected |
| Apple / Google | Mobile stores | Not started |
| Email ESP | Transactional mail | Not connected |
