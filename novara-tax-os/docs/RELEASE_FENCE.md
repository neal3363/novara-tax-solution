# NOVARA Tax OS — Release Fence

**Fenced at:** 2026-11-14 02:03 AM America/Chicago  
**Git tip:** `b99b77f` (`cursor/novara-tax-os-v1-local-4bf9`)  
**Checkpoint tag:** `fence/public-demo-live-4bf9`  
**Rollback tag:** `rollback/fence-public-demo-live-4bf9`  
**Live demo URL:** https://novara-tax-os.apps.grok.bot  

This fence locks the completed public-demo baseline. Further product or infrastructure changes require explicit owner direction. Live IRS, payments, banking, real taxpayer processing, and custom DNS remain **OFF / NO-GO**.

---

## 1. What is fenced (delivered)

### Development phases (merged)
| Phase | PR | Result |
|-------|----|--------|
| Phase 6 production security (enforcement OFF) | #42 | Merged |
| Phase 7 staging security (enforcement OFF) | #43 | Merged |
| Phase 8 MeF mock ATS | #44 | Merged |
| Phase 9 IRS↔Maximizer staging | #46 | Merged |
| Phase 10 sandbox payments/banking | #47 | Merged |
| Phase 11 state/business/amended | #48 | Merged |
| Phase 12 launch readiness | #49 | Merged |
| Master QA acceptance | #50 | Merged — **GO demo / NO-GO production** |
| Remediation WS1 security | #51 | Merged |
| Remediation WS2–4 tax mappings | #52 | Merged |
| Remediation WS5–11 readiness | #53 | Merged |

### Public demo & publish (merged)
| Work | PR | Result |
|------|----|--------|
| Synthetic public demo gates, banners, docs, deploy prep | #54 | Merged |
| Remove/hard-gate staging security HTTP from publishable `api/` | #55 | Merged — unblocked publish |
| Business/luxury/tax-office cinematic hero reel | #56 | Merged & published |

### Live surface
- Cursor App Hosting: **https://novara-tax-os.apps.grok.bot** (public, synthetic sample data)
- Homepage cinematic: luxury buildings → business handshake → advisor/client → preparer team
- Demo banners + SSN/PAN/payment/IRS gates; staging APIs not shippable under `api/security`
- Pricing preserved: Tax Client personal **$300**, business **$399**

---

## 2. Explicitly NOT activated

| Control | Status |
|---------|--------|
| Live IRS electronic filing | OFF |
| Production tax-engine cutover | OFF |
| Real taxpayer processing | OFF |
| Live payment collection | OFF |
| Live banking / refund advances | OFF |
| Custom public DNS / domain purchase | NOT DONE — needs owner approval |
| Platform certification / e-file authorization claims | NOT CLAIMED |

See `EXTERNAL_APPROVAL_TRACKER.md` for remaining external blockers.

---

## 3. Rollback procedure

```bash
git fetch --tags
git checkout rollback/fence-public-demo-live-4bf9
# Or restore tip: fence/public-demo-live-4bf9
```

Pre-demo tip (before #54–#56): `rollback/pre-public-demo-deploy-4bf9` → `88fad4d`.

After a git rollback, **Republish** the Cursor app from the restored default-branch tip so the live host matches.

---

## 4. Change policy after this fence

Do **not** change without explicit owner request:

- Branding, cinematic hero, homepage layout, navigation
- TC / TP / Office dashboards, AI interview, Refund Maximizer UX
- Approved subscription and preparation pricing
- Live integration locks (IRS / payments / banking / cutover)
- Public DNS / hosting visibility

Allowed without reopening the fence only when owner asks: security/publish hardening noted by Cursor review, bug fixes that do not alter product scope.

---

## 5. Related docs

- `PUBLIC_DEMO_DEPLOYMENT_REPORT.md`
- `PUBLIC_DEMO_DEPLOYMENT_CHECKLIST.md`
- `PUBLIC_DEMO_SECURITY_VERIFICATION.md`
- `PUBLIC_DEMO_ROLLBACK.md`
- `RELEASE_READINESS_REPORT.md`
- `EXTERNAL_APPROVAL_TRACKER.md`
