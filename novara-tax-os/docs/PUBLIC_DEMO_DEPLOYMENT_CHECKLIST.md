# Public Demo Deployment Checklist

**Mode:** Synthetic public demonstration only  
**Checkpoint:** `checkpoint/pre-public-demo-deploy-4bf9`  
**Rollback tag:** `rollback/pre-public-demo-deploy-4bf9`  
**Live DNS / public hostname:** **NOT authorized until owner explicit approval**

## Pre-flight (code)

- [x] PRs #51, #52, #53 merged into base
- [x] Production `npm run build` succeeds
- [x] `npm run test:public-demo-deploy` (safety + pricing)
- [x] Pricing TC $300 / $399 unchanged
- [x] Public demo banner + simulated-result labels
- [x] Server-side `/api/demo-safety` rejects SSN/PAN/payment/IRS transmit

## Hosting (owner / infra)

- [ ] Choose hosting provider (static SPA: Vite `dist/`)
- [ ] Configure HTTPS certificate
- [ ] Set `VITE_NOVARA_PUBLIC_DEMO=true` at build time
- [ ] Secrets manager for any future credentials (none required for static synthetic demo)
- [ ] Monitoring / error logging endpoints
- [ ] Backup policy for any durable store (SPA localStorage is device-local)
- [ ] DNS cutover — **requires explicit owner approval**

## Demo safety (must remain true)

- [x] Live IRS filing OFF
- [x] Production tax engine cutover OFF
- [x] Real taxpayer processing OFF
- [x] Live payments OFF
- [x] Live banking / refund advances OFF
- [x] Nationwide state filing OFF
- [x] Business e-file OFF

## Authorization

| Action | Status |
|--------|--------|
| Isolated staging / Cursor preview | Allowed |
| Public DNS publish | **Awaiting owner approval** |
| Live payments / IRS / banking | Forbidden |

## Rollback

```bash
git checkout rollback/pre-public-demo-deploy-4bf9
# Redeploy previous build artifact / hosting revision
```
