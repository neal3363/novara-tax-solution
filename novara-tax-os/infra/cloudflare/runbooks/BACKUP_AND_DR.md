# Backup and disaster recovery (Cloudflare production)

**Status:** Procedure template — execute only after production infra is live and owner-authorized.

## Backups

1. **D1:** Enable continuous / scheduled backups per Cloudflare D1 guidance; export critical tables weekly to R2.
2. **R2:** Versioning ON for vault buckets; lifecycle retain ≥ 7 years for tax documents where legally required.
3. **Secrets:** Dual-custody export of key material to owner-controlled offline store (not git).
4. **Code:** Git tags for every production deploy; retain prior Worker versions for rollback.

## Restore drill (required evidence before go-live)

1. Create isolated restore environment (separate D1 / R2 prefix).
2. Restore latest D1 snapshot; verify row counts and tenant isolation sample.
3. Restore sample R2 objects; verify decryption with restore keys.
4. Run smoke: `/health`, auth, read-only submission lookup.
5. Record RTO/RPO measured times in `EXTERNAL_APPROVAL_TRACKER` EXT-DR evidence.

## Disaster declaration

Owner (or on-call with owner escalation) declares DR. Prefer rollback to last known-good Worker version before full region restore.
