# Authentication configuration — NOVARA Asset Intelligence

## Implemented now

| Capability | Status |
|------------|--------|
| Per-user password verification (`AUTH_USERS_JSON`) | Implemented |
| HMAC-signed session cookies v2 | Implemented |
| TOTP MFA challenge before portal access | Implemented |
| Login rate limiting / lockout | Implemented |
| Legacy shared-password sessions invalidated | Implemented (cookie renamed + versioned) |
| Server-side portal layout auth checks | Implemented |
| Document/matter authorization + download API | Implemented |
| OIDC start route + MFA claim helper | Scaffolded (callback returns 501 until IdP wired) |

## Closed when misconfigured

If `AUTH_SECRET` / `AUTH_MODE` / user or OIDC config is missing, login returns **503** and portals redirect to login.

## Required secrets (never paste values in chat)

### Password mode (preview / staging)

- `AUTH_SECRET`
- `AUTH_MODE=password`
- `AUTH_SESSION_VERSION`
- `AUTH_USERS_JSON`

### Production OIDC mode

- `AUTH_SECRET`
- `AUTH_MODE=oidc` (or `both`)
- `AUTH_OIDC_ISSUER`
- `AUTH_OIDC_CLIENT_ID`
- `AUTH_OIDC_CLIENT_SECRET`
- `AUTH_OIDC_REDIRECT_URI`
- `AUTH_OIDC_SCOPES` (optional)

Privileged access requires IdP MFA assertions (`amr`/`acr`) once the OIDC callback is fully wired.

## Secure setup steps

1. Create secrets in Cursor app Secrets / your host secret store (not in git).
2. Generate unique passwords and TOTP secrets per user; store only scrypt hashes + TOTP secrets in `AUTH_USERS_JSON`.
3. Set `AUTH_SESSION_VERSION` to a new value whenever rotating credentials.
4. For production, set OIDC variables for your IdP and complete callback token/JWKS validation.
5. Confirm portals stay unavailable until secrets are present.
