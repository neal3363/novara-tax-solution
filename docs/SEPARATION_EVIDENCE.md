# Product Separation Evidence — NOVARA Asset Intelligence

**Audit time:** 2026-11-14 (America/Chicago)  
**Branch:** `cursor/security-isolation-97b5`

## Inventory (this Cloud Agent environment)

| Resource | Asset Intelligence finding |
|----------|----------------------------|
| GitHub repository | `neal3363/novara-tax-solution` (**shared name with Tax OS work**) |
| Tax OS code location | Other branches (e.g. `cursor/novara-tax-os-v1-local-4bf9`) under `novara-tax-os/` |
| Asset Intelligence code location | Current `main` / this branch — Next.js app at repository **root** |
| Project directory | `/` (package name `novara-asset-intelligence`) |
| Deployment | Cursor app `novara-asset-intelligence` → `https://novara-asset-intelligence.apps.grok.bot` (private) |
| Database | None |
| Object storage | None (synthetic vault only) |
| Authentication | App-local signed sessions + env-configured users / optional OIDC (this PR) |

## Shared-repository fact

Both products historically use **`neal3363/novara-tax-solution`**. They diverge from the empty initial commit `f95dfad`. This agent **cannot create** `neal3363/novara-asset-intelligence` (GitHub createRepository denied for the integration token) and **must not rename** the existing repository.

## Isolation rules applied now

- This branch contains **only** Asset Intelligence root app files.
- No Tax OS branches are checked out, merged, or modified.
- No Tax OS paths (`novara-tax-os/**`) are present on this branch.
- Security work proceeds on Asset Intelligence code only.

## Required human step for full repository separation

1. Create an empty GitHub repository: `neal3363/novara-asset-intelligence` (do **not** rename `novara-tax-solution`).
2. Add a new remote and push this branch/main Asset Intelligence tree there.
3. Point the Cursor Cloud environment / publish app at the new repository.
4. Leave Tax OS history on `novara-tax-solution` branches untouched.

Until step 1–3 complete, **repository-level** separation remains a documented blocker even though product code on this branch is Asset Intelligence only.
