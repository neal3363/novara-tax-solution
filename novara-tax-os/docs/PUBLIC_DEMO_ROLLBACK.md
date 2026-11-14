# Rollback Instructions

## Git

```bash
git fetch --tags
git checkout rollback/pre-public-demo-deploy-4bf9
```

Also available: `checkpoint/pre-public-demo-deploy-4bf9`

## Hosting

1. Redeploy the previous known-good build artifact / revision.
2. If DNS was changed (only after owner approval), revert DNS to prior target.
3. Confirm homepage loads and live locks remain OFF via `/api/demo-safety` or status docs.

## Do not

- Flip live payment/IRS flags during rollback.
- Process real taxpayer data while recovering.
