# Product Separation Evidence — NOVARA Asset Intelligence

**Updated:** 2026-11-14 ~10:53 AM (America/Chicago)  
**Branch:** `cursor/ai-migration-auth-verify-97b5` (from merged #69 on `main`)

## Inventory

| Resource | Finding |
|----------|---------|
| Shared GitHub repo | `neal3363/novara-tax-solution` — **preserved** (not renamed) |
| Tax OS branch | `origin/cursor/novara-tax-os-v1-local-4bf9` still present (`novara-tax-os/` on that branch only) |
| Asset Intelligence code | Repository root Next.js app (`package.json` name `novara-asset-intelligence`) |
| New dedicated repo | **Not created** — `createRepository` returns `Resource not accessible by integration` |
| Current preview | `https://novara-asset-intelligence.apps.grok.bot` (private Cursor app; preserved until replacement verified) |
| Live connectors | Disabled |
| Auth | Per-user / OIDC + MFA (see `AUTH_CONFIGURATION.md`) |

## Rules honored

- Tax OS branches are not checked out, merged, renamed, or deleted
- Shared repository is **not** renamed
- Agent cannot create `neal3363/novara-asset-intelligence`

## Export for transfer (secrets-free)

```bash
npm run export:ai
# → dist/novara-asset-intelligence-export/<timestamp>/
# includes TRANSFER_README.md with exact human push steps
```

Excludes: `.git`, `node_modules`, `.next`, `.data`, secret `.env*` files, `novara-tax-os/`.

## Human steps to finish repository migration

1. Create empty private GitHub repo `neal3363/novara-asset-intelligence` (do not rename this repo).
2. From the export directory: `git init && git add . && git commit -m "Import NOVARA Asset Intelligence" && git branch -M main && git remote add origin https://github.com/neal3363/novara-asset-intelligence.git && git push -u origin main`
3. Point Cursor Cloud environment at the new repository.
4. Keep the current published preview until a replacement from the new repo is verified.
5. Leave Tax OS history on `novara-tax-solution` untouched.
