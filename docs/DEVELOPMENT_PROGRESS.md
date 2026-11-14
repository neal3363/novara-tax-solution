# DEVELOPMENT_PROGRESS.md

## Current cycle — OIDC + durable security + export prep

### Implemented
- Production OIDC authorize + PKCE + state/nonce + token exchange + JWKS ID-token validation + MFA claim enforcement
- OIDC users must be pre-provisioned in `AUTH_USERS_JSON` (no privileged self-registration)
- Durable rate-limit + audit stores (Postgres when `DATABASE_URL` set; PGlite locally)
- `cursor-app.json` declares postgres for multi-instance persistence
- `PREVIEW_AUTH_PASSWORD` removed from application code
- Secrets-free export script for transfer to `neal3363/novara-asset-intelligence`
- Registration page clarified: interest only, creates no accounts

### Remaining blockers
- Human must create GitHub repo `neal3363/novara-asset-intelligence` and push export
- Confirm removal of obsolete `PREVIEW_AUTH_PASSWORD` in Cursor Secrets UI if still bound
- Choose/configure real IdP values (issuer/client) before production OIDC login works end-to-end
- Republish deferred until review approval

### Preserved
- Tax OS branches untouched
- Synthetic data labeled; live connectors disabled
- Design/portals/business model unchanged
