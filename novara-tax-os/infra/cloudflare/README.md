# Cloudflare production infrastructure (templates only)

**Status:** Scaffolding for owner-approved production.  
**Do not deploy** without owner authorization.  
**Do not store taxpayer PII in browser-local storage as the system of record.**

## Planned components

| Component | Role |
|-----------|------|
| Workers | Authenticated APIs (session, filing status, MeF staging endpoints) |
| D1 | Durable submission tracking, audit log indexes, tenant isolation |
| R2 | Encrypted document vault (W-2, ID, acknowledgments) |
| Queues | Async MeF packaging / ACK poll / email jobs |
| Secrets | ETIN, certs, Stripe keys, bank webhooks — never in git |

## Files in this folder

- `wrangler.example.toml` — non-active example config (`name` ends in `-scaffold`)
- `worker-api.example.ts` — stub worker that refuses live MeF / live payments
- `d1/schema.example.sql` — submission + audit tables
- `runbooks/BACKUP_AND_DR.md` — backup / restore / rollback checklist
- `runbooks/DEPLOY_AND_ROLLBACK.md` — deploy / rollback procedures

## Hard locks in stubs

- `LIVE_IRS_TRANSMIT=false`
- `LIVE_PAYMENTS=false`
- `LIVE_REFUND_SETTLEMENT=false`
- Requests that attempt live transmit return `403 production_locked`

## Owner prerequisites before deploy

1. Cloudflare account + domain ownership  
2. Secrets bound in Cloudflare dashboard / Cursor app secrets  
3. Written authorization to deploy production workers  
4. Independent AppSec gate for endpoints that touch PII  
