# PRODUCTION_READINESS.md

**Status:** Not production-ready. Local preview / development only.

## Explicit non-claims

- No live official-source connectors are active
- No guaranteed recoveries
- No production MFA/IdP
- No public deployment
- No paid integrations purchased
- Synthetic data must not be presented as live inventory

## Go-live checklist (from blueprint)

- [ ] Entity, licensing, insurance evidence
- [ ] Jurisdiction × asset × workflow legal memoranda approved
- [ ] Data Rights Records for every connector
- [ ] Security threat model + encryption/KMS
- [ ] Immutable audit + retention/legal hold
- [ ] Partner contracts + anti-circumvention controls
- [ ] Attorney network coverage + conflict protocol
- [ ] Segregated financial ledgers
- [ ] Guardian SLOs and incident runbooks
- [ ] Acceptance tests for latency, dedupe, rights, isolation
- [ ] Product + compliance/legal sign-off

## Safe development rules (active)

- Do not modify NOVARA Tax OS
- Do not overwrite Blueprint v1.3 PDF
- Do not activate unapproved integrations
- Do not deploy publicly or change DNS without approval
