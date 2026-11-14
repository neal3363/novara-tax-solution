# DEVELOPMENT_PROGRESS.md

## Security & isolation cycle (current)

### Implemented
- Per-user auth via `AUTH_USERS_JSON` (no shared password)
- HMAC session cookies v2 + legacy session invalidation
- TOTP MFA gate for privileged portal access (`mfaVerified` only after code check)
- Login rate limiting / lockout
- Server `requirePortalUser` on all portal layouts
- Document matter/org authorization + `/api/documents/[id]` download guard
- Attorney evidence page filtered to authorized matters only
- OIDC start route + MFA claim helper; callback intentionally closed (501) until IdP wired
- Separation evidence doc for shared GitHub repository risk

### Documented / blocked
- Creating dedicated GitHub repo `novara-asset-intelligence` (agent cannot create repositories)
- Full OIDC token exchange / JWKS validation against a chosen IdP
- Publishing corrected deployment (prepared for review; not published in this cycle)

### Preserved
- Design system, portals, synthetic labeled data, business model rules
- No Tax OS branch merges or renames
- No live connectors / paid licenses / DNS / irreversible migrations
