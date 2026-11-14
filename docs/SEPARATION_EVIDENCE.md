# Product Separation Evidence — NOVARA Asset Intelligence

**Updated:** 2026-11-14 (America/Chicago)  
**Branch:** `cursor/oidc-export-hardening-97b5`

## Inventory

| Resource | Finding |
|----------|---------|
| Shared GitHub repo | `neal3363/novara-tax-solution` |
| Tax OS code | Other branches only (e.g. `origin/cursor/novara-tax-os-v1-local-4bf9` → `novara-tax-os/`) — **not present on this branch** |
| Asset Intelligence code | Repository root Next.js app (`package.json` name `novara-asset-intelligence`) |
| Deployment | Cursor app slug `novara-asset-intelligence` (republish deferred until review) |
| Database | Declared via `cursor-app.json` → Postgres for security stores only |
| Live connectors | Disabled |
| Auth | Per-user / OIDC + MFA (see `AUTH_CONFIGURATION.md`) |

## Rules honored

- Tax OS branches are not checked out, merged, renamed, or deleted
- Shared repository is **not** renamed
- Agent cannot create `neal3363/novara-asset-intelligence` (createRepository denied)

## Export for transfer

```bash
bash scripts/prepare-asset-intelligence-export.sh
```

Produces a secrets-free tree under `dist/novara-asset-intelligence-export/<timestamp>/` with `TRANSFER_README.md` human steps.
