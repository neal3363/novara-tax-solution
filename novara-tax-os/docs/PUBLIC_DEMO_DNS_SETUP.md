# DNS / Domain Setup Instructions

**STOP:** Do not purchase domains or change live DNS until the owner explicitly approves.

## When authorized

1. Point the approved hostname (A/AAAA or CNAME) to the hosting provider’s target.
2. Enable HTTPS (managed certificate) and redirect HTTP → HTTPS.
3. Confirm HSTS only after TLS is stable.
4. Do **not** attach live payment/IRS webhook endpoints to the demo hostname.
5. Verify `/` loads homepage + cinematic video over HTTPS.
6. Verify `/api/demo-safety` (if API routes are hosted) returns `acceptRealTaxpayers: false`.

## Rollback

Revert DNS to the previous target or remove the record; redeploy `rollback/pre-public-demo-deploy-4bf9` artifact if needed.
