# Product separation evidence — Tax OS vs Asset Intelligence

**As of:** 2026-11-14 (America/Chicago)  
**Shared GitHub repository:** `neal3363/novara-tax-solution` (do not rename)  
**Production activation:** OFF for Tax OS real-taxpayer use

## 1. Tax OS identity

| Resource | Value |
|----------|-------|
| Primary branch | `cursor/novara-tax-os-v1-local-4bf9` |
| Project directory | `/novara-tax-os` (Vite + React SPA) |
| Public demo deploy | Cursor Apps host `novara-tax-os` (synthetic demo) |
| Database | **Absent** as production D1/Postgres — client/store scoped |
| Object storage | **Absent** as production R2 — in-app vault simulation |
| Auth | Cursor host session (`api/session.ts`) + staging security engines; **not** production IdP/MFA for tax data plane |

## 2. Asset Intelligence identity (same repo, different product)

| Resource | Value |
|----------|-------|
| Lives on | `main` (and Asset Intelligence feature branches such as `cursor/security-isolation-97b5`) |
| Tree | Next.js app at repository **root** (`src/app`, `src/lib/auth`, …) |
| PR #67 | Merged to **`main`** — MFA/auth/ACL for Asset Intelligence. **Does not** modify Tax OS branch trees under `novara-tax-os/` |
| Dedicated GitHub repo | **Not created** (createRepository denied) — documented on Asset Intelligence side |

## 3. PR routing check (this audit)

| PR | Product | Base | Reached Tax OS branch? | Reached Tax OS demo host? |
|----|---------|------|------------------------|---------------------------|
| **#67** Security isolation / MFA | Asset Intelligence | `main` | **No** — `src/lib/auth/totp.ts` absent on Tax OS HEAD | **No** — Tax OS publish packs `novara-tax-os/` only |
| **PR #68** Refund settlement pipeline | Tax OS | `cursor/novara-tax-os-v1-local-4bf9` | **Yes** (merged) | Only after a Tax OS republish of that commit; settlement remains **sandbox** |

## 4. Preservation rules

- Do **not** rename `novara-tax-solution`
- Do **not** delete Asset Intelligence or Tax OS trees to “force” separation
- Do **not** revert shared history; keep products on separate branches / folders
- Tax OS production data plane and Asset Intelligence portals must remain independently deployable

## 5. Evidence commands (reproducible)

```bash
git ls-tree --name-only origin/cursor/novara-tax-os-v1-local-4bf9
# → README.md, novara-tax-os, …

git ls-tree --name-only origin/main
# → Next.js root (no novara-tax-os/)

git cat-file -e origin/cursor/novara-tax-os-v1-local-4bf9:src/lib/auth/totp.ts
# → fails (PR #67 not on Tax OS)
```
