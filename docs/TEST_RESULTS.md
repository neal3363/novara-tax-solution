# TEST_RESULTS.md

**Branch:** `cursor/ai-migration-auth-verify-97b5`  
**Run (America/Chicago):** 2026-11-14 ~10:58 AM

## Commands

```bash
npm test
npm run build
npm run export:ai
```

## Automated suite

| Check | Result |
|-------|--------|
| `npm test` | **46/46 passed** (15 files) |
| `npm run build` | **Success** (Next.js 15.5.29) |
| Export pack | Secrets-free; no Tax OS; `.env.example` has no obsolete shared-password key |

## Local runtime auth verification (ephemeral roster on `:3010`)

| Check | Result |
|-------|--------|
| OIDC start when OIDC unset | **503** closed |
| OIDC callback when OIDC unset | **503** closed (no 501) |
| Bad password | **401** |
| Good password | **200** + `mfaRequired` + `novara_ai_mfa_pending` |
| Portal before MFA | **307** → `/login` |
| Wrong MFA code | **401** |
| Valid TOTP MFA | **200** → `/app/executive` |
| Portal after MFA | **200** + synthetic data banner |
| Logout | **200**; portal then **307** → `/login` |
| Forged `novara_ai_session_v2` | **307** → `/login` |
| Legacy `novara_ai_session` | **307** → `/login` |
| Rate limit (6 failures) | **401×4 then 429×2** |
| Unauthenticated export/doc | **401** |
| File-backed `.data/security` after traffic | Present (local durability) |

Unit/integration also cover: partner isolation, document ACLs, export ABAC, session version bump, session expiry, OIDC MFA claim helpers, PKCE, no privileged self-registration.

## Deployed preview probe

| Check | Result |
|-------|--------|
| `https://novara-asset-intelligence.apps.grok.bot` | Reachable as **private Cursor app** (host `sign_in_required` without Cursor session) |
| App-level OIDC/login E2E on deploy | **Blocked** until nine auth values are set in the secure form and a signed-in operator tests through the private app gate |

## Multi-instance rate limit / restart durability

| Concern | Evidence |
|---------|----------|
| Across instances | Requires shared `DATABASE_URL` (declared via `cursor-app.json` postgres) |
| Across restarts (local) | File-backed PGlite under `.data/security` |
| Across restarts (deploy) | Postgres when platform provisions `DATABASE_URL` |

## Remaining human blockers

1. Create `neal3363/novara-asset-intelligence` (agent `createRepository` denied) and push `npm run export:ai` pack  
2. Confirm unbind of obsolete shared-password secret in Cursor Secrets UI  
3. Add the nine auth values in the secure form (portal auth only — **does not enable live asset data**)  
4. Register IdP redirect URIs (see `AUTH_CONFIGURATION.md`) and run live OIDC against real IdP  
5. Retarget deployment to the new repo only after replacement is verified; keep current preview until then  
