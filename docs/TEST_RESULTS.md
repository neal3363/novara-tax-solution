# TEST_RESULTS.md

**Branch:** `cursor/oidc-export-hardening-97b5`  
**Run (America/Chicago):** 2026-11-14 ~10:05 AM

## Commands

```bash
npm test
npm run build
```

## Results

| Check | Result |
|-------|--------|
| `npm test` | **38/38 passed** (12 files) |
| `npm run build` | **Success** (Next.js 15.5.29; OIDC callback route present; migrate no-op without `DATABASE_URL`) |
| Export pack | `npm run export:ai` → secrets-free tree under `dist/` (gitignored) |

### Suites covered

- Auth session / cookies / TOTP / OIDC helpers (PKCE, MFA claims, closed config)
- Durable rate-limit + immutable audit (SQL-backed)
- RBAC policy / ABAC / document ACLs
- Security isolation (no self-provision, MFA forge reject, partner isolation)
- Session invalidation on `AUTH_SESSION_VERSION` bump
- Agents / workflow

## Security verification notes

| Requirement | Status |
|-------------|--------|
| No self-register into privileged roles | Pass — register is interest-only; OIDC requires `AUTH_USERS_JSON` roster |
| MFA cannot be forged via cookie | Pass — unsigned/tampered sessions rejected; OIDC requires IdP MFA claims |
| Cross-partner record isolation | Pass — policy + document ACL tests |
| Documents outside assigned matters | Pass — `canAccessDocument` / `listVisibleDocuments` |
| Rate limit across instances | Requires `DATABASE_URL` / Cursor postgres (`cursor-app.json`); SQL store shared |
| Security records across restarts | Postgres when deployed; file-backed PGlite locally (`.data/`) |
| Old shared-password sessions | Invalid — cookie `novara_ai_session_v2` + signed payload; legacy cleared on logout |
| Auth closed when misconfigured | Pass — 503 / null auth when secrets/roster/OIDC missing |
| Live connectors | Still disabled; synthetic data labeled |

## Remaining blockers (human)

1. Create GitHub repo `neal3363/novara-asset-intelligence` and push export (agent cannot createRepository)
2. Confirm remove `PREVIEW_AUTH_PASSWORD` in Cursor Secrets UI (unbind requested; pending confirmation)
3. Supply the nine auth configuration values in the secure form (auth only — does **not** enable live asset data)
4. Configure real IdP (issuer/client/redirect) for end-to-end OIDC in production
5. Republish deferred until review approval
