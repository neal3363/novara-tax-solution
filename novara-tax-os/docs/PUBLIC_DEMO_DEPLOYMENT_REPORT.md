# NOVARA Tax OS — Public Demo Deployment Report

**As of:** 2026-11-14 America/Chicago  
**Branch:** `cursor/public-demo-deploy-4bf9`  
**Baseline:** PRs #49–#53 merged; `docs/RELEASE_READINESS_REPORT.md`

## 1. Hosting provider

**Not pre-configured in repo** (no Vercel/Netlify/Fly/Docker deploy manifests found).  
**Recommended for synthetic SPA demo:** static hosting of Vite `dist/` (Cursor App Hosting preview, Netlify, Vercel, Cloudflare Pages, S3+CloudFront, etc.).

## 2. Domain configuration

**Not changed.** DNS/domain cutover requires explicit owner approval. See `PUBLIC_DEMO_DNS_SETUP.md`.

## 3. Deployment URL

- **Isolated preview:** provided via Cursor publish proposal / local preview (see PR).
- **Public custom domain:** **not published** (awaiting owner approval).

## 4. CI and build results

- PRs #51–#53: **merged**
- `npm run build`: **PASS**
- `npm run test:public-demo-deploy`: **PASS** (run on this branch)
- Checkpoint: `checkpoint/pre-public-demo-deploy-4bf9`
- Rollback: `rollback/pre-public-demo-deploy-4bf9`

## 5. Homepage status

Preserved branding + cinematic hero. Public demo banner added **below** hero (not a redesign). **PASS** for build; deployed smoke pending preview.

## 6. Dashboard status

Existing TC / TP / Office dashboards unchanged. Public guest opens taxpayer workspace for synthetic exploration.

## 7. AI interview status

Unchanged questionnaire / interview UX. Synthetic guest path retained.

## 8. Refund Maximizer status

UI preserved; simulated-result label appended in public demo mode.

## 9. Pricing verification

TC personal **$300**, business **$399** — asserted in demo harness. Other approved fees unchanged.

## 10. Mobile compatibility

Static layout from prior Master QA; dedicated device lab still **NOT_TESTED** unless exercised in preview testing this turn.

## 11. Security restrictions

Server/client gates block SSN/PAN and payment/IRS/banking actions. Live locks remain OFF. See `PUBLIC_DEMO_SECURITY_VERIFICATION.md`.

## 12. Monitoring and backup status

Procedures documented; operational monitoring **NOT_TESTED** until host attached. SPA demo is device-local storage.

## 13. Remaining deployment blockers

| Item | Status |
|------|--------|
| Owner approval for public DNS | BLOCKED |
| Hosting provider account / project | BLOCKED until owner chooses |
| Independent AppSec | BLOCKED (external) |
| Official IRS ATS / live pay / banking | BLOCKED (must stay OFF) |
| Device lab evidence | NOT_TESTED |

## 14. Public demo GO/NO-GO

**GO_SYNTHETIC_PREVIEW** — isolated staging/preview with synthetic data is authorized.  
**NO-GO for public DNS / live hostname** until owner explicitly approves.  
**NO-GO for real taxpayer / live IRS / live payments.**

## 15. Exact owner actions

1. Review this PR and isolated preview.
2. Confirm visibility (prefer private/team until ready for public).
3. Explicitly approve **public DNS / custom domain** if desired (separate message).
4. Choose/confirm hosting provider if not using Cursor App Hosting.
5. Do **not** supply live payment/IRS credentials for the demo.
6. Keep production approvals on `EXTERNAL_APPROVAL_TRACKER.md` before any real-taxpayer launch.
