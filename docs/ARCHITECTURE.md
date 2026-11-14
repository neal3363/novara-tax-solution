# ARCHITECTURE.md — NOVARA Asset Intelligence

## Product identity

NOVARA Asset Intelligence™ is a private national asset discovery, recovery, acquisition, and intelligence operating system. It is **not** NOVARA Tax OS.

## High-level topology

```
Public Web (marketing)
        │
   Auth boundary (MFA-ready)
        │
 ┌──────┴──────────────────────────────────────┐
 │ Authorization service (RBAC + ABAC preview) │
 └──────┬──────────────────────────────────────┘
        │
   ┌────┼────────────┬─────────────┬───────────┐
   ▼    ▼            ▼             ▼           ▼
Exec  Partner     Attorney     Owner/Heir   APIs
CC    Portal      Portal       Portal
```

## Core layers (blueprint-aligned)

1. **Frontend shells** — role-aware Next.js App Router portals under `/app/*`
2. **Authorization** — Middleware + HTTP-only session cookie protect `/app/*`. `src/lib/rbac/policy.ts` and `abac.ts` enforce role + org + territory + sensitivity isolation (preview policy; production will be a dedicated policy service). Append-only audit store records allow/deny outcomes.
3. **Workflow** — DISCOVER → … → ACCOUNT stage model in `src/lib/workflow`
4. **Synthetic intelligence layer** — labeled preview data until connectors are certified
5. **AI gateway (preview)** — agent registry with hard ban on final legal determinations
6. **Future backend services** (not activated):
   - Relational store (cases, compliance, ledgers)
   - Graph layer (Asset Graph)
   - Encrypted object storage (evidence vault)
   - Durable event bus + delta workers
   - Connector SDK with Data Rights Records
   - Observability + Guardian

## Source-priority hierarchy (preserved)

P1 official push → P2 official API → P3 official bulk → P4 permitted site automation → P5 licensed third-party (secondary) → P6 human-only exception.

## Security controls (preview vs production)

| Control | Preview | Production requirement |
|---------|---------|------------------------|
| Role isolation | Policy + tests | Central authZ service |
| MFA | Simulated enabled | Enforced IdP |
| Audit log | Synthetic events | Immutable append-only store |
| Encryption | TLS via host; no KMS yet | At-rest + field-level where required |
| Source rights | Documented gates | Runtime connector kill switches |

## Data classification

Preview data is synthetic. Production assets, claimants, and evidence inherit blueprint sensitivity classes and retention/legal-hold rules.
