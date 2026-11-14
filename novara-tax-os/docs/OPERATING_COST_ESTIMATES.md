# Monthly Operating Cost Estimates

**Important:** Figures below are **planning estimates**, not invoices or commitments.  
Actual costs depend on vendor contracts, traffic, and storage. Update after quotes.

Currency: USD / month unless noted.

## Baseline (synthetic public demo — current)

| Item | Estimate | Notes |
|------|----------|-------|
| Cursor App Hosting (demo) | Included in Cursor plan / TBD | Current public demo host |
| Domain (not yet purchased) | $0 until owned | Custom DNS requires owner approval |
| Live Stripe | $0 | `livePayments=false` |
| IRS transmitter | $0 | Mock only |
| **Subtotal** | **~$0 incremental infra beyond existing Cursor tooling** | Demo-scale |

## Commercial production (when authorized)

| Item | Low | Mid | High | Notes |
|------|-----|-----|------|-------|
| Domain + DNS | 1 | 2 | 5 | Annual domain amortized |
| Cloudflare Pro / Business | 20 | 200 | 500 | WAF + Workers tiering |
| Workers + D1 + R2 | 25 | 150 | 800 | Traffic/storage sensitive |
| Managed Postgres (if used) | 0 | 50 | 300 | Optional vs D1 |
| Object storage + egress | 10 | 75 | 400 | Document vault |
| Transactional email | 15 | 50 | 200 | Volume-based |
| Error / uptime monitoring | 0 | 30 | 100 | Sentry/equivalent |
| Stripe fees | variable | variable | variable | % + fixed per charge — not platform fee |
| Banking / refund products | TBD | TBD | TBD | Partner agreement required |
| IRS e-file transmitter | TBD | TBD | TBD | Provider contract |
| Independent AppSec (annual amortized) | 200 | 500 | 1500 | External assessment |
| Apple Developer | ~8 | ~8 | ~8 | $99/yr amortized |
| Google Play | ~2 | ~2 | ~2 | One-time $25 amortized |
| **Planning band** | **~$280** | **~$1,100** | **~$4,000+** | Before payment/IRS partner fees |

## NOVARA software pricing (revenue side — not costs)

From `src/data/fees.ts` (SSOT):

| Product | Price |
|---------|-------|
| TP personal / SE / business entity | $89 / $119 / $249 **per return** |
| Office Personal / SE / Business | $899 / $1,199 / $1,499 **per year** |
| TC personal / business | $300 / $399 **per return** |
| Prior-year surcharge | $250 (preserved) |

## Owner actions

1. Replace estimates with vendor quotes before budgeting.  
2. Bind secrets only after agreements.  
3. Do not treat this document as a production cost guarantee.
