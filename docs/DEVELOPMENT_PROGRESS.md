# DEVELOPMENT_PROGRESS.md

## Completed

### Phase A — Working preview
- Greenfield Next.js 15 application branded **NOVARA Asset Intelligence** (separate from Tax OS)
- Luxury Midnight Navy / Champagne Gold design system
- Public homepage + 8 marketing pages
- Four role portals with synthetic labeled datasets
- Foundation RBAC + Vitest suite
- Documentation pack + Version 1.4 addendum

### Phase B — Auth, audit, policy hardening + competitive expansions (this cycle)
- HTTP-only session cookies + `/api/auth/login|logout`
- Middleware portal isolation (`/app/*` role enforcement + MFA flag)
- ABAC helpers: territory, opportunity lock, document sensitivity, watermarked exports
- Append-only immutable audit store + Executive Audit Log UI
- Interactive Asset Graph canvas
- Bulk Case Operations (executive + partner)
- Intelligence Enrichment Engine UI
- Forensic Genealogy Workspace (executive + attorney)
- International Heir Research Routing scaffold
- AI Claim Preparation Assistant (partner)
- Data Provider Comparison Engine
- Sign-out in portal shells

## In progress / next
- Phase C legal memorandum + compensation + Data Rights Record engines
- Durable event bus / continuous discovery workers (no live connectors yet)
- Production IdP (replace preview cookie auth)

## Blockers / approvals required
- Paid data provider licenses
- Official source contracts / Data Rights Records
- Production deployment and DNS
- Irreversible database migrations
- Any change to locked business model numbers

## Notes
All preview integrations are mocked. Do not interpret synthetic freshness or pipeline values as live production metrics.
No Tax OS code, backend, or services are shared or modified.
