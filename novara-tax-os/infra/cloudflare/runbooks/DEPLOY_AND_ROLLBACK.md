# Deploy and rollback procedures

**Do not run against production without written owner authorization.**

## Pre-deploy checklist

- [ ] All production locks still false in Workers vars unless this deploy is the authorized go-live
- [ ] Secrets present in Cloudflare (no secrets in git)
- [ ] CI green on release commit
- [ ] Staging smoke passed
- [ ] Rollback Worker version ID noted

## Deploy (example)

```bash
# After copying wrangler.example.toml → wrangler.toml and owner approval:
# npx wrangler deploy --env production
```

## Post-deploy smoke

1. `GET /health` → live flags as expected  
2. `POST /mef/transmit` → `403 production_locked` unless intentionally unlocked  
3. Auth + tenant isolation sample  

## Rollback

1. Promote previous Worker version in Cloudflare dashboard **or** `wrangler rollback`  
2. Verify `/health` and lock flags  
3. Notify owner; open incident note  

## Monitoring

Wire error reporting (e.g. Sentry) and uptime checks before public traffic. Alert on 5xx spike and MeF transmit attempts while locked.
