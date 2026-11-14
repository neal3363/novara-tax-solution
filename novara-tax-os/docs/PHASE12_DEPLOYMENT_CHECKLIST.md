# Phase 12 — Deployment & Release Checklist

**Status:** Staging preparation only  
**Accept real taxpayers:** **NO**  
**Public demo (synthetic data):** Conditionally allowed

## Staging

- [x] Application builds (`npm run build`)
- [x] Phase 12 staging E2E harness (`npm run test:launch-phase12`)
- [x] Prior phase suites green (pricing, Maximizer, security, MeF mock, payments sandbox, state/business)
- [x] Live locks remain OFF (IRS filing, payments, banking, cutover, enforcement)

## Production configuration (not activated)

- [ ] Production environment variables / secrets manager
- [ ] Domain + HTTPS termination verified
- [ ] Cloud KMS production keys + vault encryption verified
- [ ] Monitoring / error reporting operational
- [ ] Database migration + rollback plan executed on staging clone
- [ ] Backup restore drill evidenced
- [ ] Incident response runbooks staffed
- [ ] Human launch approval recorded

## Separations

| Capability | Staging | Production |
|------------|---------|------------|
| Synthetic demo | Allowed | N/A |
| Real taxpayer data | Forbidden | Requires GO |
| Live MeF | OFF | Requires IRS auth + official ATS |
| Live payments | OFF | Requires processor + PCI |
| Live banking | OFF | Requires partner agreement |

**STOP:** Do not accept real taxpayer information until the launch gate is GO with human approval.
