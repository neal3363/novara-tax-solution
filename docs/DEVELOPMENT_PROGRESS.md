# DEVELOPMENT_PROGRESS.md

## Cycle — migration + auth verification (post #69)

### Completed in code
- Production OIDC (PKCE, state, nonce, JWKS, MFA claims, roster-only roles)
- Durable rate-limit + audit (Postgres / PGlite)
- Obsolete shared-password preview variable removed from code and `.env.example`
- Secrets-free `npm run export:ai` pack + transfer README
- Auth configuration docs with exact redirect URIs per environment

### Verified this cycle
- Tax OS remote branch still present; not present on AI branches
- `createRepository` for `neal3363/novara-asset-intelligence` still denied
- Deployed preview still reachable as private Cursor app (host gate); app-level auth remains closed until nine auth values are set in the secure form
- Unit/integration suite + production build (see `TEST_RESULTS.md`)

### Blocked on human / missing credentials
1. Create GitHub repo `neal3363/novara-asset-intelligence` and push export
2. Confirm unbind of obsolete shared-password secret in Cursor Secrets UI (requested; stays bound until UI confirm)
3. Add the nine authentication values in the secure form (enables portal login on synthetic data only)
4. Register IdP redirect URIs and complete live OIDC against a real IdP
5. Retarget / republish deployment from the new repo only after verification (keep current preview until then)

### Preserved
- Design/portals/business model
- Synthetic data labeled; live connectors disabled
- No DNS changes, purchases, or irreversible migrations
