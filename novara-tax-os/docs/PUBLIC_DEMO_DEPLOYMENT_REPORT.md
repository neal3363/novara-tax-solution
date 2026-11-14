# NOVARA Tax OS — Public Demo Deployment Report

**As of:** 2026-11-14 America/Chicago  
**Branch:** `cursor/public-demo-deploy-4bf9`  
**PR:** https://github.com/neal3363/novara-tax-solution/pull/54  
**Baseline:** PRs #49–#53 merged; `docs/RELEASE_READINESS_REPORT.md`  
**Checkpoint:** `checkpoint/pre-public-demo-deploy-4bf9`  
**Rollback tag:** `rollback/pre-public-demo-deploy-4bf9` (points at pre-demo merge tip `88fad4d`)

## 1. Hosting provider

**Not pre-configured** as a live production host in repo.  
**Prepared:** `vercel.json` SPA rewrites for optional static hosting of Vite `dist/`.  
**Isolated preview:** Cursor App Hosting preview built from this PR branch (`novara-tax-os` slug). Live production app updates only from the default branch after merge + owner republish.

## 2. Domain configuration

**Not changed.** No DNS purchase or record edits. See `PUBLIC_DEMO_DNS_SETUP.md`.

## 3. Deployment URL

- **Local preview (this agent VM):** `http://127.0.0.1:4173/` (Vite production preview).
- **Cursor preview:** open from the app pill in Cursor (branch preview; not a custom public DNS).
- **Public custom domain:** **not published** — awaiting explicit owner approval.

## 4. CI and build results

| Check | Result |
|-------|--------|
| PR #51 (WS1 security) | **MERGED** 2026-11-14 01:12 AM America/Chicago |
| PR #52 (WS2–4 tax) | **MERGED** 2026-11-14 01:15 AM America/Chicago |
| PR #53 (WS5–11 readiness) | **MERGED** 2026-11-14 01:16 AM America/Chicago |
| `npm run build` | **PASS** |
| `npm run test:public-demo-deploy` | **PASS** |
| `npm run test:launch-phase12` | **PASS** (`GO_DEMO_SYNTHETIC_ONLY`) |
| `npm run test:prod-readiness` | **PASS** (`suites_failed=0`) |
| `npm run test:pricing` | **PASS** |
| GitHub Checks on #54 | Subscribed; none reported at first push (watch CI subscription) |

## 5. Homepage status

**PASS** (manual smoke on preview). NOVARA branding + cinematic hero video preserved. Public demo banner below hero: synthetic-only warning. Screenshot: `/opt/cursor/artifacts/homepage-4173.webp`.

## 6. Dashboard status

**PASS** for synthetic guest path. Existing TC / TP / Office dashboards unchanged. “Get Started” → public guest → `/app/taxpayer/prepare` without credentials.

## 7. AI interview status

**PASS** on preview. Questionnaire loads (e.g. marital status question, progress). UX unchanged; synthetic guest only.

## 8. Refund Maximizer status

**PASS** on preview. Maximizer panel reachable; simulated/potential labels present. Demo-mode result label wired in code. Screenshot: `/opt/cursor/artifacts/refund-maximizer-4173.webp`.

## 9. Pricing verification

**PASS.** Tax Client Personal **$300.00**, Business **$399.00** confirmed on homepage pricing section and in harness. Other approved TP/Office/prior-year fees unchanged.

## 10. Mobile compatibility

**PASS** at ~390px browser width (preview). Device lab iPhone/Android/tablet hardware still **NOT_TESTED**. Screenshot: `/opt/cursor/artifacts/mobile-390px-4173.webp`.

## 11. Security restrictions

| Control | Status |
|---------|--------|
| Live IRS filing | OFF |
| Production tax engine cutover | OFF |
| Live payments / banking / advances | OFF |
| Real taxpayer processing | OFF |
| SSN / PAN rejection (`rejectSensitiveDemoPayload`) | **PASS** (harness) |
| `/api/demo-safety` | Present (Vite middleware in `vite.config.ts`) |
| Demo banners | Landing + app shell |
| Sensitive data in logs | Client demo paths avoid logging SSN/PAN |

See `PUBLIC_DEMO_SECURITY_VERIFICATION.md`.

## 12. Monitoring and backup status

Procedures in `PUBLIC_DEMO_MONITORING.md` / `PUBLIC_DEMO_ROLLBACK.md`. Operational host monitoring **NOT_TESTED** until owner attaches production host. SPA demo uses device-local storage (no production DB required for synthetic preview).

## 13. Remaining deployment blockers

| Item | Status |
|------|--------|
| Owner approval for public DNS / live hostname | **BLOCKED** |
| Production hosting account cutover | Owner choice |
| Independent AppSec | **BLOCKED** (external) |
| Official IRS ATS / live pay / banking | **BLOCKED** — must stay OFF |
| Hardware device lab | **NOT_TESTED** |
| Merge #54 + republish for default-branch live Cursor app | Owner action |

## 14. Public demo GO/NO-GO

**GO_SYNTHETIC_PREVIEW** — isolated staging/Cursor preview with synthetic data is ready for owner review.  
**NO-GO for public DNS / live custom hostname** until you explicitly approve.  
**NO-GO for real taxpayer / live IRS / live payments / banking.**

Platform is **not** certified or authorized for live electronic filing.

## 15. Exact owner actions

1. Review **PR #54** and the Cursor app preview (app pill).
2. Confirm publish visibility (prefer private/team until ready for wider access).
3. **Merge #54**, then **Republish** to update the live Cursor app from the default branch.
4. Explicitly approve **public DNS / custom domain** in a separate message if desired.
5. Choose production static host if not relying on Cursor hosting; wire secrets per `PUBLIC_DEMO_ENV_CHECKLIST.md`.
6. Do **not** supply live payment/IRS credentials for the demo.
7. Keep `EXTERNAL_APPROVAL_TRACKER.md` blockers closed before any real-taxpayer launch.
