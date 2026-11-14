# Authentication configuration — NOVARA Asset Intelligence

Authentication configuration controls **who can open portals**. It does **not** enable live asset connectors, official-source ingestion, or real recovery data. Synthetic data remains labeled until connectors are separately licensed and approved.

## The nine authentication variables

| Variable | Purpose | Where the value comes from | Secret? |
|----------|---------|----------------------------|---------|
| `AUTH_SECRET` | HMAC key for signing portal session cookies | Generate a long random string (≥32 chars) in your secret store | **Yes** |
| `AUTH_MODE` | `password`, `oidc`, or `both` | Operator choice for the environment | No (non-sensitive config) |
| `AUTH_SESSION_VERSION` | Bump to invalidate all existing sessions | Operator-set version string (e.g. `2`) | No |
| `AUTH_USERS_JSON` | Provisioned user roster: ids, roles, orgs, territories, scrypt password hashes, TOTP secrets | Admin-managed JSON in secret store; emails must match IdP users for OIDC | **Yes** |
| `AUTH_OIDC_ISSUER` | OIDC issuer URL (discovery base) | Your IdP tenant/issuer URL | No (public issuer URL) |
| `AUTH_OIDC_CLIENT_ID` | OIDC confidential client id | IdP application settings | Treat as sensitive |
| `AUTH_OIDC_CLIENT_SECRET` | OIDC client secret | IdP application settings | **Yes** |
| `AUTH_OIDC_REDIRECT_URI` | Exact callback URL registered with IdP | Environment-specific URL below | No |
| `AUTH_OIDC_SCOPES` | OIDC scopes (default `openid profile email`) | IdP-allowed scopes | No |

Put secret values only in the Cursor / host **secure form**. Never put them in chat, logs, or git.

### Related platform variable (not one of the nine auth vars)

| Variable | Purpose | Secret? |
|----------|---------|---------|
| `DATABASE_URL` | Shared Postgres for durable rate-limit + audit across instances (set by Cursor when `cursor-app.json` declares postgres) | **Yes** (platform-managed) |

## Exact OIDC redirect URIs (register each with the IdP)

| Environment | `AUTH_OIDC_REDIRECT_URI` |
|-------------|--------------------------|
| Local development | `http://localhost:3000/api/auth/oidc/callback` |
| Current Cursor published preview | `https://novara-asset-intelligence.apps.grok.bot/api/auth/oidc/callback` |
| Future app after repo migration | `https://<new-slug>.apps.grok.bot/api/auth/oidc/callback` (set after replacement publish is verified) |

The IdP application must allow the exact URI used by that environment. Mismatched redirect URIs cause callback failure.

## Auth vs live-data connectors

| Concern | Variables / gates | Effect |
|---------|-------------------|--------|
| Portal login / MFA / isolation | The nine auth vars above | Users can open role portals on **synthetic** data |
| Live state/federal connectors | Separate Data Rights Records, connector secrets, legal memos (not configured here) | **Still disabled** |

Adding auth values does **not** turn on real asset discovery feeds.

## Implemented behavior

- Per-user passwords + TOTP MFA (password mode)
- Full OIDC authorization-code + PKCE + state/nonce + JWKS ID-token validation (issuer, audience, signature) + MFA claim enforcement
- OIDC users must already exist in `AUTH_USERS_JSON` (no self-registration into privileged roles)
- Durable rate limits + audit via Postgres/`DATABASE_URL` (file-backed PGlite locally)
- Session cookie `novara_ai_session_v2`; bump `AUTH_SESSION_VERSION` to invalidate old sessions
- Obsolete shared-password preview variable removed from application code and examples

## Closed when misconfigured

Missing `AUTH_SECRET` / `AUTH_MODE` / roster or OIDC settings → login **503**, OIDC start/callback **503**, portals redirect to login.
