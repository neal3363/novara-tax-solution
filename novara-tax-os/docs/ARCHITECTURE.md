# NOVARA Tax OS — Infrastructure Architecture

**As of:** 2026-11-14 (America/Chicago)  
**Production activation:** OFF  
**Audience:** Owner / future operators (business continuity)

## 1. Current runtime topology

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Vite + React 19 SPA)                               │
│  • Tax Client / Tax Preparer / Tax Office / Admin UIs       │
│  • Local Zustand-style store (useAppStore)                  │
│  • Engine modules (tax, payments sandbox, MeF mock, etc.)   │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  Cursor App Hosting       │   │  api/ (published functions) │
│  https://novara-tax-os.   │   │  • session.ts (viewer auth) │
│  apps.grok.bot            │   │  • demo-safety.ts           │
│  Public synthetic demo    │   └─────────────────────────────┘
└───────────────────────────┘
```

## 2. What exists today

| Layer | Status | Location |
|-------|--------|----------|
| Frontend SPA | Present | `src/` |
| Fee / pricing SSOT | Present | `src/data/fees.ts` |
| Tax engines (isolated / staging) | Present | `src/engine/irs/`, phases 3–5, 9, 11 |
| MeF mock ATS | Present | `src/engine/irs/mef/` — `liveProductionTransmit=false` |
| Payments sandbox | Present | `src/engine/payments/phase10/` — `livePayments=false` |
| Staging security controls | Present | `src/engine/security/`, remediation |
| Published session API | Present | `api/session.ts` |
| Demo safety API | Present | `api/demo-safety.ts` |
| Public demo fence | Present | `docs/RELEASE_FENCE.md` |

## 3. What is NOT present (do not claim otherwise)

| Capability | Status |
|------------|--------|
| Cloudflare Workers (`wrangler.toml`) | **Absent** |
| Cloudflare D1 database + migrations | **Absent** |
| Cloudflare R2 document storage | **Absent** |
| Durable production Postgres / hosted DB | **Absent** (client/local durable stubs only) |
| Background job queues / dead-letter | **Absent** as production infra |
| Transactional email provider (SendGrid/SES/etc.) | **Absent** |
| Native iOS / Android apps | **Absent** |
| Production Stripe Price IDs bound in secrets | **Absent** (`livePayments=false`) |
| Official IRS ATS transmitter connection | **Absent** (mock only) |

## 4. Recommended production target (owner-approved build)

When authorized, target a separated staging/production stack:

1. **Edge:** Cloudflare (DNS, SSL, WAF) + Workers API  
2. **Data:** D1 or managed Postgres with migrations + indexed tenant keys  
3. **Objects:** R2 (encrypted documents) with malware scan pipeline  
4. **Secrets:** Platform secrets manager / KMS — never in git  
5. **Payments:** Stripe live Prices + signed webhooks + idempotency keys  
6. **Email:** Verified domain + transactional templates  
7. **Observability:** Error tracking, uptime checks, audit log export  

Do **not** flip production locks until `EXTERNAL_APPROVAL_TRACKER.md` critical rows have evidence.

## 5. Feature locks (must stay OFF until GO)

- `liveProductionTransmit` / MeF live IRS filing  
- `activateCutover` / taxpayer-visible IRS engine  
- `livePayments` / `liveBankingPartner`  
- `productionEnforcement`  
- `nationwideStateFiling` / `liveBusinessEfile`  

Enforced in code and verified by `test:launch-phase12`, `test:master-acceptance`, `test:public-demo-deploy`.
